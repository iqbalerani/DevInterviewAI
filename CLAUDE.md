# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevProof is an AI-powered technical interview preparation platform that conducts realistic live interviews, evaluates coding skills in real-time, and generates verifiable credentials. Built with React, Vite, and Google Gemini AI (Live API and multimodal models).

**Recent Updates:**

**Phase 1 (Immediate Stability Fixes - COMPLETE):**
- ✅ Removed React.StrictMode to prevent double-mounting disconnect loops
- ✅ Fixed useEffect dependency in InterviewRoom to prevent session-change cleanups
- ✅ Removed camera/video functionality - now audio-only with visualizer

**Phase 2 (Backend Architecture - COMPLETE):**
- ✅ Node.js/Express backend server with WebSocket support
- ✅ MongoDB database for session/transcript persistence
- ✅ Server-side Gemini Live API management
- ✅ REST API endpoints for CRUD operations
- ✅ Frontend WebSocket integration
- ✅ Secure API key storage (backend only)

## Development Commands

### Frontend (React + Vite)
```bash
npm install              # Install dependencies
npm run dev              # Start dev server on port 3001
npm run build            # Production build
npm run preview          # Preview production build
```

### Backend (Node.js + Express)
```bash
cd backend
npm install              # Install dependencies
npm run dev              # Start backend server on port 3002 (with nodemon)
npm start                # Start backend server (production)
```

### Database Setup
```bash
# Install MongoDB (macOS)
brew install mongodb-community
brew services start mongodb-community

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Environment Setup

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:3002
VITE_WS_URL=ws://localhost:3002/ws/interview
```

**Backend `backend/.env`:**
```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/devproof
FRONTEND_URL=http://localhost:3001
```

**⚠️ Security:** API keys are now ONLY in the backend `.env` file, never in frontend code.

## Architecture Overview

### System Architecture (Client-Server)

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  (React + Vite - Port 3001)                                │
├─────────────────────────────────────────────────────────────┤
│  • Zustand State Management                                 │
│  • React Router (HashRouter)                                │
│  • useInterviewWebSocket Hook                               │
│  • interviewService (REST API Client)                       │
│  • Audio Visualizer UI                                      │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
         WebSocket                    REST API
     (Audio Streaming)            (CRUD Operations)
               │                          │
