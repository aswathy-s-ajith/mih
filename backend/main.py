import os
import json
import re
from typing import List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from pathlib import Path

# ─────────────────────────────────────────────
# 1. Environment
# ─────────────────────────────────────────────
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path if env_path.exists() else None)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")   # Use service_role key — NOT anon key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY]):
    raise RuntimeError("Missing required environment variables in .env")

# ─────────────────────────────────────────────
# 2. Clients
# ─────────────────────────────────────────────
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)
embed_model = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dimensions

# ─────────────────────────────────────────────
# 3. App Setup
# ─────────────────────────────────────────────
app = FastAPI(title="Meeting Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
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

Your rules:
1. Answer using ONLY the transcript excerpts provided — never fabricate facts, names, numbers, or decisions.
2. Be conversational and concise — write like a smart colleague, not a legal document.
3. If a specific person is mentioned in the question, find what THEY said specifically and attribute it clearly.
4. Always cite your source at the end using: [Source: chunk from transcript]
5. If the answer is NOT in the excerpts, say exactly: "I couldn't find that in the available transcripts. Try rephrasing or check that the right meeting is uploaded."
6. If multiple meetings are relevant, synthesize across them and note which point came from which meeting.
7. Use bullet points for lists. Keep answers under 150 words unless deep detail is truly needed.

Tone: Helpful, direct, friendly."""

SUMMARY_SYSTEM_PROMPT = """You are Recall, an intelligent meeting assistant.

Summarize the transcript excerpts into a structured brief using EXACTLY this format:

**Meeting Overview**
[2-3 sentence overview of what the meeting was about]

**Key Decisions**
- [decision 1]
- [decision 2]

**Action Items**
- [Owner]: [task] — due [date if mentioned, else 'not specified']

**Notable Discussions**
- [important topic or concern raised]

Be tight and precise. Every word should earn its place."""

INTENT_CLASSIFIER_PROMPT = """Classify the user message into exactly one intent.
Return ONLY a raw JSON object — no explanation, no markdown, no code fences.

Intents:
- "greeting"     : hello, hi, thanks, how are you, who are you, what can you do
- "summary"      : overview, summarize, what is this about, main points, brief me
- "action_items" : tasks, to-dos, who does what, follow-ups, action items, assigned
- "sentiment"    : mood, tone, how people felt, conflict, tension, enthusiasm, vibe
- "rag_search"   : any specific question about content, details, decisions, people, dates, numbers

Examples:
"Hi there!" -> {{"intent": "greeting"}}
"What's this meeting about?" -> {{"intent": "summary"}}
"What did John say about the budget?" -> {{"intent": "rag_search"}}
"What are my action items?" -> {{"intent": "action_items"}}
"Was there any tension?" -> {{"intent": "sentiment"}}
"Who is responsible for the laptop?" -> {{"intent": "rag_search"}}

User message: "{message}"
"""

# ─────────────────────────────────────────────
# 7. Intent Router
# ─────────────────────────────────────────────
def classify_intent(message: str) -> str:
    """
    Uses the LLM to classify intent — no fragile keyword lists.
    Falls back to 'rag_search' on any failure (always tries to find an answer).
    """
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user",
                "content": INTENT_CLASSIFIER_PROMPT.format(message=message)
            }],
            max_tokens=20,      # tiny — just needs {"intent": "..."}
            temperature=0.0     # fully deterministic classification
        )
        raw = response.choices[0].message.content.strip()
        # Strip any accidental markdown fences
        raw = re.sub(r'```json|```', '', raw).strip()
        data = json.loads(raw)
        intent = data.get("intent", "rag_search")
        valid_intents = {"greeting", "summary", "action_items", "sentiment", "rag_search"}
        return intent if intent in valid_intents else "rag_search"
    except Exception as e:
        print(f"Intent classification failed: {e} — falling back to rag_search")
        return "rag_search"

# ─────────────────────────────────────────────
# 8. Embedding & Chunking
# ─────────────────────────────────────────────
def generate_embeddings(text_list: List[str]) -> List[List[float]]:
    embeddings = embed_model.encode(text_list)
    return embeddings.tolist()

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 150) -> List[str]:
    words = text.split()
    chunks = []
    step = chunk_size - overlap
    for i in range(0, len(words), step):
        chunk = " ".join(words[i: i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks

# ─────────────────────────────────────────────
# 9. Hybrid Search (Vector + Keyword fallback)
# ─────────────────────────────────────────────
def extract_keywords(query: str) -> List[str]:
    """
    Extract specific nouns and terms that benefit from keyword (ilike) search.
    These are proper nouns, quoted terms, and long specific words.
    """
    capitalized = re.findall(r'\b[A-Z][a-z]{2,}\b', query)
    quoted = re.findall(r'"([^"]+)"', query)
    stopwords = {
        'between', 'through', 'because', 'should', 'meeting',
        'discuss', 'about', 'these', 'those', 'there', 'their',
        'where', 'which', 'would', 'could', 'having'
    }
    long_words = [
        w for w in query.lower().split()
        if len(w) > 6 and w not in stopwords
    ]
    return list(set(capitalized + quoted + long_words))


def vector_search(query: str, project_id: int, match_threshold: float = 0.15, match_count: int = 8) -> List[dict]:
    """Semantic vector search via Supabase RPC with explicit bigint casting."""
    try:
        query_vector = generate_embeddings([query])[0]
        result = supabase.rpc("match_transcript_chunks", {
            "query_embedding": query_vector,
            "match_threshold": match_threshold,
            "match_count": match_count,
            "p_project_id": int(project_id)   # explicit int cast — avoids int4 vs bigint mismatch
        }).execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"Vector search error: {e}")
        return []


def keyword_search(keywords: List[str], project_id: int, limit_per_keyword: int = 3) -> List[dict]:
    """
    ilike keyword search for specific nouns/names that embeddings miss.
    Runs only on the top 3 keywords to avoid too many DB round-trips.
    """
    results = []
    seen_ids = set()
    for keyword in keywords[:3]:
        try:
            rows = (
                supabase.table("transcript_chunks")
                .select("id, transcript_id, content, project_id")
                .eq("project_id", int(project_id))
                .ilike("content", f"%{keyword}%")
                .limit(limit_per_keyword)
                .execute()
            )
            for row in (rows.data or []):
                if row["id"] not in seen_ids:
                    seen_ids.add(row["id"])
                    # Add a fake similarity score so it merges cleanly
                    row["similarity"] = 0.0
                    results.append(row)
        except Exception as e:
            print(f"Keyword search error for '{keyword}': {e}")
    return results


def hybrid_search(query: str, project_id: int) -> List[dict]:
    """
    Merge vector search results with keyword fallback.
    Deduplicates by chunk id. Returns top 8 chunks.
    """
    vector_results = vector_search(query, project_id)
    keywords = extract_keywords(query)
    keyword_results = keyword_search(keywords, project_id) if keywords else []

    # Merge — vector results first (higher quality), keyword results fill gaps
    seen_ids = set()
    merged = []
    for chunk in vector_results + keyword_results:
        chunk_id = chunk.get("id")
        if chunk_id not in seen_ids:
            seen_ids.add(chunk_id)
            merged.append(chunk)

    return merged[:8]

# ─────────────────────────────────────────────
# 10. Query Expansion
# ─────────────────────────────────────────────
def expand_query(original_query: str) -> List[str]:
    """
    Generate 2 alternative phrasings of the query to improve recall.
    Falls back to original query only if LLM call fails.
    """
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user",
                "content": (
                    f'Generate 2 alternative phrasings of this search query for a meeting transcript search engine.\n'
                    f'Return ONLY a JSON array of strings — no explanation, no markdown.\n'
                    f'Original: "{original_query}"\n'
                    f'Example output: ["what was decided about X", "X resolution or agreement"]'
                )
            }],
            max_tokens=80,
            temperature=0.4
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r'```json|```', '', raw).strip()
        alternatives = json.loads(raw)
        if isinstance(alternatives, list):
            return [original_query] + [str(a) for a in alternatives[:2]]
    except Exception as e:
        print(f"Query expansion failed: {e}")
    return [original_query]


def multi_query_hybrid_search(query: str, project_id: int) -> List[dict]:
    """
    Run hybrid search across original + expanded queries.
    Solves the chunk boundary problem and semantic mismatch.
    """
    queries = expand_query(query)
    seen_ids = set()
    all_chunks = []

    for q in queries:
        for chunk in hybrid_search(q, project_id):
            chunk_id = chunk.get("id")
            if chunk_id not in seen_ids:
                seen_ids.add(chunk_id)
                all_chunks.append(chunk)

    return all_chunks[:8]

# ─────────────────────────────────────────────
# 11. Intent Handlers
# ─────────────────────────────────────────────
def handle_greeting() -> ChatResponse:
    return ChatResponse(
        answer=(
            "Hey! I'm Recall, your meeting intelligence assistant. "
            "Ask me anything about your meetings — decisions made, action items, "
            "what someone said, or the overall vibe of the discussion."
        ),
        sources=[],
        intent="greeting"
    )


def handle_summary(project_id: int) -> ChatResponse:
    """Fetch a broad sample of chunks and ask LLM to summarize."""
    try:
        rows = (
            supabase.table("transcript_chunks")
            .select("content, transcript_id")
            .eq("project_id", int(project_id))
            .limit(20)
            .execute()
        )
        chunks = rows.data or []
        if not chunks:
            return ChatResponse(
                answer="I don't have any transcript content for this project yet. Please upload a transcript first.",
                sources=[],
                intent="summary"
            )

        context = "\n\n".join([c["content"] for c in chunks])
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": f"TRANSCRIPT CONTENT:\n{context}"}
            ],
            max_tokens=600,
            temperature=0.2
        )
        return ChatResponse(
            answer=response.choices[0].message.content,
            sources=[{"transcript_id": c["transcript_id"], "snippet": c["content"][:80]} for c in chunks[:3]],
            intent="summary"
        )
    except Exception as e:
        print(f"Summary handler error: {e}")
        raise HTTPException(status_code=500, detail="Could not generate summary.")


def handle_action_items(project_id: int) -> ChatResponse:
    """Pull action items directly from the decisions table — no vector search needed."""
    try:
        rows = (
            supabase.table("decisions")
            .select("description, owner, due_date, transcript_id")
            .eq("type", "action_item")
            .execute()
        )
        items = rows.data or []

        # Filter by project via transcript_id join — simple loop for hackathon
        transcript_rows = (
            supabase.table("transcripts")
            .select("id")
            .eq("project_id", int(project_id))
            .execute()
        )
        transcript_ids = {r["id"] for r in (transcript_rows.data or [])}
        items = [i for i in items if i["transcript_id"] in transcript_ids]

        if not items:
            return ChatResponse(
                answer="No action items found for this project. Upload a transcript to extract them.",
                sources=[],
                intent="action_items"
            )

        lines = ["Here are the action items from your meetings:\n"]
        for item in items:
            owner = item.get("owner") or "Unassigned"
            due = item.get("due_date") or "no due date"
            lines.append(f"• **{owner}**: {item['description']} — due {due}")

        return ChatResponse(
            answer="\n".join(lines),
            sources=[],
            intent="action_items"
        )
    except Exception as e:
        print(f"Action items handler error: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch action items.")


def handle_rag_search(question: str, project_id: int) -> ChatResponse:
    """
    Full RAG pipeline:
    1. Expand query into variants
    2. Hybrid search (vector + keyword) across all variants
    3. Build context and call LLM with grounded system prompt
    """
    chunks = multi_query_hybrid_search(question, project_id)

    if not chunks:
        return ChatResponse(
            answer=(
                "I couldn't find a specific match in the transcripts for that question. "
                "Try rephrasing, or check that the right meeting is uploaded."
            ),
            sources=[],
            intent="rag_search"
        )

    context_text = "\n\n---\n\n".join([
        f"[Chunk {i+1}]: {c['content']}"
        for i, c in enumerate(chunks)
    ])

    try:
        ai_response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": f"TRANSCRIPT EXCERPTS:\n{context_text}\n\nQUESTION:\n{question}"}
            ],
            max_tokens=500,
            temperature=0.1   # low for factual grounding
        )
        answer = ai_response.choices[0].message.content
        sources = [
            {"transcript_id": c.get("transcript_id"), "snippet": c["content"][:120]}
            for c in chunks
        ]
        return ChatResponse(answer=answer, sources=sources, intent="rag_search")

    except Exception as e:
        print(f"RAG LLM error: {e}")
        raise HTTPException(status_code=500, detail="The assistant encountered an error generating a response.")

# ─────────────────────────────────────────────
# 12. Upload Helpers
# ─────────────────────────────────────────────
def calculate_word_count(text: str) -> int:
    return len(text.split())


def call_ai_for_insights(transcript_text: str) -> str:
    prompt = f"""Analyze this meeting transcript and extract Decisions and Action Items.
Return ONLY valid JSON — no explanation, no markdown fences.

Format:
{{
  "decisions": [{{"description": "text"}}],
  "actions": [{{"description": "text", "owner": "name or null", "due_date": "date or null"}}]
}}

Transcript:
{transcript_text}
"""
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "Return ONLY valid JSON. No explanation."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )
    return response.choices[0].message.content


def parse_ai_response(ai_text: str) -> dict:
    ai_text = re.sub(r'```json|```', '', ai_text).strip()
    match = re.search(r'\{.*\}', ai_text, re.DOTALL)
    if not match:
        raise HTTPException(status_code=500, detail="No JSON object found in AI response")
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        try:
            fixed = re.sub(r'\}\s*\{', '}, {', match.group())
            return json.loads(fixed)
        except Exception:
            raise HTTPException(status_code=500, detail="AI returned malformed JSON")


def insert_decisions(transcript_id: int, data: dict):
    to_insert = []
    for d in data.get("decisions", []):
        if d.get("description"):
            to_insert.append({
                "transcript_id": transcript_id,
                "type": "decision",
                "description": d["description"]
            })
    for a in data.get("actions", []):
        if a.get("description"):
            to_insert.append({
                "transcript_id": transcript_id,
                "type": "action_item",
                "description": a["description"],
                "owner": a.get("owner"),
                "due_date": a.get("due_date")
            })
    if to_insert:
        supabase.table("decisions").insert(to_insert).execute()


async def process_rag_pipeline(transcript_id: int, project_id: int, content: str):
    """
    Chunk → embed → store in transcript_chunks.
    Deletes existing chunks for this transcript first to avoid duplicates on re-upload.
    """
    try:
        # Deduplicate: remove stale chunks before re-inserting
        supabase.table("transcript_chunks")\
            .delete()\
            .eq("transcript_id", int(transcript_id))\
            .execute()

        chunks = chunk_text(content)
        embeddings = generate_embeddings(chunks)

        to_insert = [
            {
                "transcript_id": int(transcript_id),
                "project_id": int(project_id),
                "content": chunk,
                "embedding": emb
            }
            for chunk, emb in zip(chunks, embeddings)
        ]

        if to_insert:
            supabase.table("transcript_chunks").insert(to_insert).execute()
            print(f"RAG pipeline: inserted {len(to_insert)} chunks for transcript {transcript_id}")

    except Exception as e:
        print(f"RAG Pipeline Error: {str(e)}")

# ─────────────────────────────────────────────
# 13. Routes
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload", response_model=UploadResponse)
async def upload_transcript(
    file: UploadFile = File(...),
    project_id: str = Form(default="1"),
    current_user: dict = Depends(get_current_user)
):
    try:
        content = await file.read()
        text = content.decode("utf-8")

        res = supabase.table("transcripts").insert({
            "project_id": int(project_id),
            "filename": file.filename,
            "content": text,
            "word_count": calculate_word_count(text)
        }).execute()

        transcript_id = res.data[0]["id"]

        # Extract decisions + action items
        ai_raw = call_ai_for_insights(text)
        parsed = parse_ai_response(ai_raw)
        insert_decisions(transcript_id, parsed)

        # Chunk, embed, store
        await process_rag_pipeline(transcript_id, int(project_id), text)

        return UploadResponse(
            success=True,
            transcript_id=transcript_id,
            message=f"Uploaded and processed '{file.filename}' successfully."
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
async def chat_with_transcripts(
    req: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Step 1: classify intent with LLM (no fragile keyword lists)
        intent = classify_intent(req.question)
        print(f"Intent classified: '{intent}' for question: '{req.question}'")

        # Step 2: route to the right handler
        if intent == "greeting":
            response = handle_greeting()

        elif intent == "summary":
            response = handle_summary(req.project_id)

        elif intent == "action_items":
            response = handle_action_items(req.project_id)

        elif intent == "sentiment":
            # Sentiment falls through to RAG search with a context hint
            # (full sentiment dashboard is Feature 4 — covered in Week 2)
            modified_question = f"Describe the overall tone, mood, and any conflict or enthusiasm in the meeting. Original question: {req.question}"
            response = handle_rag_search(modified_question, req.project_id)
            response.intent = "sentiment"

        else:  # rag_search — default, safest fallback
            response = handle_rag_search(req.question, req.project_id)

        # Step 3: persist conversation history
        try:
            supabase.table("messages").insert([
                {"project_id": req.project_id, "role": "user", "content": req.question},
                {
                    "project_id": req.project_id,
                    "role": "assistant",
                    "content": response.answer,
                    "sources": json.dumps(response.sources)
                }
            ]).execute()
        except Exception as e:
            print(f"History save warning (non-fatal): {e}")

        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat Error: {str(e)}")
        raise HTTPException(status_code=500, detail="The assistant encountered an error.")