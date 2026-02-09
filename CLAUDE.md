# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevProof is an AI-powered technical interview preparation platform that conducts realistic live voice interviews, evaluates coding skills in real-time, and generates verifiable credentials. Built with React, Vite, Node.js/Express, MongoDB, Redis/BullMQ, xstate v5, and Google Gemini AI (Live API and multimodal models).

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
node src/scripts/seedAdmin.js  # Seed admin account
```

### Database Setup
```bash
# Install MongoDB (macOS)
brew install mongodb-community
brew services start mongodb-community

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Redis (optional - BullMQ falls back to inline evaluation)
brew install redis
redis-server
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
FRONTEND_URL_DEPLOYED=https://devproof-steel.vercel.app
JWT_SECRET=your_secure_random_string
REDIS_HOST=localhost
REDIS_PORT=6379
ADMIN_EMAIL=admin@devproof.ai
ADMIN_PASSWORD=change_me
```

**Security:** API keys and secrets are ONLY in the backend `.env` file, never in frontend code.

## Architecture Overview

### System Architecture (Client-Server)

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  (React + Vite - Port 3001)                                │
├─────────────────────────────────────────────────────────────┤
│  • Zustand State + Auth Store                               │
│  • React Router (HashRouter)                                │
│  • useInterviewWebSocket Hook                               │
│  • REST API Client (interviewService, authService)          │
│  • Audio Visualizer / Monaco Editor                         │
│  • Flashcards & Quiz Engines                                │
│  • ProtectedRoute (JWT guard)                               │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
         WebSocket                    REST API
     (Audio Streaming)            (CRUD + Auth)
               │                          │
┌──────────────┴──────────────────────────┴───────────────────┐
│                         BACKEND                             │
│  (Node.js + Express - Port 3002)                           │
├─────────────────────────────────────────────────────────────┤
│  • JWT Auth Middleware + Interview Limit Middleware          │
│  • xstate v5 Interview Orchestrator (state machine)         │
│  • WebSocket Server (/ws/interview)                         │
│  • BullMQ Evaluation Queue (Redis, with inline fallback)    │
│  • Gemini Live API Service                                  │
│  • Evaluation Agent (per-question AI scoring)               │
│  • MongoDB Models (User, Session, Transcript, Evaluation)   │
└──────┬──────────┬──────────────┬──────────┬─────────────────┘
       │          │              │          │
  Gemini API   MongoDB       Redis     Gemini Text
 (Live Audio)  (Persistence)  (Queue)  (Evaluation)
```

### State Management
- **Zustand store** (`store.ts`): Frontend state for UI and session data
- **Auth store** (`store/authStore.ts`): JWT token management, user state, login/logout
- **MongoDB**: Persistent storage for users, sessions, transcripts, and evaluations
- **xstate v5** (`state/interviewOrchestrator.js`): Server-side interview flow state machine
- Real-time sync between frontend WebSocket and backend database

### Authentication & Security
- **JWT** (jsonwebtoken): 7-day token expiration, verified on all protected routes via `middleware/auth.js`
- **bcrypt**: Password hashing with 12 salt rounds
- **User roles**: `user` | `admin` (admin bypasses interview limits)
- **Interview limits**: 5 interviews per week per user, resets every Monday at 00:00 UTC (`middleware/interviewLimit.js`)
- **Ownership checks**: Sessions and transcripts are scoped to the authenticated user
- **WebSocket auth**: Token passed via query string on WebSocket connection
- **CORS**: Configured for specific frontend origins only

### AI Integration Strategy (Backend-Managed)

**All Gemini API calls happen server-side for security and scalability.**

1. **Live API** (Backend: `services/geminiLiveService.js`):
   - **Server-managed** WebSocket bridge between frontend and Gemini Live API
   - Frontend sends audio via WebSocket → Backend forwards to Gemini
   - Gemini responses → Backend forwards to frontend + saves to DB
   - Uses `gemini-2.5-flash-native-audio-preview-12-2025` model with Zephyr voice
   - Auto-saves transcripts to MongoDB in real-time
   - Connection managed by `websocket/interviewHandler.js`

2. **Evaluation Agent** (Backend: `agents/evaluationAgent.js`):
   - Per-question scoring using `gemini-2.0-flash`
   - Processes evaluation jobs from BullMQ queue (or inline if Redis unavailable)
   - Saves QuestionEvaluation documents to MongoDB

3. **Session Evaluation** (Backend: `routes/evaluations.js`):
   - Post-session aggregate evaluation using `gemini-2.0-flash`
   - Analyzes all question evaluations + transcripts
   - Generates overall scores, learning path, skill gaps, next steps

