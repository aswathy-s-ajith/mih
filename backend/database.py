from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from pathlib import Path
import os

# Prefer project-local .env (next to this file); fallback to current working dir.
env_path = Path(__file__).resolve().parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()  # fallback

DATABASE_URL = os.getenv("DATABASE_URL")
print("Connecting to:", DATABASE_URL)
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set. Check .env or process environment.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

def get_db():
    conn = engine.connect()
    return conn

def init_db():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS transcripts (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id),
                filename TEXT NOT NULL,
                content TEXT NOT NULL,
                meeting_date TEXT,
                speaker_count INTEGER DEFAULT 0,
                word_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS decisions (
                id SERIAL PRIMARY KEY,
                transcript_id INTEGER REFERENCES transcripts(id),
                type TEXT CHECK(type IN ('decision', 'action_item')),
                description TEXT,
                owner TEXT,
                due_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id),
                role TEXT CHECK(role IN ('user', 'assistant')),
                content TEXT,
                sources TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sentiment_segments (
                id SERIAL PRIMARY KEY,
                transcript_id INTEGER REFERENCES transcripts(id),
                segment_index INTEGER,
                start_time TEXT,
                end_time TEXT,
                speaker TEXT,
                text TEXT,
                sentiment TEXT CHECK(sentiment IN ('positive', 'neutral', 'negative')),
                label TEXT,
                score REAL
            );
        """))

        conn.commit()
        print("Database initialized.")
