# Meeting Intelligence Hub

## Project Title
**Meeting Intelligence Hub (MIH)** - An AI-powered platform for analyzing meeting transcripts and extracting actionable insights.

---

## The Problem

Meeting teams struggle with capturing and acting on key decisions and action items from their discussions. Manual transcription and documentation is time-consuming and error-prone. Teams need a way to quickly extract structured insights (decisions, action items, sentiment) from meeting recordings without spending hours on manual review and documentation.

---

## The Solution

Meeting Intelligence Hub automatically processes meeting transcripts using AI to:
- **Extract Decisions**: Identify final agreements and key decisions made during meetings
- **Identify Action Items**: Automatically capture tasks, owners, and due dates
- **Organize Insights**: Display all findings in a clean, searchable dashboard
- **Track Progress**: Monitor action items and decisioning across multiple projects

The platform provides a seamless upload experience where users can submit `.txt` or `.vtt` transcript files, which are instantly analyzed by AI and results are displayed in an intuitive dashboard for team collaboration.

---

## Tech Stack

### Frontend
- **React** (v19.2.4) - UI framework
- **Vite** (v8.0.1) - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** (v7.13.2) - Client-side routing
- **Lucide React** - Icon library
- **Supabase JS Client** - Real-time database and authentication

### Backend
- **Python** (3.12) - Programming language
- **FastAPI** - Modern async web framework
- **Uvicorn** - ASGI server
- **Groq API** - AI model for insight extraction (llama-3.1-8b-instant)
- **Supabase Python Client** - Database and auth integration
- **SQLAlchemy** - Database ORM

### Database
- **Supabase** (PostgreSQL) - Cloud database with:
  - **projects** - Project management
  - **transcripts** - Meeting transcript storage
  - **decisions** - Extracted decisions and action items
  - **messages** - Chat history (future feature)
  - **sentiment_segments** - Sentiment analysis results (future feature)

### Authentication
- **Supabase Auth** - Social login (Google OAuth) and email/password authentication

---

## Setup Instructions

### Prerequisites
- Node.js (v16+) and npm
- Python (3.12+) and pip
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/aswathy-s-ajith/mih.git
cd mih
```

### 2. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Configure Supabase
Create `frontend/src/lib/supabase.js` (if not exists):
```javascript
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

#### Create `.env.local`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Run Frontend Dev Server
```bash
npm run dev
```
Server runs at: `http://localhost:5173`

### 3. Backend Setup

#### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Configure Environment Variables
Create `backend/.env`:
```
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
GROQ_API_KEY=gsk_your-groq-api-key
```

**How to get credentials:**
- **DATABASE_URL & SUPABASE_URL & SUPABASE_KEY**: From Supabase project settings
- **GROQ_API_KEY**: Get free API key from [Groq Console](https://console.groq.com)

#### Run Backend Server
```bash
uvicorn main:app --reload --port 8000
```
Server runs at: `http://localhost:8000`

### 4. Running Both Concurrently

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## Key Features

### 📊 Dashboard
- Real-time statistics (projects, transcripts, action items)
- Recent transcripts table with word count and dates
- Key insights sidebar showing decisions and pending actions
- User profile and logout functionality

### 📁 Project Management
- Create and manage multiple projects
- Organize transcripts by project
- Track project-specific insights

### 🎤 Transcript Upload
- Upload `.txt` or `.vtt` transcript files
- Automatic AI processing
- Real-time word count calculation
- Instant results display

### 🤖 AI Analysis
- Extracts decisions (final agreements)
- Identifies action items with owners and due dates
- Uses Groq's llama-3.1-8b-instant model
- Fast processing with low latency

### 🔐 Authentication
- Email/password signup and login
- Social login with Google (OAuth)
- Secure session management
- User profile with email and avatar

---

## Project Structure

```
mih/
├── frontend/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/          # Reusable React components
│   │   │   └── Dashboard.jsx
│   │   ├── pages/               # Page components
│   │   │   ├── Auth.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Upload.jsx
│   │   │   └── MeetingDetail.jsx
│   │   ├── lib/
│   │   │   └── supabase.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                     # FastAPI backend
│   ├── main.py                  # API endpoints
│   ├── database.py              # Database initialization
│   ├── models.py                # Pydantic models
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── .gitignore
└── README.md
```

---

## API Endpoints

### Health Check
```
GET /health
Response: { "status": "ok" }
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

---

## Future Enhancements

- [ ] Chat with AI about processed transcripts
- [ ] Sentiment analysis visualization
- [ ] Speaker diarization and labeling
- [ ] Export insights to PDF/Word
- [ ] Team collaboration and sharing
- [ ] Calendar integration for meeting context
- [ ] Automated follow-up reminders
- [ ] Multi-language support

---

## Troubleshooting

### Backend Won't Start
- **Error**: `DATABASE_URL environment variable is not set`
  - **Fix**: Ensure `.env` exists in `backend/` with correct `DATABASE_URL`

- **Error**: `Can't load plugin: sqlalchemy.dialects:https`
  - **Fix**: Use `DATABASE_URL` (postgresql://...) not `SUPABASE_URL` (https://...)

### Frontend Build Errors
- **Error**: React compiler import missing
  - **Fix**: Remove `reactCompilerPreset()` from `vite.config.js`

### Upload Fails
- **Error**: `Upload failed: Connection refused`
  - **Fix**: Ensure backend is running on `http://localhost:8000`

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see LICENSE file for details.

---

## Contact & Support

For questions or support, please open an issue in the GitHub repository.

**Repository**: [aswathy-s-ajith/mih](https://github.com/aswathy-s-ajith/mih)