4. **Resume Analysis** (Backend: `routes/resume.js`):
   - `analyzeResume()`: Extract skills and experience from PDF resumes
   - `generateInterviewPlan()`: Create tailored interview questions from resume + JD
   - Uses `gemini-3-flash-preview` / `gemini-3-pro-preview`

### Interview Orchestrator (xstate v5)

The interview flow is managed by a state machine in `backend/src/state/interviewOrchestrator.js`.

**States**: `idle → connecting → ready ⇄ user_speaking ⇄ ai_speaking → transitioning → evaluating → completed`

Key behaviors:
- Guards prevent question transitions until user has responded (`hasUserResponse()`)
- `bargeIn` action handles user interrupting AI speech
- `lockUserInput` / `unlockUserInput` prevent audio overlap
- `hasAIStartedSpeaking` flag must reset to `false` in `ai_speaking_ended` so subsequent AI responses trigger `AI_SPEAKING_STARTED`
- Auto-advance timer lives in `ai_speaking_ended`, gated by `hasUserResponded()`, cancelled on `user_speech_started`/disconnect

**xstate v5 patterns**:
- Actions use `assign()` for context mutations (NOT v4-style direct assignment)
- Guards use `({ context }) =>` destructuring (NOT v4-style `(context) =>`)

### BullMQ Evaluation Queue

`backend/src/queues/evaluationQueue.js`:
- Redis-backed job queue for background per-question evaluations
- Worker concurrency: 3, rate limit: 10 jobs/sec
- **Fallback**: If Redis is unavailable, evaluations run inline (synchronous)
- Jobs are queued during question transitions in the interview orchestrator

### Interview Flow Architecture

**Phase Progression**: `INTRO → BEHAVIORAL → TECHNICAL → CODING → CLOSING`

Key files:
- `InterviewSetup.tsx`: Resume upload, JD input, generates interview plan
- `InterviewRoom.tsx`: Live session management with timer, real-time audio, Monaco code editor for coding phase
- `Results.tsx`: Post-interview evaluation display with scores, strengths, improvements, learning path

### Critical Timing Logic
- Session starts **only when user clicks "Join Audio Room"** in `InterviewRoom`
- Timer tracks both phase time and total session time (max 120 seconds)
- Auto-ends session when total time exceeds `SESSION_LIMIT_SECONDS`
- Warning shown at 15 seconds remaining

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
Public:
  /                                → Landing
  /login                           → Login
  /signup                          → Signup

Protected (requires JWT):
  /dashboard                       → Dashboard (stats, charts, history)
  /interview/setup                 → InterviewSetup
  /interview/room/:sessionId       → InterviewRoom (fullscreen, no sidebar)
  /interview/results/:sessionId    → Results
  /analyzer                        → Resume skill analyzer
  /flashcards                      → Flashcard study tool
  /quiz                            → Quiz practice tool
  /certificates                    → Certificate gallery
  /settings                        → User settings
```

## Key Technical Constraints

1. **Live API Lifecycle**: Must explicitly `disconnect()` session on unmount to avoid memory leaks
   - **CRITICAL**: Do NOT include `disconnect` in useEffect dependency arrays - it causes immediate disconnection loops
   - **CRITICAL**: Do NOT include `systemInstruction` or `addTranscript` in `connect` callback dependencies - Live API connections are single-use and should not reconnect when props change
   - **CRITICAL**: Do NOT include `session` in InterviewRoom cleanup effect dependencies - session mutations trigger unwanted cleanups
   - The `disconnect` callback from `useLiveAPI` should only be called during component unmount
   - Cleanup effects that call `disconnect()` must have minimal dependencies (only `navigate`, not `session`)
2. **Audio Context Resume**: Contexts must be resumed immediately after creation (`await audioContext.resume()`) to bypass browser autoplay restrictions
3. **AudioWorklet Loading**: Must load `audio-processor.js` before creating AudioWorkletNode via `audioContext.audioWorklet.addModule()`
4. **JSON Extraction**: AI responses wrapped in markdown are cleaned via `extractJson()` helper
5. **Session Limit**: Hard 2-minute cap enforced via timer; UI shows warning at 15 seconds remaining
6. **Transcript Management**: Transcripts added on `turnComplete` events from Live API; stored in session state
7. **React StrictMode**: **DISABLED** - was causing double-mounting and disconnect loops in development
8. **Timers in WebSocket handlers**: MUST be cancellable (store timer ID) and state-guarded
9. **Audio logging**: Must be minimal - per-chunk logs create hundreds of lines/sec

## Data Flow Patterns

### 1. Authentication
```
Frontend (Login/Signup)
  → POST /api/auth/login { email, password }
  → Backend verifies credentials, returns JWT
  → Frontend stores token in authStore (Zustand)
  → All subsequent requests include Authorization: Bearer <token>
