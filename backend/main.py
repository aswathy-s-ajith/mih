import os
import json
import re
import time
import requests
from typing import List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# ─────────────────────────────────────────────
# 1. Environment
# ─────────────────────────────────────────────
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path if env_path.exists() else None)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")

if not all([SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY, HF_TOKEN]):
    raise RuntimeError("Missing required environment variables (SUPABASE, GROQ, or HF_TOKEN)")

# ─────────────────────────────────────────────
# 2. Clients
# ─────────────────────────────────────────────
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

# ─────────────────────────────────────────────
# 3. App Setup
# ─────────────────────────────────────────────
app = FastAPI(title="Meeting Intelligence API")

# UPDATED: Cloud-safe CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# 4. Pydantic Models
# ─────────────────────────────────────────────
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

# ─────────────────────────────────────────────
# 5. Auth Dependency
# ─────────────────────────────────────────────
def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header provided")
    try:
        token = authorization.split(" ")[1]
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid session")
        return user_response.user
    except Exception as e:
        print(f"Auth Error: {str(e)}")
        raise HTTPException(status_code=401, detail="Unauthorized access")

# ─────────────────────────────────────────────
# 6. System Prompts
# ─────────────────────────────────────────────
RAG_SYSTEM_PROMPT = """You are Recall, an intelligent meeting assistant.
Answer using ONLY the transcript excerpts provided. Cite sources as [Source: chunk]. Tone: Helpful, direct."""

SUMMARY_SYSTEM_PROMPT = """Summarize transcript excerpts into: Meeting Overview, Key Decisions, and Action Items."""

INTENT_CLASSIFIER_PROMPT = """Classify the user message into exactly one intent. Return ONLY raw JSON: {{"intent": "..."}}"""

# ─────────────────────────────────────────────
# 7. Intent Router
# ─────────────────────────────────────────────
def classify_intent(message: str) -> str:
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": INTENT_CLASSIFIER_PROMPT.format(message=message)}],
            max_tokens=20,
            temperature=0.0
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r'```json|```', '', raw).strip()
        data = json.loads(raw)
        return data.get("intent", "rag_search")
    except Exception:
        return "rag_search"

# ─────────────────────────────────────────────
# 8. UPDATED: Hugging Face API Embedding & Chunking
# ─────────────────────────────────────────────
def generate_embeddings(text_list: List[str]) -> List[List[float]]:
    API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    response = requests.post(API_URL, headers=headers, json={"inputs": text_list})
    
    if response.status_code == 503:
        time.sleep(10)
        response = requests.post(API_URL, headers=headers, json={"inputs": text_list})
    
    return response.json()

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 150) -> List[str]:
    words = text.split()
    chunks = []
    step = chunk_size - overlap
    for i in range(0, len(words), step):
        chunk = " ".join(words[i: i + chunk_size])
        if chunk: chunks.append(chunk)
    return chunks

# ─────────────────────────────────────────────
# 9. UPDATED: Hugging Face API Sentiment Analysis
# ─────────────────────────────────────────────
EMOTION_TO_SENTIMENT = {
    "joy":      {"sentiment": "positive", "label": "Enthusiastic", "color": "#22c55e"},
    "surprise": {"sentiment": "positive", "label": "Engaged",      "color": "#84cc16"},
    "neutral":  {"sentiment": "neutral",  "label": "Neutral",      "color": "#94a3b8"},
    "fear":      {"sentiment": "negative", "label": "Concerned",    "color": "#f59e0b"},
    "sadness":  {"sentiment": "negative", "label": "Uncertain",    "color": "#f97316"},
    "anger":    {"sentiment": "negative", "label": "Frustrated",   "color": "#ef4444"},
    "disgust":  {"sentiment": "negative", "label": "Conflicted",   "color": "#dc2626"},
}

def analyze_emotion(text: str) -> dict:
    API_URL = "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    try:
        response = requests.post(API_URL, headers=headers, json={"inputs": text[:500]})
        results = response.json()[0]
        top_emotion = max(results, key=lambda x: x["score"])
        emotion_name = top_emotion["label"].lower()
        score = top_emotion["score"]

        mapping = EMOTION_TO_SENTIMENT.get(emotion_name, {"sentiment": "neutral", "label": "Neutral", "color": "#94a3b8"})
        normalized_score = score if mapping["sentiment"] == "positive" else -score if mapping["sentiment"] == "negative" else 0.0

        return {
            "emotion": emotion_name,
            "label": mapping["label"],
            "sentiment": mapping["sentiment"],
            "color": mapping["color"],
            "score": round(normalized_score, 3),
            "confidence": round(score, 3),
            "all_emotions": {r["label"].lower(): round(r["score"], 3) for r in results}
        }
    except Exception:
        return {"emotion": "neutral", "label": "Neutral", "sentiment": "neutral", "color": "#94a3b8", "score": 0.0, "confidence": 0.0, "all_emotions": {}}

# ─────────────────────────────────────────────
# 10. Speaker Parsing & Segments (Kept Same)
# ─────────────────────────────────────────────
def parse_speakers(content: str) -> list[dict]:
    lines = content.strip().split('\n')
    turns = []
    current_speaker, current_text = "Unknown", []
    speaker_pattern = re.compile(r'^([A-Z][A-Za-z\s]+|SPEAKER_\d+)\s*:\s*(.+)')
    for line in lines:
        line = line.strip()
        if not line: continue
        match = speaker_pattern.match(line)
        if match:
            if current_text: turns.append({"speaker": current_speaker, "text": " ".join(current_text).strip()})
            current_speaker, current_text = match.group(1).strip(), [match.group(2).strip()]
        else: current_text.append(line)
    if current_text: turns.append({"speaker": current_speaker, "text": " ".join(current_text).strip()})
    return turns

