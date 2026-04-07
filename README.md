# Meeting Intelligence Hub

 An AI-powered platform for analyzing meeting transcripts and extracting actionable insights.

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
- **Hugging Face Inference API**


### Database
- **Supabase** (PostgreSQL) - Cloud database with:
  - **projects** - Project management
  - **transcripts** - Meeting transcript storage
  - **transcript_chunks** - stores chunks of transcript extracted
  - **decisions** - Extracted decisions and action items
  - **messages** - Chat history (future feature)
  - **sentiment_segments** - Sentiment analysis results (future feature)

### Authentication
- **Supabase Auth** - Social login (Google OAuth) and email/password authentication

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

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
GROQ_API_KEY=gsk_your-groq-api-key
HF_TOKEN=your_huggingface_token
```

**How to get credentials:**
- **SUPABASE_URL & SUPABASE_KEY**: From Supabase project settings
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

## License

This project is licensed under the MIT License - see LICENSE file for details.

---

## Contact & Support

For questions or support, please open an issue in the GitHub repository.

**Repository**: [aswathy-s-ajith/mih](https://github.com/aswathy-s-ajith/mih)
