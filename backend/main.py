
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ollama import chat as ollama_chat

app = FastAPI(
    title="Career Guidance Chatbot API",
    description="AI-powered career guidance system",
    version="1.0.0"
)

# Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request structure
class ChatRequest(BaseModel):
    message: str

# Response structure
class ChatResponse(BaseModel):
    reply: str

# Homepage
@app.get("/")
def home():
    return {
        "message": "Career Guidance Chatbot API is running!"
    }

# Health check
@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }

# AI Chat endpoint
@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):

    try:
        response = ollama_chat(
            model="gemma3:1b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional AI career counsellor for Indian students. "

"Your goal is to understand each student's education, "
"interests, skills, strengths and career preferences. "

"Ask one question at a time when you need more information. "
"Do not assume the student's skills, interests or experience. "

"Give personalised career recommendations based on the "
"information the student provides. "

"Focus on career opportunities in India. "
"Always use Indian Rupees (INR) when discussing salaries. "
"Clearly mention that salary figures are approximate and "
"depend on location, skills and experience. "

"Explain the qualifications, skills, job responsibilities "
"and career growth for each recommended career. "

"Consider government and private sector opportunities "
"when relevant to the student's preferences. "

"Use simple, beginner-friendly language. "
"Never guarantee jobs, salaries or selection. "
"Do not invent eligibility requirements or qualifications. "git add .
git commit -m "Complete AI chatbot integration"
git push origin main
                    )
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ]
        )

        return {
            "reply": response.message.content
        }

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"AI model connection failed: {str(e)}"
        )