```

### 2. Session Creation
```
Frontend (InterviewSetup)
  → POST /api/sessions/create { resumeData, jobDescription, questions }
  → Backend creates Session in MongoDB (scoped to userId from JWT)
  → Returns session ID
  → Frontend stores in Zustand + navigates to InterviewRoom
```

### 3. Live Interview Flow
```
Frontend (InterviewRoom)
  → WebSocket connect to ws://localhost:3002/ws/interview
  → Send { type: 'connect', sessionId }

Backend (interviewHandler.js)
  → Fetch session from MongoDB
  → Initialize xstate orchestrator
  → Connect to Gemini Live API with system instruction
  → Stream audio bidirectionally:

    User Mic → AudioWorklet → Frontend WS → Backend → Gemini
    Gemini → Backend → Frontend WS → AudioContext → Speaker

  → Auto-save transcripts to MongoDB on turnComplete
  → On question transition → queue BullMQ evaluation job
  → Update session status in database
```

### 4. Background Evaluation
```
Interview Orchestrator (question transition)
  → Enqueue evaluation job to BullMQ (or inline fallback)

BullMQ Worker
  → evaluationAgent processes job
  → Calls Gemini 2.0 Flash with question + transcript
  → Saves QuestionEvaluation to MongoDB
```

### 5. Post-Interview Evaluation
```
Frontend (Results page)
  → POST /api/evaluations/:sessionId/evaluate

Backend
  → Fetch session + transcripts + question evaluations from MongoDB
  → Call Gemini 2.0 Flash for aggregate evaluation
  → Save SessionEvaluation to MongoDB
  → Return evaluation data to frontend
```

### 6. Transcript Retrieval
```
Frontend
  → GET /api/transcripts/:sessionId

Backend
  → Verify ownership (userId matches JWT)
  → Query MongoDB for all transcripts
  → Return sorted by timestamp
