import os
import json
import re
import requests
import time
from typing import List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. Environment & Clients
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") 
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")

if not all([SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY, HF_TOKEN]):
    raise RuntimeError("Missing required environment variables in Render/Vercel settings")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

# 2. App Setup
app = FastAPI(title="Meeting Intelligence API")

# Updated CORS for Cloud Deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all Vercel preview & production URLs
    allow_credentials=False, # Required when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Pydantic Models
class UploadResponse(BaseModel):
    success: bool
    transcript_id: int
    message: str

class ChatRequest(BaseModel):
    project_id: int
    question: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]
    intent: str = "rag_search"

# 4. Auth Dependency
def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header provided")
    try:
        token = authorization.split(" ")[1]
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid session")
        return user_response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized access")

# 5. System Prompts
RAG_SYSTEM_PROMPT = """You are Recall, an assistant. Answer using ONLY provided transcript excerpts. 
Cite sources as [Source: snippet]. If not found, say you couldn't find it. Tone: Helpful, direct."""

SUMMARY_SYSTEM_PROMPT = """Summarize transcript excerpts into: Overview, Key Decisions, and Action Items."""

INTENT_CLASSIFIER_PROMPT = """Classify message into exactly one: "greeting", "summary", "action_items", "sentiment", "rag_search". Return ONLY JSON: {{"intent": "..."}}"""

# 6. Core AI Functions (Cloud-Safe API Based)
def generate_embeddings(text_list: List[str]) -> List[List[float]]:
    API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    response = requests.post(API_URL, headers=headers, json={"inputs": text_list})
    
    if response.status_code == 503: # Model loading on HF side
        time.sleep(10)
        response = requests.post(API_URL, headers=headers, json={"inputs": text_list})
    
    return response.json()

def analyze_sentiment_api(text: str):
    # Using a fast, lightweight sentiment model from HF API
    API_URL = "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    # Analyze first 500 chars to avoid payload limits
    response = requests.post(API_URL, headers=headers, json={"inputs": text[:500]})
    
    if response.status_code == 200:
        res = response.json()[0]
        top = max(res, key=lambda x: x['score'])
        sentiment = top['label'].lower()
        return {
            "sentiment": "positive" if "pos" in sentiment else "negative",
            "label": "Positive" if "pos" in sentiment else "Negative",
            "score": top['score'] if "pos" in sentiment else -top['score'],
            "color": "#22c55e" if "pos" in sentiment else "#ef4444"
        }
    return {"sentiment": "neutral", "label": "Neutral", "score": 0, "color": "#94a3b8"}

def classify_intent(message: str) -> str:
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": INTENT_CLASSIFIER_PROMPT.format(message=message)}],
            max_tokens=20,
            temperature=0.0
        )
        data = json.loads(re.sub(r'```json|```', '', response.choices[0].message.content).strip())
        return data.get("intent", "rag_search")
    except Exception:
        return "rag_search"

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 150) -> List[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i: i + chunk_size])
        if chunk: chunks.append(chunk)
    return chunks

# 7. RAG / Search Logic
def hybrid_search(query: str, project_id: int) -> List[dict]:
    try:
        query_vector = generate_embeddings([query])[0]
        result = supabase.rpc("match_transcript_chunks", {
            "query_embedding": query_vector,
            "match_threshold": 0.15,
            "match_count": 8,
            "p_project_id": int(project_id)
        }).execute()
        return result.data or []
    except Exception:
        return []

# 8. Route Handlers
def handle_greeting() -> ChatResponse:
    return ChatResponse(answer="Hey! I'm Recall. How can I help with your meetings?", sources=[], intent="greeting")

def handle_summary(project_id: int) -> ChatResponse:
    rows = supabase.table("transcript_chunks").select("content, transcript_id").eq("project_id", int(project_id)).limit(15).execute()
    if not rows.data: return ChatResponse(answer="No content found.", sources=[], intent="summary")
    context = "\n".join([c["content"] for c in rows.data])
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": SUMMARY_SYSTEM_PROMPT}, {"role": "user", "content": context}],
        temperature=0.2
    )
    return ChatResponse(answer=response.choices[0].message.content, sources=[], intent="summary")

def handle_rag_search(question: str, project_id: int) -> ChatResponse:
    chunks = hybrid_search(question, project_id)
    if not chunks: return ChatResponse(answer="I couldn't find that in the transcripts.", sources=[], intent="rag_search")
    context = "\n\n".join([c['content'] for c in chunks])
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": RAG_SYSTEM_PROMPT}, {"role": "user", "content": f"Context: {context}\nQuestion: {question}"}]
    )
    return ChatResponse(answer=response.choices[0].message.content, sources=[{"transcript_id": c["transcript_id"]} for c in chunks], intent="rag_search")

# 9. Main Routes
@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/upload", response_model=UploadResponse)
async def upload_transcript(file: UploadFile = File(...), project_id: str = Form(default="1"), current_user: dict = Depends(get_current_user)):
    content = (await file.read()).decode("utf-8")
    res = supabase.table("transcripts").insert({"project_id": int(project_id), "filename": file.filename, "content": content, "word_count": len(content.split())}).execute()
    t_id = res.data[0]["id"]
    
    chunks = chunk_text(content)
    embeddings = generate_embeddings(chunks)
    to_insert = [{"transcript_id": t_id, "project_id": int(project_id), "content": c, "embedding": e} for c, e in zip(chunks, embeddings)]
    supabase.table("transcript_chunks").insert(to_insert).execute()
    
    return UploadResponse(success=True, transcript_id=t_id, message="Uploaded successfully.")

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    intent = classify_intent(req.question)
    if intent == "greeting": return handle_greeting()
    if intent == "summary": return handle_summary(req.project_id)
    return handle_rag_search(req.question, req.project_id)

@app.get("/sentiment/{transcript_id}")
async def get_sentiment(transcript_id: int, current_user: dict = Depends(get_current_user)):
    res = supabase.table("transcripts").select("content").eq("id", transcript_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    content = res.data["content"]
    analysis = analyze_sentiment_api(content)
    
    return {
        "transcript_id": transcript_id,
        "overall": {
            "vibe_score": int((analysis["score"] + 1) / 2 * 100),
            "label": analysis["label"],
            "color": analysis["color"],
            "emoji": "🟢" if analysis["sentiment"] == "positive" else "🔴"
        },
        "segments": [],
        "speakers": []
    }