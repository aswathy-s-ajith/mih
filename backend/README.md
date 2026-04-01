# Meeting Intelligence Hub - Backend

FastAPI backend for processing meeting transcripts with AI-powered insights extraction.

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string (from Supabase)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anonymous key
- `OPENAI_API_KEY`: OpenAI API key

### 3. Run Server
```bash
uvicorn main:app --reload --port 8000
```

Server runs at: `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

### Upload Transcript
```
POST /upload
Content-Type: multipart/form-data

Parameters:
- file: .txt or .vtt file (required)
- project_id: integer (optional, default: 1)

Response:
{
  "success": true,
  "transcript_id": 123,
  "message": "Transcript processed successfully"
}
```

## How It Works

1. **Upload** - Accept .txt or .vtt transcript files
2. **Extract** - Read file content and calculate word count
3. **Store** - Insert transcript metadata into Supabase
4. **Analyze** - Send text to OpenAI GPT-3.5-turbo for insight extraction
5. **Parse** - Extract decisions and action items from AI response
6. **Save** - Insert parsed data into decisions table

## Database Schema

### transcripts
- id (PK)
- project_id (FK)
- filename
- content
- meeting_date
- speaker_count
- word_count
- created_at

### decisions
- id (PK)
- transcript_id (FK)
- type ('decision' or 'action')
- description
- owner
- due_date
- created_at

### projects
- id (PK)
- name
- created_at

## Architecture

```
upload_transcript()
  ├── Read file content
  ├── Calculate word count
  ├── Insert into transcripts
  ├── Call OpenAI GPT-3.5-turbo
  ├── Parse JSON response
  └── Insert into decisions table
```

## Error Handling

- **Invalid file type**: 400 Bad Request
- **AI API error**: 500 Internal Server Error
- **Database error**: 500 Internal Server Error
- **JSON parse error**: 500 Internal Server Error

## Testing

curl -X POST http://localhost:8000/upload \
  -F "file=@meeting.txt" \
  -F "project_id=1"