```

## File Structure

```
DevProofAI/
├── src/                              # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── flashcards/
│   │   │   ├── DeckCard.tsx
│   │   │   ├── DeckGrid.tsx
│   │   │   ├── FlashcardItem.tsx
│   │   │   ├── FlashcardViewer.tsx
│   │   │   └── ProgressBar.tsx
│   │   ├── quiz/
│   │   │   ├── DeckCard.tsx
│   │   │   ├── DeckGrid.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── QuizResults.tsx
│   │   │   └── QuizSession.tsx
│   │   ├── settings/
│   │   │   ├── AppearanceSection.tsx
│   │   │   ├── DataPrivacySection.tsx
│   │   │   ├── InterviewPrefsSection.tsx
│   │   │   ├── NotificationsSection.tsx
│   │   │   ├── ProfileSection.tsx
│   │   │   ├── ResumeSection.tsx
│   │   │   └── ToggleSwitch.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── data/
│   │   ├── flashcardDecks.ts         # 500+ study flashcards
│   │   └── quizDecks.ts              # Multiple-choice quiz decks
│   ├── hooks/
│   │   ├── useInterviewWebSocket.ts  # WebSocket hook for live interviews
│   │   ├── useUserSettings.ts
│   │   └── useVoiceActivityDetection.ts
│   ├── pages/
│   │   ├── Analyzer.tsx
│   │   ├── Certificates.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Flashcards.tsx
│   │   ├── InterviewRoom.tsx
│   │   ├── InterviewSetup.tsx
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── Quiz.tsx
│   │   ├── Results.tsx
│   │   ├── Settings.tsx
│   │   └── Signup.tsx
│   ├── services/
│   │   ├── authService.ts            # Auth API client
│   │   ├── certificateGenerator.ts   # PDF certificate generation
│   │   ├── interviewService.ts       # REST API client
│   │   └── shareService.ts
│   ├── store/
│   │   └── authStore.ts              # Zustand auth store
│   ├── store.ts                      # Zustand app store
│   ├── types.ts
│   └── App.tsx
│
├── backend/                          # Node.js server
│   └── src/
│       ├── server.js                 # Express + HTTP server + WebSocket setup
│       ├── middleware/
│       │   ├── auth.js               # JWT verification middleware
│       │   └── interviewLimit.js     # Weekly interview limit enforcement
│       ├── state/
│       │   └── interviewOrchestrator.js  # xstate v5 interview state machine
│       ├── agents/
│       │   └── evaluationAgent.js    # AI evaluation agent (Gemini 2.0 Flash)
│       ├── queues/
│       │   └── evaluationQueue.js    # BullMQ queue + worker
│       ├── websocket/
│       │   └── interviewHandler.js   # WebSocket connection manager
│       ├── services/
│       │   └── geminiLiveService.js  # Gemini Live API wrapper
│       ├── routes/
│       │   ├── auth.js               # Signup, login, /me
│       │   ├── sessions.js           # Session CRUD (ownership-scoped)
│       │   ├── transcripts.js        # Transcript endpoints
│       │   ├── evaluations.js        # AI evaluation generation
│       │   ├── dashboard.js          # Dashboard stats aggregation
│       │   ├── resume.js             # Resume analysis + interview plan
│       │   └── userResume.js         # Resume upload/storage
│       ├── models/
│       │   ├── User.js               # User schema (auth, roles, limits, resume)
│       │   ├── Session.js            # Interview session schema
│       │   ├── Transcript.js         # Transcript schema
│       │   └── Evaluation.js         # QuestionEvaluation + SessionEvaluation
│       ├── scripts/
│       │   └── seedAdmin.js          # Admin account seeding
│       └── db/
│           └── connection.js         # MongoDB connection
│
├── public/
│   └── audio-processor.js            # AudioWorklet processor
├── CLAUDE.md                         # This file
└── README.md
```

## API Endpoints (Backend)

### Authentication
- `POST   /api/auth/signup` - Create account (email, password, fullName)
- `POST   /api/auth/login` - Login (returns JWT token)
- `GET    /api/auth/me` - Get current authenticated user

### Sessions (protected, ownership-scoped)
- `POST   /api/sessions/create` - Create new interview session
- `GET    /api/sessions/:id` - Get session by ID
- `PUT    /api/sessions/:id` - Update session
- `GET    /api/sessions` - List user's sessions

### Transcripts (protected, ownership-scoped)
- `GET    /api/transcripts/:sessionId` - Get all transcripts for session
- `POST   /api/transcripts` - Manually create transcript entry

### Evaluations (protected)
- `POST   /api/evaluations/:sessionId/evaluate` - Generate AI evaluation
- `GET    /api/evaluations/:sessionId` - Get existing evaluation

### Dashboard (protected)
- `GET    /api/dashboard/stats` - Aggregated user stats (sessions, scores, charts)

### Resume Analysis (protected)
- `POST   /api/resume/analyze` - AI-powered resume analysis
- `POST   /api/resume/interview-plan` - Generate interview plan from resume + JD

### User Resume (protected)
- `POST   /api/user/resume` - Upload/update stored resume
- `GET    /api/user/resume` - Get stored resume data

### WebSocket
- `ws://localhost:3002/ws/interview` - Live interview audio streaming

## Database Schema (MongoDB)

### Users Collection
```javascript
{
  email: String (unique, indexed),
  passwordHash: String,
  fullName: String,
  role: 'user' | 'admin',
  interviewsThisWeek: Number,
  weekResetDate: Date,
  resume: {
    fileName: String,
    fileType: String,
    fileData: Buffer,
    extractedText: String,
    uploadedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Sessions Collection
```javascript
{
  id: String (UUID, indexed),
  userId: String,
  status: Enum ['idle', 'setup', 'active', 'completed'],
  phase: Enum ['intro', 'behavioral', 'technical', 'coding', 'closing'],
  startTime: Date,
  endTime: Date,
  resumeData: Object,
  jobDescription: String,
  questions: [{ id, text, type, difficulty, expectedTopics, testCases, submittedCode }],
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

### QuestionEvaluations Collection
```javascript
{
  sessionId: String,
  questionId: String,
  score: Number (0-100),
  strengths: [String],
  improvements: [String],
  feedback: String,
  userTranscript: String,
  timestamp: Number,
  createdAt: Date,
  updatedAt: Date
}
// Compound unique index: (sessionId, questionId)
```

### SessionEvaluations Collection
```javascript
{
  sessionId: String (unique, indexed),
  overallScore: Number,
  scores: {
    technical: Number (0-100),
    coding: Number (0-100),
    communication: Number (0-100),
    problemSolving: Number (0-100)
  },
  strengths: [String],
  weaknesses: [String],
  improvements: [String],
  learningPath: [String],
  skillGaps: [String],
  nextSteps: [String],
  summary: String,
  skillChartUrl: String,
  certificateUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```
