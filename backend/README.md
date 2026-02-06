# DevProof Backend Server

Production-ready Node.js/Express backend for the DevProof AI Interview Platform.

## Features

- ✅ WebSocket server for real-time audio streaming
- ✅ REST API for CRUD operations
- ✅ MongoDB persistence for sessions, transcripts, and evaluations
- ✅ Server-side Gemini Live API integration (secure API key management)
- ✅ CORS enabled for frontend communication
- ✅ Compression middleware for performance

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```
GEMINI_API_KEY=your_actual_api_key_here
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/devproof
FRONTEND_URL=http://localhost:3001
```

### 3. Start MongoDB
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or with Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Run Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will start on `http://localhost:3002`

## API Documentation

### Health Check
```
GET /health
```

### Sessions
```
POST   /api/sessions/create        - Create interview session
GET    /api/sessions/:id           - Get session by ID
PUT    /api/sessions/:id           - Update session
GET    /api/sessions               - List all sessions
```

### Transcripts
```
GET    /api/transcripts/:sessionId - Get all transcripts
POST   /api/transcripts            - Create transcript
```

### Evaluations
```
POST   /api/evaluations/:sessionId/evaluate  - Run AI evaluation
GET    /api/evaluations/:sessionId           - Get evaluation
```

### WebSocket
```
ws://localhost:3002/ws/interview
```

**Message Types:**
- `connect` - Initialize session with Gemini Live API
- `audio` - Stream audio data
- `disconnect` - End session

## Project Structure

```
backend/
├── src/
│   ├── server.js                 # Main entry point
│   ├── websocket/
│   │   └── interviewHandler.js   # WebSocket manager
│   ├── services/
│   │   └── geminiLiveService.js  # Gemini API wrapper
│   ├── routes/
│   │   ├── sessions.js
│   │   ├── transcripts.js
│   │   └── evaluations.js
│   ├── models/
│   │   ├── Session.js
│   │   ├── Transcript.js
│   │   └── Evaluation.js
│   └── db/
│       └── connection.js
├── package.json
└── .env
```

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use MongoDB Atlas or managed MongoDB instance
- [ ] Set secure CORS origin (not `*`)
- [ ] Enable HTTPS/WSS for WebSocket
- [ ] Set up process manager (PM2 recommended)
- [ ] Configure firewall rules

### PM2 Deployment
```bash
npm install -g pm2
pm2 start src/server.js --name devproof-backend
pm2 save
pm2 startup
```

## Troubleshooting

**MongoDB Connection Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
→ Ensure MongoDB is running: `brew services start mongodb-community`

**WebSocket Connection Refused:**
```
WebSocket connection failed
```
→ Check backend is running on port 3002
→ Verify `FRONTEND_URL` in backend `.env` matches frontend origin

**Gemini API Error:**
```
Live API: Error 401 Unauthorized
```
→ Verify `GEMINI_API_KEY` is correct in backend `.env`
→ Ensure billing is enabled on Google Cloud Console
