import os
import json
import re
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).resolve().parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# ENV VARIABLES
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY]):
    raise RuntimeError("Missing required environment variables")

# Clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

# App
app = FastAPI(title="Meeting Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Response Model ---
class UploadResponse(BaseModel):
    success: bool
    transcript_id: int
    message: str

# --- Helper Functions ---

def calculate_word_count(text: str) -> int:
    return len(text.split())


def call_ai_for_insights(transcript_text: str) -> str:
    """Call Groq AI"""
    prompt = f"""
You are an AI assistant that analyzes meeting transcripts.

Extract:
1. Decisions (final agreements only)
2. Action Items (tasks with owner and due date)

Return ONLY valid JSON:

{{
  "decisions": [{{ "description": "string" }}],
  "actions": [
    {{
      "description": "string",
      "owner": "string or null",
      "due_date": "string or null"
    }}
  ]
}}

Transcript:
\"\"\"{transcript_text}\"\"\"
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "Return ONLY JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )

        return response.choices[0].message.content

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")


def parse_ai_response(ai_text: str) -> dict:
    """Clean + parse JSON safely"""

    # Remove markdown
    ai_text = re.sub(r'```json', '', ai_text)
    ai_text = re.sub(r'```', '', ai_text).strip()

    # Extract JSON block
    match = re.search(r'\{.*\}', ai_text, re.DOTALL)
    if not match:
        raise HTTPException(status_code=500, detail="No JSON found")

    try:
        return json.loads(match.group())
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON parse error: {str(e)}")


def insert_decisions(transcript_id: int, data: dict):
    """Insert into Supabase using bulk insert for speed"""
    to_insert = []

    # Prepare Decisions
    for d in data.get("decisions", []):
        if d.get("description"):
            to_insert.append({
                "transcript_id": transcript_id,
                "type": "decision",
                "description": d["description"],
                "owner": None,
                "due_date": None
            })

    # Prepare Actions
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
        try:
            supabase.table("decisions").insert(to_insert).execute()
        except Exception as e:
            print(f"DB Error: {e}")
            raise HTTPException(status_code=500, detail="Failed to save insights")


# --- Routes ---

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload", response_model=UploadResponse)
async def upload_transcript(
    file: UploadFile = File(...),
    project_id: int = Form(default=1)
):

    allowed = [".txt", ".vtt"]
    ext = os.path.splitext(file.filename)[1].lower()

    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Only .txt/.vtt allowed")

    try:
        # Read file
        content = await file.read()
        text = content.decode("utf-8")
        word_count = calculate_word_count(text)

        # Insert transcript
        res = supabase.table("transcripts").insert({
            "project_id": project_id,
            "filename": file.filename,
            "content": text,
            "word_count": word_count
        }).execute()

        transcript_id = res.data[0]["id"]

        # AI processing
        ai_raw = call_ai_for_insights(text)
        parsed = parse_ai_response(ai_raw)

        # Save insights
        insert_decisions(transcript_id, parsed)

        return UploadResponse(
            success=True,
            transcript_id=transcript_id,
            message="Processed successfully"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))