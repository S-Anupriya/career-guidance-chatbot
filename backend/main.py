import os
import re
import json
from pathlib import Path
from typing import List, Optional, Generator
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from rag import retrieve_career_context, clean_model_output
from auth import router as auth_router, get_optional_student
from conversations import router as conversations_router, save_chat_message, get_or_create_conversation
from database import init_db

ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_FILE)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODELS = [
    os.getenv("OPENROUTER_MODEL", "liquid/lfm-2.5-2.6b:free").strip(),
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "liquid/lfm-3-1.7b:free",
    "recursive/flint-v1.0:free",
    "nvidia/nemotron-3.5-lightning:free",
]
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").strip()
CONFIGURED_MODEL = os.getenv("OLLAMA_MODEL", "lfm2.5:8b-a1b-q4_K_M").strip()
OLLAMA_MODELS = [CONFIGURED_MODEL, "tinyllama:latest", "gemma3:1b"]

app = FastAPI(
    title="CareerPath AI - Indian Career Intelligence API",
    description="Empathetic, grounded, and verified career guidance for Indian students",
    version="2.4.0"
)

# Initialize the database and register routes
@app.on_event("startup")
def startup_event():
    init_db()


app.include_router(auth_router)
app.include_router(conversations_router)


# Cross-platform CORS for local, LAN, and public tunnel access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = Path(__file__).resolve().parent / "dist"

