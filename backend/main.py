import os
from typing import List, Optional, Generator
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ollama

from rag import retrieve_career_context, clean_model_output
from auth import router as auth_router, get_optional_student
from conversations import router as conversations_router, save_chat_message, get_or_create_conversation
from database import init_db

load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
CONFIGURED_MODEL = os.getenv("OLLAMA_MODEL", "jikepjikep_16HEX/gemma-4-e4b-nightshift-heretic-uncensored-q4:latest")

app = FastAPI(
    title="CareerPath AI - Indian Career Intelligence API",
    description="Empathetic, grounded, and verified career guidance for Indian students",
    version="2.3.0"
)

# Initialize the database and register routes
@app.on_event("startup")
def startup_event():
    init_db()


app.include_router(auth_router)
app.include_router(conversations_router)


# Cross-platform CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173"
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_SYSTEM_PROMPT = (
    "You are CareerPath AI, an expert, objective, and dedicated career guidance counselor for students in India.\n\n"
    "MISSION & TONE:\n"
    "- Your sole purpose is to mentor students on Indian higher education, career options, realistic salaries, entrance exams, and professional roadmaps.\n"
    "- Deliver practical, realistic, grounded, and clear guidance.\n"
    "- Always quote compensation in Indian Rupees (INR) using realistic figures (LPA or in-hand/month). Differentiate clearly between mass service firms, product startups, GCCs, and government pay scales.\n\n"
    "STRICT OUTPUT CONSTRAINTS (MANDATORY):\n"
    "- Answer ONLY what the user asked. Conclude cleanly and STOP.\n"
    "- NEVER add cheerleading, praise, flattery, or motivational commentary (DO NOT say 'You have a wonderful foundation', 'Keep asking these insightful questions', 'That shows true dedication', etc.).\n"
    "- NEVER append unsolicited 'Immediate Next Step' or 'Next Steps' sections unless the user explicitly requested next steps or an action plan.\n"
    "- NEVER add conversational closing pleasantries, prompts, or follow-up questions (DO NOT say 'What would you like to explore next?', 'Feel free to ask more', 'How can I help you next?', etc.). End immediately after the answer.\n"
    "- NEVER use LaTeX arrow notation such as $\\rightarrow$ or \\rightarrow. Always write the standard arrow character '→' directly.\n\n"
    "STRICT DOMAIN GUARDRAILS:\n"
    "- You MUST remain strictly within the career guidance, education, degree, exam, and career progression narrative.\n"
    "- If the user asks about anything unrelated to education, college, careers, exams, or professional growth (for example: cooking recipes, creative writing, sports gossip, general coding puzzles without career context, political commentary, or casual off-topic banter), politely refuse in one short sentence:\n"
    "  \"I am CareerPath AI, dedicated specifically to helping students navigate careers, degrees, entrance exams, and professional pathways in India. I cannot assist with topics outside education and career guidance, but I am ready to help you explore your studies or career goals.\"\n\n"
    "NO THINKING TAGS & CONCISE STRUCTURE:\n"
    "- Deliver your answer directly. Do NOT output any internal <think>...</think> tags, chain-of-thought monologue, or reasoning steps. Start immediately with your response.\n"
    "- When presenting comparisons or benchmarks, use clean markdown tables and bullet points. Ensure every section and table is completed fully."
)

class MessageItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: Optional[str] = None
    messages: Optional[List[MessageItem]] = None
    conversation_id: Optional[int] = None
    stream: Optional[bool] = True

class ChatResponse(BaseModel):
    reply: str
    model: str
    has_rag: bool = False
    conversation_id: Optional[int] = None

def build_student_profile_prompt(student: dict) -> str:
    """Format the student profile into an empathetic, grounded personalization context."""
    name = student.get("name") or "Student"
    course = student.get("course") or "Higher Education"
    institution = student.get("institution") or "Indian College/University"
    grad_year = student.get("graduation_year") or "Upcoming"
    interests = student.get("interests") or []
    skills = student.get("skills") or []
    domains = student.get("preferred_domains") or []

    interests_str = ", ".join(interests) if isinstance(interests, list) and interests else (str(interests) if interests else "None specified")
    skills_str = ", ".join(skills) if isinstance(skills, list) and skills else (str(skills) if skills else "None specified")
    domains_str = ", ".join(domains) if isinstance(domains, list) and domains else (str(domains) if domains else "None specified")

    return (
        "\n\n--- AUTHENTICATED STUDENT PROFILE ---\n"
        f"• Student Name: {name}\n"
        f"• Current Degree / Course: {course}\n"
        f"• College / Institution: {institution}\n"
        f"• Target Graduation Year: {grad_year}\n"
        f"• Student Interests: {interests_str}\n"
        f"• Acquired Skills: {skills_str}\n"
        f"• Target Career Domains: {domains_str}\n\n"
        "PERSONALIZATION INSTRUCTIONS:\n"
        f"- The student you are mentoring is {name}, pursuing {course} ({institution}), graduating in {grad_year}.\n"
        "- Tailor your advice, entrance exam recommendations, skill gap analysis, and salary benchmarks directly to their current degree, stage, and aspirations.\n"
        "- Take into account their acquired skills and recommend actionable bridges to their target domains.\n"
        "- Do not recite this profile back verbatim; weave this context naturally and authoritatively into your response."
    )

