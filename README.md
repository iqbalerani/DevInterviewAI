<div align="center">

# DevProof AI

### AI-Powered Technical Interview Platform with Live Voice Interviews, Real-Time Evaluation & Verifiable Credentials

[![Built with React](https://img.shields.io/badge/Frontend-React_19-61DAFB?logo=react)](https://react.dev)
[![Node.js Backend](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js)](https://nodejs.org)
[![Powered by Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google)](https://ai.google.dev)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb)](https://mongodb.com)

</div>

---

DevProof conducts realistic live voice interviews powered by Google Gemini's Live API, evaluates your performance in real-time with per-question scoring, and generates PDF certificates to prove your skills. Upload your resume, paste a job description, and get a tailored interview experience with behavioral, technical, and coding rounds.

## Key Features

- **Live Voice AI Interviews** - Real-time audio conversations with Gemini Live API (Zephyr voice), not text chat
- **Smart Interview Planning** - Upload resume + job description to generate tailored questions across behavioral, technical, and coding phases
- **Per-Question Evaluation** - Background scoring via BullMQ queue as you progress through the interview
- **xstate v5 Orchestrator** - State machine manages interview flow, prevents audio overlap, enforces conversation turns
- **Monaco Code Editor** - In-browser code editor for the coding phase with syntax highlighting
- **PDF Certificates** - Generate verifiable credential PDFs with scores and skill breakdowns
- **Flashcards & Quizzes** - 500+ study cards and multiple-choice quizzes across algorithms, data structures, and system design
- **Dashboard Analytics** - Skill progression charts, session history, and performance tracking
- **Auth System** - JWT authentication with bcrypt password hashing, user roles, and weekly interview limits
- **Resume Management** - Upload, store, and reuse resumes across interview sessions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 6, Zustand 5, React Router 7 |
| **UI** | Framer Motion, Lucide Icons, Recharts, Three.js (landing page) |
| **Code Editor** | Monaco Editor (VS Code engine) |
| **Backend** | Node.js, Express 4, WebSocket (ws) |
| **Database** | MongoDB (Mongoose 8), Redis (ioredis) |
| **AI** | Google Gemini Live API, Gemini 2.0 Flash, Gemini 3 Flash/Pro |
| **Auth** | JWT (jsonwebtoken), bcrypt |
| **Queue** | BullMQ (Redis-backed, with inline fallback) |
| **State Machine** | xstate v5 |
| **PDF** | jsPDF, pdf-parse (resume extraction) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  (React + Vite - Port 3001)                                │
├─────────────────────────────────────────────────────────────┤
│  • Zustand State + Auth Store                               │
│  • React Router (HashRouter)                                │
│  • useInterviewWebSocket Hook                               │
│  • REST API Client (interviewService)                       │
│  • Audio Visualizer / Monaco Editor                         │
│  • Flashcards & Quiz Engines                                │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
         WebSocket                    REST API
     (Audio Streaming)            (CRUD + Auth)
               │                          │
┌──────────────┴──────────────────────────┴───────────────────┐
│                         BACKEND                             │
│  (Node.js + Express - Port 3002)                           │
├─────────────────────────────────────────────────────────────┤
│  • JWT Auth Middleware + Interview Limits                    │
│  • xstate v5 Interview Orchestrator                         │
│  • WebSocket Server (/ws/interview)                         │
│  • BullMQ Evaluation Queue (Redis)                          │
│  • Gemini Live API Service                                  │
│  • MongoDB Models (User, Session, Transcript, Evaluation)   │
└──────┬──────────┬──────────────┬──────────┬─────────────────┘
       │          │              │          │
  Gemini API   MongoDB       Redis     Gemini Text
 (Live Audio)  (Persistence)  (Queue)  (Evaluation)
```

### Audio Flow
```
User Mic → AudioWorklet (16kHz PCM) → WebSocket → Backend → Gemini Live API
Gemini → Backend → WebSocket → AudioContext (24kHz) → Speaker
```

### Interview State Machine
```
idle → connecting → ready ⇄ user_speaking ⇄ ai_speaking → transitioning → evaluating → completed
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Redis** (optional - evaluation queue falls back to inline processing)
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/apikey))

### 1. Clone & Install

```bash
git clone https://github.com/iqbalerani/DevProofAI.git
cd DevProofAI

# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

### 2. Environment Setup

**Frontend** (`.env` in root):
```bash
VITE_API_URL=http://localhost:3002
VITE_WS_URL=ws://localhost:3002/ws/interview
```

**Backend** (`backend/.env`):
```bash
GEMINI_API_KEY=your_gemini_api_key
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/devproof
JWT_SECRET=your_secure_random_string
FRONTEND_URL=http://localhost:3001

# Optional
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Start Services

```bash
# Terminal 1 - Database (if local)
brew services start mongodb-community
# Or: docker run -d -p 27017:27017 --name mongodb mongo:latest

# Terminal 2 - Redis (optional)
redis-server

# Terminal 3 - Backend
cd backend && npm run dev

# Terminal 4 - Frontend
npm run dev
```

### 4. Seed Admin Account (Optional)

```bash
cd backend && node src/scripts/seedAdmin.js
```

Open **http://localhost:3001** and create an account to get started.

## How It Works

### Interview Flow

1. **Setup** - Upload your resume (PDF) and paste the target job description
2. **AI Planning** - Gemini analyzes your resume against the JD and generates tailored interview questions across 5 phases
3. **Live Interview** - Join the audio room for a real-time voice conversation with the AI interviewer
4. **Phase Progression** - `INTRO → BEHAVIORAL → TECHNICAL → CODING → CLOSING` managed by xstate orchestrator
5. **Background Evaluation** - Each answer is scored in the background via BullMQ as you move to the next question
6. **Results** - View detailed scores, strengths, areas for improvement, and a learning path
7. **Certificate** - Generate a PDF credential with your scores and skill breakdown

### Study Tools

- **Flashcards** - 500+ cards across algorithms, data structures, system design, and more. Track progress per deck.
- **Quizzes** - Multiple-choice practice with instant feedback and scoring.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions/create` | Create interview session |
| GET | `/api/sessions/:id` | Get session by ID |
| PUT | `/api/sessions/:id` | Update session |
| GET | `/api/sessions` | List user's sessions |

### Evaluations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/evaluations/:sessionId/evaluate` | Generate AI evaluation |
| GET | `/api/evaluations/:sessionId` | Get evaluation results |

### Transcripts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transcripts/:sessionId` | Get session transcripts |
| POST | `/api/transcripts` | Create transcript entry |

### Dashboard & Resume
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | User stats & analytics |
| POST | `/api/user/resume` | Upload/update resume |
| GET | `/api/user/resume` | Get stored resume |

### Resume Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resume/analyze` | AI resume analysis |
| POST | `/api/resume/interview-plan` | Generate interview plan |

### WebSocket
| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WS | `/ws/interview` | Live audio streaming |

## Project Structure

```
DevProofAI/
├── src/                          # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── flashcards/           # Flashcard viewer, deck grid, progress
│   │   ├── quiz/                 # Quiz session, question cards, results
│   │   ├── settings/             # Profile, preferences, appearance
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── data/
│   │   ├── flashcardDecks.ts     # 500+ study flashcards
│   │   └── quizDecks.ts          # Multiple-choice quiz decks
│   ├── hooks/
│   │   ├── useInterviewWebSocket.ts
│   │   └── useVoiceActivityDetection.ts
│   ├── pages/
│   │   ├── Dashboard.tsx         # Stats, charts, session history
│   │   ├── InterviewSetup.tsx    # Resume + JD upload
│   │   ├── InterviewRoom.tsx     # Live interview (fullscreen)
│   │   ├── Results.tsx           # Post-interview scores
│   │   ├── Flashcards.tsx        # Study flashcards
│   │   ├── Quiz.tsx              # Practice quizzes
│   │   ├── Analyzer.tsx          # Resume skill analyzer
│   │   ├── Certificates.tsx      # PDF credential gallery
│   │   ├── Settings.tsx          # User preferences
│   │   ├── Landing.tsx           # Public landing page
│   │   ├── Login.tsx
│   │   └── Signup.tsx
│   ├── services/
│   │   ├── authService.ts        # Auth API client
│   │   ├── interviewService.ts   # Session/eval API client
│   │   ├── certificateGenerator.ts
│   │   └── shareService.ts
│   ├── store/
│   │   └── authStore.ts          # Zustand auth state
│   ├── store.ts                  # Zustand app state
│   ├── types.ts
│   └── App.tsx                   # Router + layout
│
├── backend/                      # Node.js server
│   └── src/
│       ├── server.js             # Express + WebSocket setup
│       ├── middleware/
│       │   ├── auth.js           # JWT verification
│       │   └── interviewLimit.js # Weekly limit enforcement
│       ├── state/
│       │   └── interviewOrchestrator.js  # xstate v5 state machine
│       ├── agents/
│       │   └── evaluationAgent.js        # AI evaluation agent
│       ├── queues/
│       │   └── evaluationQueue.js        # BullMQ job queue
│       ├── websocket/
│       │   └── interviewHandler.js       # WebSocket manager
│       ├── services/
│       │   └── geminiLiveService.js      # Gemini Live API wrapper
│       ├── routes/
│       │   ├── auth.js           # Login, signup, /me
│       │   ├── sessions.js       # Session CRUD
│       │   ├── transcripts.js    # Transcript endpoints
│       │   ├── evaluations.js    # AI evaluation
│       │   ├── dashboard.js      # Stats aggregation
│       │   ├── resume.js         # Resume analysis
│       │   └── userResume.js     # Resume upload/storage
│       ├── models/
│       │   ├── User.js           # User + auth schema
│       │   ├── Session.js
│       │   ├── Transcript.js
│       │   └── Evaluation.js     # Question + Session evaluations
│       ├── scripts/
│       │   └── seedAdmin.js      # Admin seeding script
│       └── db/
│           └── connection.js     # MongoDB connection
│
├── public/
│   └── audio-processor.js        # AudioWorklet processor
├── CLAUDE.md
└── README.md
```