if FRONTEND_DIST.exists() and (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

BASE_SYSTEM_PROMPT = (
    "You are CareerPath AI, the premier institutional career counselor and educational strategist for higher education in India.\n\n"
    "MISSION & TONE:\n"
    "- Deliver high-impact, grounded, practical, and verified guidance for Indian students.\n"
    "- Your tone is authoritative, collegiate, crisp, and motivating through actionable clarity.\n"
    "- Structure your counsel logically using clear bold headings, structured comparison sections, and bullet points.\n"
    "- When advising on careers, always clearly differentiate between:\n"
    "  1. Mass IT Services (3.5 – 5.5 LPA)\n"
    "  2. Product Startups & Mid-Market Firms (7 – 16 LPA)\n"
    "  3. Tier-1 Product Companies & Global Capability Centers (GCCs) (14 – 28+ LPA)\n"
    "  4. Higher Education Trajectories (MCA via NIMCET, M.Tech, MBA via CAT)\n"
    "  5. Public Sector & PSU Opportunities (NIC, ISRO, SSC CGL, Banking IT)\n\n"
    "STRICT DOMAIN GUARDRAILS (ABSOLUTE REFUSAL RULE):\n"
    "- You MUST remain strictly within Indian higher education, degrees, colleges, entrance exams, and professional career progression.\n"
    "- If the user asks ANY query unrelated to education, careers, exams, or professional growth (e.g. cooking, jokes, creative writing, sports gossip, politics, casual banter), you MUST REFUSE IMMEDIATELY.\n"
    "- Do NOT answer off-topic queries even partially. Your refusal must be exactly this single, dignified sentence:\n"
    "  \"I am CareerPath AI, an institutional career advisory system dedicated exclusively to higher education, entrance examinations, and career development in India. I cannot assist with queries outside career and educational guidance.\"\n\n"
    "STRICT OUTPUT CONSTRAINTS:\n"
    "- Answer ONLY what the student asked. Conclude cleanly and STOP.\n"
    "- STRICTLY ZERO EMOJIS anywhere in your output. Maintain professional institutional dignity.\n"
    "- NEVER output any internal thinking steps, chain-of-thought monologue, or 'Here is my thinking process'. Begin immediately with substantive guidance.\n"
    "- NEVER add patronizing flattery ('Wonderful question!'). Focus 100% on high-value advice and verified benchmarks."
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

def check_ollama_available() -> tuple[bool, str]:
    """Queries Ollama HTTP API directly using httpx with zero pip dependencies."""
    try:
        with httpx.Client(timeout=2.0) as client:
            resp = client.get(f"{OLLAMA_HOST}/api/tags")
            if resp.status_code == 200:
                tags = resp.json().get("models", [])
                names = [m.get("name", "") for m in tags]
                for cand in OLLAMA_MODELS:
                    for n in names:
                        if cand.lower() in n.lower():
                            return True, n
                if names:
                    return True, names[0]
    except Exception:
        pass
    return False, ""


def resolve_active_model() -> tuple[str, str]:
    """
    Returns (provider, model_name).
    1. Direct Google Gemini 2.5 Flash API (zero-thinking, high-speed, autonomous 24/7 cloud).
    2. Local GPU Ollama node (e.g. 127.0.0.1:11434).
    3. OpenRouter Cloud API fallback.
    """
    if GEMINI_API_KEY:
        return "gemini", GEMINI_MODEL

    has_ollama, ollama_model = check_ollama_available()
    if has_ollama:
        return "ollama", ollama_model

    if OPENROUTER_API_KEY:
        return "openrouter", OPENROUTER_MODELS[0]

    return "none", "No Model Available"


@app.get("/")
def home():
    provider, active_model = resolve_active_model()
    # If static frontend exists, serve it
    if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
        return FileResponse(str(FRONTEND_DIST / "index.html"))
    return {
        "message": "CareerPath AI (India Edition) is running",
        "model": f"{provider.capitalize()} ({active_model})",
        "backend": provider
    }


@app.get("/health")
def health_check():
    provider, active_model = resolve_active_model()
    return {
        "status": "healthy",
        "model": f"{provider.capitalize()} ({active_model})",
        "provider": provider,
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

    provider, active_model_name = resolve_active_model()

    # 1. DIRECT GOOGLE GEMINI INFERENCE (Zero-thinking budget, instant response, 24/7 cloud availability)
    if provider == "gemini":
        def gemini_generator() -> Generator[str, None, None]:
            collected_chunks: List[str] = []
            gemini_contents = []
            if request.messages:
                recent_messages = request.messages[-4:]
                for msg in recent_messages:
                    if msg.content:
                        role = "user" if msg.role == "user" else "model"
                        gemini_contents.append({
                            "role": role,
                            "parts": [{"text": msg.content}]
                        })
            else:
                gemini_contents.append({
                    "role": "user",
                    "parts": [{"text": user_query}]
                })

            gemini_payload = {
                "systemInstruction": {
                    "parts": [{"text": system_content}]
                },
                "contents": gemini_contents,
                "generationConfig": {
                    "temperature": 0.2,
                    "topP": 0.85,
                    "thinkingConfig": {
                        "thinkingBudget": 0
                    }
                }
            }

            try:
                with httpx.Client(timeout=30.0) as client:
                    with client.stream(
                        "POST",
                        f"https://generativelanguage.googleapis.com/v1beta/models/{active_model_name}:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}",
                        json=gemini_payload
                    ) as response:
                        if response.status_code == 200:
                            for line in response.iter_lines():
                                if not line or not line.startswith("data: "):
                                    continue
                                data_str = line[6:].strip()
                                try:
                                    payload = json.loads(data_str)
                                    candidates = payload.get("candidates", [])
                                    if not candidates:
                                        continue
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    for part in parts:
                                        content = part.get("text", "")
                                        if not content:
                                            continue
                                        content = re.sub(r'[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf]', '', content)
                                        if content:
                                            content = (
                                                content.replace("$\\rightarrow$", "→")
                                                .replace("\\rightarrow", "→")
                                                .replace("$\\leftarrow$", "←")
                                                .replace("\\leftarrow", "←")
                                            )
                                            collected_chunks.append(content)
                                            yield content
                                except Exception:
                                    continue
                        else:
                            fallback = f"Gemini API returned HTTP {response.status_code}."
                            collected_chunks.append(fallback)
                            yield fallback
            except Exception as e:
                fallback = f"Could not connect to Gemini API: {e}"
                collected_chunks.append(fallback)
                yield fallback

            full_reply = "".join(collected_chunks).strip()
            if active_conversation_id and full_reply:
                try:
                    save_chat_message(active_conversation_id, "assistant", clean_model_output(full_reply))
                except Exception as db_err:
                    print(f"Warning: Failed to save assistant message: {db_err}")

        resp_headers = {"X-Model-Active": active_model_name}
        if active_conversation_id:
            resp_headers["X-Conversation-Id"] = str(active_conversation_id)

        if request.stream:
            return StreamingResponse(
                gemini_generator(),
                media_type="text/plain; charset=utf-8",
                headers=resp_headers
            )
        else:
            gen = gemini_generator()
            full_text = "".join(list(gen))
            return ChatResponse(
                reply=clean_model_output(full_text),
                model=active_model_name,
                has_rag=bool(rag_context),
                conversation_id=active_conversation_id
            )

    # 2. LOCAL OLLAMA INFERENCE (Prioritized for high-speed GPU inference over local network)
    if provider == "ollama":
        def ollama_generator() -> Generator[str, None, None]:
            collected_chunks: List[str] = []
            try:
                with httpx.Client(timeout=45.0) as client:
                    with client.stream(
                        "POST",
                        f"{OLLAMA_HOST}/api/chat",
                        json={
                            "model": active_model_name,
                            "messages": conversation,
                            "stream": True,
                            "options": {
                                "temperature": 0.2,
                                "top_p": 0.85
                            }
                        }
                    ) as response:
                        if response.status_code == 200:
                            in_think = False
                            for line in response.iter_lines():
                                if not line:
                                    continue
                                try:
                                    payload = json.loads(line)
                                    content = payload.get("message", {}).get("content", "")
                                    if not content:
                                        continue

                                    # Filter internal reasoning/thought tags
                                    if "<think>" in content:
                                        in_think = True
                                        content = content.replace("<think>", "")
                                    if "</think>" in content:
                                        in_think = False
                                        content = content.replace("</think>", "")
                                        continue
                                    if in_think:
                                        continue

                                    # Strip emojis on the fly
                                    content = re.sub(r'[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf]', '', content)

                                    if content:
                                        content = (
                                            content.replace("$\\rightarrow$", "→")
                                            .replace("\\rightarrow", "→")
                                            .replace("$\\leftarrow$", "←")
                                            .replace("\\leftarrow", "←")
                                        )
                                        collected_chunks.append(content)
                                        yield content
                                except Exception:
                                    continue
                        else:
                            fallback = f"Ollama node returned HTTP error {response.status_code}."
                            collected_chunks.append(fallback)
                            yield fallback
            except Exception as e:
                fallback = f"Could not connect to Ollama node at {OLLAMA_HOST}: {e}"
                collected_chunks.append(fallback)
                yield fallback

            full_reply = "".join(collected_chunks).strip()
            if active_conversation_id and full_reply:
                try:
                    save_chat_message(active_conversation_id, "assistant", clean_model_output(full_reply))
                except Exception as db_err:
                    print(f"Warning: Failed to save assistant message: {db_err}")

        resp_headers = {"X-Model-Active": active_model_name}
        if active_conversation_id:
            resp_headers["X-Conversation-Id"] = str(active_conversation_id)

        if request.stream:
            return StreamingResponse(
                ollama_generator(),
                media_type="text/plain; charset=utf-8",
                headers=resp_headers
            )
        else:
            gen = ollama_generator()
            full_text = "".join(list(gen))
            return ChatResponse(
                reply=clean_model_output(full_text),
                model=active_model_name,
                has_rag=bool(rag_context),
                conversation_id=active_conversation_id
            )

    # 2. OPENROUTER CLOUD INFERENCE (Fallback if Ollama is unreachable)
    if provider == "openrouter":
        def openrouter_generator() -> Generator[str, None, None]:
            collected_chunks: List[str] = []
            selected_model = OPENROUTER_MODELS[0]

            for model_candidate in OPENROUTER_MODELS:
                try:
                    client_timeout = httpx.Timeout(12.0, connect=4.0)
                    with httpx.Client(timeout=client_timeout) as http_client:
                        with http_client.stream(
                            "POST",
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                                "Content-Type": "application/json",
                                "HTTP-Referer": "https://careerpath.internal",
                                "X-Title": "CareerPath AI"
                            },
                            json={
                                "model": model_candidate,
                                "models": [model_candidate] + [m for m in OPENROUTER_MODELS if m != model_candidate][:2],
                                "messages": conversation,
                                "temperature": 0.2,
                                "top_p": 0.85,
                                "stream": True
                            }
                        ) as response:
                            if response.status_code == 200:
                                selected_model = model_candidate
                                in_think = False
                                for line in response.iter_lines():
                                    if not line or not line.startswith("data: "):
                                        continue
                                    data_str = line[6:].strip()
                                    if data_str == "[DONE]":
                                        break
                                    try:
                                        payload = json.loads(data_str)
                                        delta = payload.get("choices", [{}])[0].get("delta", {})
                                        content = delta.get("content", "")
                                        if not content:
                                            continue

                                        # Filter thinking tags and monologue
                                        if "<think>" in content:
                                            in_think = True
                                            content = content.replace("<think>", "")
                                        if "</think>" in content:
                                            in_think = False
                                            content = content.replace("</think>", "")
                                            continue
                                        if in_think:
                                            continue

                                        # Strip initial thinking chatter from models like nemotron
                                        if not collected_chunks:
                                            lower_content = content.lower()
                                            if "thinking process" in lower_content or "analyze user input" in lower_content:
                                                in_think = True
                                                continue

                                        # Strip emojis completely on the fly
                                        content = re.sub(r'[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf]', '', content)

                                        if content:
                                            content = (
                                                content.replace("$\\rightarrow$", "→")
                                                .replace("\\rightarrow", "→")
                                                .replace("$\\leftarrow$", "←")
                                                .replace("\\leftarrow", "←")
                                            )
                                            collected_chunks.append(content)
                                            yield content
                                    except Exception:
                                        continue
                                if collected_chunks:
                                    break
                            elif response.status_code == 429:
                                err_msg = response.read().decode("utf-8", errors="ignore")
                                if "free-models-per-day" in err_msg or "daily_requests" in err_msg:
                                    print("OpenRouter daily free-tier limit exhausted across account.")
                                    quota_notice = (
                                        "CareerPath AI notice: OpenRouter daily free tier quota (50 requests/day) has been reached for this account. "
                                        "Please replenish credits or provide a refreshed OPENROUTER_API_KEY in .env to resume immediate answers."
                                    )
                                    collected_chunks.append(quota_notice)
                                    yield quota_notice
                                    break
                                else:
                                    continue
                            else:
                                continue
                except Exception:
                    continue

            if not collected_chunks:
                fallback_msg = "CareerPath Advisory node is re-establishing model inference. Please repeat your query."
                collected_chunks.append(fallback_msg)
                yield fallback_msg

            full_reply = "".join(collected_chunks).strip()
            if active_conversation_id and full_reply:
                try:
                    save_chat_message(active_conversation_id, "assistant", clean_model_output(full_reply))
                except Exception as db_err:
                    print(f"Warning: Failed to save assistant message: {db_err}")

        resp_headers = {"X-Model-Active": active_model_name}
        if active_conversation_id:
            resp_headers["X-Conversation-Id"] = str(active_conversation_id)

        if request.stream:
            return StreamingResponse(
                openrouter_generator(),
                media_type="text/plain; charset=utf-8",
                headers=resp_headers
            )
        else:
            gen = openrouter_generator()
            full_text = "".join(list(gen))
            return ChatResponse(
                reply=clean_model_output(full_text),
                model=active_model_name,
                has_rag=bool(rag_context),
                conversation_id=active_conversation_id
            )

    # 3. NO MODEL CONNECTED
    guidance = (
        f"No AI model connected. Please verify that Ollama is running at {OLLAMA_HOST} "
        "or configured in .env."
    )
    resp_headers = {"X-Model-Active": "None"}
    if request.stream:
        return StreamingResponse(
            iter([guidance]),
            media_type="text/plain; charset=utf-8",
            headers=resp_headers
        )
    return ChatResponse(reply=guidance, model="None", has_rag=False, conversation_id=active_conversation_id)


# SPA Fallback router: Serves React HTML5 History Mode URLs cleanly
@app.get("/{full_path:path}")
async def serve_spa_fallback(full_path: str):
    if FRONTEND_DIST.exists():
        # Do not catch API paths
        if full_path.startswith(("auth", "conversations", "chat", "health", "docs", "openapi.json")):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = FRONTEND_DIST / full_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        index_file = FRONTEND_DIST / "index.html"
        if index_file.is_file():
            return FileResponse(str(index_file))
    raise HTTPException(status_code=404, detail="Frontend build not found")