def get_installed_models(client: ollama.Client) -> List[str]:
    try:
        available = client.list()
        return [m.model for m in available.models if m.model]
    except Exception:
        return []

def resolve_active_model(client: ollama.Client) -> str:
    """
    Auto-detects the best available model on the host machine.
    Prefers Gemma, then Qwen, then Llama, then first installed.
    If no models are installed in Ollama, returns empty string.
    """
    installed = get_installed_models(client)
    if not installed:
        return ""

    # 1. Exact match with configured model
    if CONFIGURED_MODEL in installed:
        return CONFIGURED_MODEL

    # 2. Case-insensitive or partial match
    for n in installed:
        if CONFIGURED_MODEL.lower() in n.lower() or n.lower() in CONFIGURED_MODEL.lower():
            return n

    # 3. Prefer Gemma first, then Qwen, then Llama
    for n in installed:
        if "gemma" in n.lower():
            return n
    for n in installed:
        if "qwen" in n.lower():
            return n
    for n in installed:
        if "llama" in n.lower():
            return n

    return installed[0]

@app.get("/")
def home():
    client = ollama.Client(host=OLLAMA_HOST)
    active_model = resolve_active_model(client)
    return {
        "message": "CareerPath AI (India Edition) is running",
        "model": active_model or "No model found (run: ollama pull gemma:2b)",
        "host": OLLAMA_HOST
    }

@app.get("/health")
def health_check():
    client = ollama.Client(host=OLLAMA_HOST)
    active_model = resolve_active_model(client)
    return {
        "status": "healthy",
        "model": active_model or "No model found",
        "host": OLLAMA_HOST,
        "edition": "India 2025-2026"
    }