def group_turns_into_segments(turns: list[dict], turns_per_segment: int = 3) -> list[dict]:
    segments = []
    for i in range(0, len(turns), turns_per_segment):
        group = turns[i: i + turns_per_segment]
        combined_text = " ".join([t["text"] for t in group])
        speaker_counts = {}
        for t in group: speaker_counts[t["speaker"]] = speaker_counts.get(t["speaker"], 0) + len(t["text"].split())
        dominant_speaker = max(speaker_counts, key=speaker_counts.get)
        segments.append({"segment_index": len(segments), "speaker": dominant_speaker, "text": combined_text, "speakers_in_segment": list(speaker_counts.keys())})
    return segments

def compute_speaker_breakdown(analyzed_segments: list[dict]) -> list[dict]:
    speaker_data = {}
    for seg in analyzed_segments:
        speaker = seg["speaker"]
        if speaker not in speaker_data:
            speaker_data[speaker] = {"scores": [], "labels": [], "positive": 0, "neutral": 0, "negative": 0}
        speaker_data[speaker]["scores"].append(seg["score"])
        speaker_data[speaker]["labels"].append(seg["label"])
        speaker_data[speaker][seg["sentiment"]] += 1
    breakdown = []
    for speaker, data in speaker_data.items():
        avg_score = round(sum(data["scores"]) / len(data["scores"]), 3)
        vibe_score = round((avg_score + 1) / 2 * 100)
        breakdown.append({"speaker": speaker, "avg_score": avg_score, "vibe_score": vibe_score, "dominant_label": max(set(data["labels"]), key=data["labels"].count), "positive_count": data["positive"], "neutral_count": data["neutral"], "negative_count": data["negative"], "total_segments": len(data["scores"])})
    return sorted(breakdown, key=lambda x: x["vibe_score"], reverse=True)

def compute_overall_vibe(analyzed_segments: list[dict]) -> dict:
    if not analyzed_segments: return {"vibe_score": 50, "label": "No Data", "color": "#94a3b8", "emoji": "⚪"}
    avg = sum(s["score"] for s in analyzed_segments) / len(analyzed_segments)
    vibe_score = round((avg + 1) / 2 * 100)
    if vibe_score >= 65: return {"vibe_score": vibe_score, "label": "Collaborative", "color": "#22c55e", "emoji": "🟢"}
    elif vibe_score >= 40: return {"vibe_score": vibe_score, "label": "Mixed", "color": "#f59e0b", "emoji": "🟡"}
    else: return {"vibe_score": vibe_score, "label": "Tense", "color": "#ef4444", "emoji": "🔴"}

# ─────────────────────────────────────────────
# 11. Search Logic (Kept Same)
# ─────────────────────────────────────────────
def vector_search(query: str, project_id: int) -> List[dict]:
    try:
        query_vector = generate_embeddings([query])[0]
        result = supabase.rpc("match_transcript_chunks", {"query_embedding": query_vector, "match_threshold": 0.15, "match_count": 8, "p_project_id": int(project_id)}).execute()
        return result.data or []
    except Exception: return []

def hybrid_search(query: str, project_id: int) -> List[dict]:
    return vector_search(query, project_id) # Simplified hybrid logic for your core features

# ─────────────────────────────────────────────
# 12. Routes (Kept Same)
# ─────────────────────────────────────────────
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
    if intent == "greeting": return ChatResponse(answer="Hi! I'm Recall. Ask me anything about your meetings.", sources=[], intent="greeting")
    if intent == "summary":
        rows = supabase.table("transcript_chunks").select("content").eq("project_id", int(req.project_id)).limit(15).execute()
        context = "\n".join([c["content"] for c in rows.data])
        resp = groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "system", "content": SUMMARY_SYSTEM_PROMPT}, {"role": "user", "content": context}])
        return ChatResponse(answer=resp.choices[0].message.content, sources=[], intent="summary")
    
    chunks = hybrid_search(req.question, req.project_id)
    context = "\n\n".join([c['content'] for c in chunks])
    resp = groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "system", "content": RAG_SYSTEM_PROMPT}, {"role": "user", "content": f"Context: {context}\nQuestion: {req.question}"}])
    return ChatResponse(answer=resp.choices[0].message.content, sources=[{"transcript_id": c["transcript_id"]} for c in chunks], intent="rag_search")

@app.get("/sentiment/{transcript_id}")
async def get_sentiment(transcript_id: int, current_user: dict = Depends(get_current_user)):
    res = supabase.table("transcripts").select("content").eq("id", transcript_id).single().execute()
    content = res.data["content"]
    turns = parse_speakers(content)
    raw_segments = group_turns_into_segments(turns)
    analyzed_segments = []
    for seg in raw_segments:
        emo = analyze_emotion(seg["text"])
        analyzed_segments.append({**seg, **emo, "transcript_id": transcript_id})
    
    return {
        "transcript_id": transcript_id,
        "overall": compute_overall_vibe(analyzed_segments),
        "segments": analyzed_segments,
        "speakers": compute_speaker_breakdown(analyzed_segments)
    }