┌──────────────┴──────────────────────────┴───────────────────┐
│                         BACKEND                             │
│  (Node.js + Express - Port 3002)                           │
├─────────────────────────────────────────────────────────────┤
│  • WebSocket Server (/ws/interview)                         │
│  • REST API Endpoints (/api/*)                              │
│  • Gemini Live API Service                                  │
│  • MongoDB Models (Session, Transcript, Evaluation)         │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
      Gemini Live API               MongoDB Database
   (Audio Interview)              (Data Persistence)
               │                          │
┌──────────────┴──────────────────────────┴───────────────────┐
│                    EXTERNAL SERVICES                        │
├─────────────────────────────────────────────────────────────┤
│  • Google Gemini API (Live Audio + Text Generation)         │
│  • MongoDB (Local or Atlas)                                 │
└─────────────────────────────────────────────────────────────┘
```

### State Management
- **Zustand store** (`store.ts`): Frontend state for UI and session data
- **MongoDB**: Persistent storage for sessions, transcripts, and evaluations
- Real-time sync between frontend WebSocket and backend database

### AI Integration Strategy (Backend-Managed)

**All Gemini API calls now happen server-side for security and scalability.**

1. **Live API** (Backend: `geminiLiveService.js`):
   - **Server-managed** WebSocket bridge between frontend and Gemini Live API
   - Frontend sends audio via WebSocket → Backend forwards to Gemini
   - Gemini responses → Backend forwards to frontend + saves to DB
   - Uses `gemini-2.5-flash-native-audio-preview-12-2025` model with Zephyr voice
   - Auto-saves transcripts to MongoDB in real-time
   - Connection managed by `websocket/interviewHandler.js`

2. **Text Generation** (Backend: `routes/evaluations.js`):
   - `evaluateInterview()`: Post-session AI evaluation using `gemini-3-pro-preview`
   - Analyzes session transcripts from database
   - Generates scores and feedback
   - Stored in MongoDB for persistence

3. **Resume Analysis** (Frontend: `geminiService.ts` - TO BE MIGRATED):
   - Currently still in frontend (temporary)
   - `generateInterviewPlan()`, `calculateMatchScore()`, `analyzeResume()`
   - **Future**: Move these to backend endpoints for security

### Interview Flow Architecture

**Phase Progression**: `INTRO → BEHAVIORAL → TECHNICAL → CODING → CLOSING`

Key files:
- `InterviewSetup.tsx`: Resume upload, JD input, generates interview plan via `generateInterviewPlan()`
- `InterviewRoom.tsx`: Live session management with 2-minute timer, real-time audio, Monaco code editor for coding phase
- `Results.tsx`: Post-interview evaluation display

### Critical Timing Logic
- Session starts **only when user clicks "Join Audio Room"** in `InterviewRoom`
- Timer tracks both phase time and total session time (max 120 seconds)
- Timer logic is in `InterviewRoom.tsx:68-87`: starts when `isConnected && hasStartedRoom`
- Auto-ends session when total time exceeds `SESSION_LIMIT_SECONDS`

### Audio Handling (Audio-Only - No Camera)
- **Microphone input**: Captured via **AudioWorkletNode** (`audio-input-processor` in `public/audio-processor.js`)
- **Encoding**: 16kHz PCM, converted to base64 string
- **Transport**: Sent to backend via WebSocket (`ws://localhost:3002/ws/interview`)
- **Backend relay**: Backend forwards audio to Gemini Live API
- **AI audio output**: Received from backend, decoded to `AudioBuffer`, queued for playback
- **Audio context management**: Separate contexts for input (16kHz) and output (24kHz)
- **Modern audio processing**: Uses AudioWorklet API (not deprecated ScriptProcessorNode)
- **UI visualization**: Audio waveform visualizer shows speaking status

### Monaco Editor Integration
- Used in `CODING` phase for live code editing
- Theme: `vs-dark`
- Default language: Python
- Simulated test execution via `handleRunCode()` (no actual code execution backend yet)

### Routing Structure
```
/ → Dashboard
/interview/setup → InterviewSetup
/interview/room/:sessionId → InterviewRoom (fullscreen, no sidebar/header)
/interview/results/:sessionId → Results
/analyzer → Resume skill analyzer
/certificates → Certificate gallery
```

## Key Technical Constraints

1. **Live API Lifecycle**: Must explicitly `disconnect()` session on unmount to avoid memory leaks
   - **CRITICAL**: Do NOT include `disconnect` in useEffect dependency arrays - it causes immediate disconnection loops
   - **CRITICAL**: Do NOT include `systemInstruction` or `addTranscript` in `connect` callback dependencies - Live API connections are single-use and should not reconnect when props change
   - **CRITICAL**: Do NOT include `session` in InterviewRoom cleanup effect dependencies - session mutations trigger unwanted cleanups
   - The `disconnect` callback from `useLiveAPI` should only be called during component unmount
   - Cleanup effects that call `disconnect()` must have minimal dependencies (only `navigate`, not `session`)
   - Use ESLint disable comment when omitting stable functions from dependencies (see `InterviewRoom.tsx:57-58`, `useLiveAPI.ts:202-203`, `useLiveAPI.ts:207-208`)
2. **Audio Context Resume**: Contexts must be resumed immediately after creation (`await audioContext.resume()`) to bypass browser autoplay restrictions
3. **AudioWorklet Loading**: Must load `audio-processor.js` before creating AudioWorkletNode via `audioContext.audioWorklet.addModule()`
4. **JSON Extraction**: AI responses wrapped in markdown are cleaned via `extractJson()` helper
5. **Session Limit**: Hard 2-minute cap enforced via timer; UI shows warning at 15 seconds remaining
6. **Transcript Management**: Transcripts added on `turnComplete` events from Live API; stored in session state
7. **React StrictMode**: ~~Enabled~~ **DISABLED** (removed in Phase 1) - was causing double-mounting and disconnect loops in development

## Data Flow Patterns (Phase 2 - Backend Integration)

### 1. Session Creation
```
Frontend (InterviewSetup)
  → POST /api/sessions/create { resumeData, jobDescription, questions }
  → Backend creates Session in MongoDB
  → Returns session ID
  → Frontend stores in Zustand + navigates to InterviewRoom
```

### 2. Live Interview Flow
```
Frontend (InterviewRoom)
  → WebSocket connect to ws://localhost:3002/ws/interview
  → Send { type: 'connect', sessionId }

Backend (interviewHandler.js)
  → Fetch session from MongoDB
  → Connect to Gemini Live API with system instruction
  → Stream audio bidirectionally:

    User Mic → AudioWorklet → Frontend WS → Backend → Gemini
    Gemini → Backend → Frontend WS → AudioContext → Speaker

  → Auto-save transcripts to MongoDB on turnComplete
  → Update session status in database
```

### 3. Post-Interview Evaluation
```
Frontend (Results page)
  → POST /api/evaluations/:sessionId/evaluate

Backend
  → Fetch session + transcripts from MongoDB
  → Call Gemini text API for evaluation
  → Save scores to Evaluation collection
  → Return evaluation data to frontend
```

### 4. Transcript Retrieval
```
Frontend
  → GET /api/transcripts/:sessionId

Backend
  → Query MongoDB for all transcripts
  → Return sorted by timestamp
```

## File Structure (Phase 2 - Full Stack)

```
DevProofAI/
├── frontend/                     # React application (root directory)
│   ├── public/
│   │   └── audio-processor.js    # AudioWorklet processor
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useInterviewWebSocket.ts  # WebSocket hook (replaces useLiveAPI)
│   │   │   └── useLiveAPI.ts             # DEPRECATED - legacy
│   │   ├── services/
│   │   │   ├── interviewService.ts       # REST API client
│   │   │   └── geminiService.ts          # Legacy (to be migrated)
│   │   ├── pages/
│   │   │   ├── InterviewRoom.tsx         # Uses WebSocket
│   │   │   ├── Results.tsx               # Uses REST API
│   │   │   └── ...
│   │   ├── store.ts              # Zustand state
│   │   ├── types.ts              # TypeScript types
│   │   └── App.tsx
│   ├── .env                      # Frontend env (API/WS URLs)
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                      # NEW - Node.js server
│   ├── src/
│   │   ├── server.js             # Express app + WebSocket setup
│   │   ├── websocket/
│   │   │   └── interviewHandler.js  # WebSocket connection manager
│   │   ├── services/
│   │   │   └── geminiLiveService.js # Gemini Live API wrapper
│   │   ├── routes/
│   │   │   ├── sessions.js       # Session CRUD endpoints
│   │   │   ├── transcripts.js    # Transcript endpoints
│   │   │   └── evaluations.js    # Evaluation + AI analysis
│   │   ├── models/
│   │   │   ├── Session.js        # MongoDB schema
│   │   │   ├── Transcript.js     # MongoDB schema
│   │   │   └── Evaluation.js     # MongoDB schema
│   │   └── db/
│   │       └── connection.js     # MongoDB connection
│   ├── .env                      # Backend env (API keys, DB URI)
│   ├── package.json
│   └── .gitignore
│
└── CLAUDE.md                     # This file
```

## API Endpoints (Backend)

### Sessions
- `POST   /api/sessions/create` - Create new interview session
- `GET    /api/sessions/:id` - Get session by ID
- `PUT    /api/sessions/:id` - Update session
- `GET    /api/sessions` - List all sessions

### Transcripts
- `GET    /api/transcripts/:sessionId` - Get all transcripts for session
- `POST   /api/transcripts` - Manually create transcript entry

### Evaluations
- `POST   /api/evaluations/:sessionId/evaluate` - Generate AI evaluation
- `GET    /api/evaluations/:sessionId` - Get existing evaluation

### WebSocket
- `ws://localhost:3002/ws/interview` - Live interview audio streaming

## Database Schema (MongoDB)

### Sessions Collection
```javascript
{
  id: String (UUID),
  userId: String,
  status: Enum ['idle', 'setup', 'active', 'completed'],
  phase: Enum ['intro', 'behavioral', 'technical', 'coding', 'closing'],
  startTime: Date,
  endTime: Date,
  resumeData: Object,
  jobDescription: String,
  questions: [{ id, text, type, difficulty, expectedTopics, testCases }],
  currentQuestionIndex: Number,
  hintsUsed: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Transcripts Collection
```javascript
{
  sessionId: String (indexed),
  speaker: Enum ['user', 'ai'],
  text: String,
  timestamp: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Evaluations Collection
```javascript
{
  sessionId: String (unique, indexed),
  scores: {
    technical: Number (0-100),
    coding: Number (0-100),
    communication: Number (0-100),
    problemSolving: Number (0-100)
  },
  summary: String,
  strengths: [String],
  weaknesses: [String],
  skillChartUrl: String,
  certificateUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```