@app.post("/chat")
def chat_endpoint(
    request: ChatRequest,
    current_student: Optional[dict] = Depends(get_optional_student)
):
    # Extract latest user message for RAG retrieval
    user_query = ""
    if request.messages and len(request.messages) > 0:
        for m in reversed(request.messages):
            if m.role == "user" and m.content:
                user_query = m.content
                break
    elif request.message:
        user_query = request.message

    if not user_query:
        raise HTTPException(status_code=400, detail="Either 'message' or 'messages' must be provided.")

    # Retrieve verified Indian career intelligence
    rag_context = retrieve_career_context(user_query)

    system_content = BASE_SYSTEM_PROMPT

    # Task 9: Connect student profile to AI
    if current_student:
        system_content += build_student_profile_prompt(current_student)

    if rag_context:
        system_content += (
            f"\n\n{rag_context}\n"
            "MANDATORY KNOWLEDGE INTEGRATION:\n"
            "- You MUST actively incorporate and cite the verified figures, exam names (e.g. NIMCET, CDAC, CAT, SSC CGL), and CTC benchmarks from the verified data above into your advice."
        )

    conversation = [{"role": "system", "content": system_content}]

    # Sliding context window: Only the last 4 turns (2 user + 2 assistant messages)
    if request.messages:
        recent_messages = request.messages[-4:]
        for msg in recent_messages:
            if msg.role in ("user", "assistant") and msg.content:
                conversation.append({"role": msg.role, "content": msg.content})
    else:
        conversation.append({"role": "user", "content": user_query})

    # Task 7 & 8: Save user message in conversation if authenticated
    active_conversation_id: Optional[int] = None
    if current_student:
        try:
            active_conversation_id = get_or_create_conversation(
                student_id=current_student["id"],
                conversation_id=request.conversation_id,
                first_query=user_query
            )
            save_chat_message(active_conversation_id, "user", user_query)
        except Exception as e:
            # Database log should not fail chat generation
            print(f"Warning: Failed to save user chat message: {e}")

    client = ollama.Client(host=OLLAMA_HOST)
    active_model = resolve_active_model(client)

    # If no model is installed in Ollama, guide the user directly
    if not active_model:
        guidance = (
            "⚠️ **No AI Model Detected in Ollama**\n\n"
            "Ollama is running, but no models are downloaded on this computer yet.\n\n"
            "To activate CareerPath AI, open Terminal (macOS/Linux) or Command Prompt (Windows) and run:\n\n"
            "```bash\n"
            "ollama pull gemma:2b\n"
            "```\n\n"
            "*(or `ollama pull qwen2.5:3b`)*. Once downloaded, refresh this page and your assistant will respond instantly!"
        )
        resp_headers = {"X-Model-Active": "No Model Found"}
        if active_conversation_id:
            resp_headers["X-Conversation-Id"] = str(active_conversation_id)
            try:
                save_chat_message(active_conversation_id, "assistant", guidance)
            except Exception as db_err:
                print(f"Warning: Failed to save assistant guidance: {db_err}")
        if request.stream:
            return StreamingResponse(
                iter([guidance]),
                media_type="text/plain; charset=utf-8",
                headers=resp_headers
            )
        return ChatResponse(reply=guidance, model="None", has_rag=False, conversation_id=active_conversation_id)

    # 1. STREAMING MODE (Default for fluid ChatGPT/Claude UI gliding effect)
    if request.stream:
        def token_generator() -> Generator[str, None, None]:
            collected_chunks: List[str] = []
            try:
                stream = client.chat(
                    model=active_model,
                    messages=conversation,
                    stream=True,
                    options={
                        "temperature": 0.2,
                        "top_p": 0.85,
                        "num_predict": 3500
                    }
                )

                in_think = False
                for chunk in stream:
                    content = chunk.message.content
                    if not content:
                        continue
                    if "<think>" in content:
                        in_think = True
                        content = content.replace("<think>", "")
                    if "</think>" in content:
                        in_think = False
                        content = content.replace("</think>", "")
                        continue
                    if in_think:
                        continue
                    if content:
                        # Clean LaTeX arrow artifacts if emitted by the LLM
                        content = (
                            content.replace("$\\rightarrow$", "→")
                            .replace("\\rightarrow", "→")
                            .replace("$\\leftarrow$", "←")
                            .replace("\\leftarrow", "←")
                        )
                        collected_chunks.append(content)
                        yield content

                # Task 7: Persist full AI response when streaming completes
                full_reply = "".join(collected_chunks).strip()
                if active_conversation_id and full_reply:
                    try:
                        save_chat_message(active_conversation_id, "assistant", clean_model_output(full_reply))
                    except Exception as db_err:
                        print(f"Warning: Failed to save assistant message: {db_err}")

            except Exception as e:
                err_str = str(e)
                if "Failed to connect" in err_str or "Connection refused" in err_str:
                    yield (
                        "\n\n⚠️ **Ollama Connection Failed**\n\n"
                        "Could not connect to Ollama at `http://127.0.0.1:11434`.\n\n"
                        "Please make sure Ollama is running. Open the Ollama app or run `ollama serve` in your terminal."
                    )
                elif "not found" in err_str:
                    yield (
                        f"\n\n⚠️ **Model Not Found in Ollama**\n\n"
                        f"Ollama could not find the active model (`{active_model}`).\n\n"
                        f"Run `ollama pull {active_model}` or `ollama pull gemma:2b` in terminal, then try again."
                    )
                else:
                    yield f"\n[AI Connection Error: {err_str}]"

        resp_headers = {"X-Model-Active": active_model}
        if active_conversation_id:
            resp_headers["X-Conversation-Id"] = str(active_conversation_id)

        return StreamingResponse(
            token_generator(),
            media_type="text/plain; charset=utf-8",
            headers=resp_headers
        )

    # 2. NON-STREAMING MODE (Direct JSON response)
    try:
        response = client.chat(
            model=active_model,
            messages=conversation,
            stream=False,
            options={
                "temperature": 0.2,
                "top_p": 0.85,
                "num_predict": 3500
            }
        )
        raw_reply = response.message.content
        cleaned_reply = clean_model_output(raw_reply)

        # Task 7: Save AI response
        if active_conversation_id and cleaned_reply:
            try:
                save_chat_message(active_conversation_id, "assistant", cleaned_reply)
            except Exception as db_err:
                print(f"Warning: Failed to save assistant message: {db_err}")

        return ChatResponse(
            reply=cleaned_reply,
            model=active_model,
            has_rag=bool(rag_context),
            conversation_id=active_conversation_id
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI model connection failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI model connection failed: {str(e)}")
