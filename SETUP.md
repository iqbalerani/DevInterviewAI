# DevProof AI Interview - Multi-Agent Architecture Setup

## 🎯 What's New

This setup includes the **complete multi-agent architecture overhaul** with:

- ✅ **XState Orchestrator** - Backend state machine with hard locks
- ✅ **Voice Activity Detection** - Client-side VAD with 900ms end-of-utterance
- ✅ **Barge-In Support** - Instant AI interruption when user speaks
- ✅ **Background Evaluations** - Async scoring via BullMQ
- ✅ **Context Updates (No Reconnects)** - Smooth question transitions
- ✅ **Orchestrator-Enforced Locks** - Prompts can't break turn-taking

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed
- **MongoDB** running (or Docker)
- **Redis** running (for BullMQ job queue)
- **Gemini API Key** from Google AI Studio

---

## 🚀 Step-by-Step Setup

### **Step 1: Start Infrastructure Services**

#### **MongoDB (Option A - Docker)**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### **MongoDB (Option B - Homebrew)**
```bash
brew services start mongodb-community
```

#### **Redis (REQUIRED - for evaluation queue)**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

Verify Redis is running:
```bash
docker ps | grep redis
```

---

### **Step 2: Backend Setup**

```bash
cd backend
npm install
```

#### **Configure Environment**

Check `backend/.env`:
```env
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here

# Server
PORT=3002
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/devproof

# Redis (for evaluation queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
FRONTEND_URL=http://localhost:3001
```

⚠️ **Important**: Make sure `REDIS_HOST` and `REDIS_PORT` are set correctly!

#### **Start Backend**

```bash
npm run dev
```

**Expected Output:**
```
📊 Evaluation queue worker initialized
✅ WebSocket server initialized at /ws/interview
🚀 DevProof Backend Server Running
   HTTP Server: http://localhost:3002
   WebSocket: ws://localhost:3002/ws/interview
```

If you see errors about Redis connection, verify Redis is running on port 6379.

---

### **Step 3: Frontend Setup**

```bash
# In root directory
npm install
```

#### **Configure Environment**

Check `.env`:
```env
VITE_API_URL=http://localhost:3002
VITE_WS_URL=ws://localhost:3002/ws/interview
```

#### **Start Frontend**

```bash
npm run dev
```

Frontend will run on `http://localhost:3001`

---

## ✅ Testing the New System

### **Test 1: Connection Speed**

1. Navigate to `http://localhost:3001`
2. Go to "Interview Setup"
3. Upload resume + paste job description
4. Click "Generate Practice Experience"
5. Click "Join Audio Room"

**Expected**: Connection < 2 seconds (thanks to AudioWorklet preloading)

---

### **Test 2: Voice Activity Detection (VAD)**

1. Start interview
2. **Speak for 2-3 seconds**, then **stop**
3. **Wait 900ms** - should detect end-of-utterance

**Expected Console Output:**
```
🎤 User speech started
🔇 User speech ended
```

**Check**: AI should respond after you finish speaking, not interrupting mid-sentence.

---

### **Test 3: Barge-In (User Interrupts AI)**

1. While AI is speaking, **start talking**
2. AI audio should **stop immediately**

**Expected Console Output:**
```
🎤 User speech started
```

**Check**: AI audio stops < 200ms after you start speaking.

---

### **Test 4: Question Transitions**

1. Answer current question
2. Click "Next Interview Phase"

**Expected Backend Logs:**
```
📊 Starting evaluation for question <id>
🔄 Processing evaluation for session <sessionId>
📝 Context updated for session <sessionId>, question <id>
🎭 State transition: evaluating
🎭 State transition: ready
✅ Evaluation complete for question <id>: Score X/100
```

**Check**:
- No disconnect/reconnect (no "Live API: Disconnecting")
- Smooth transition to next question
- AI acknowledges with brief message (~5 words max)
- Frontend session state updates automatically

---

### **Test 5: Background Evaluation**

1. Answer a question
2. Click "Next Question"
3. Check backend console

**Expected**:
```
📊 Starting evaluation for question 1
🔄 Processing evaluation for session abc123, question 1
✅ Evaluation complete for question 1: Score 85/100
```

**Check**: Evaluation happens in background, doesn't block next question.

---

### **Test 6: Orchestrator Locks**

**Test User Audio Lock:**
1. AI is speaking
2. Try to send audio

**Expected**: Backend drops audio packets (orchestrator guard)

**Console Output:**
```
🎭 State transition: ai_speaking
```

**Test AI Output Lock:**
1. User is speaking
2. AI tries to respond

**Expected**: Backend blocks AI audio from sending to client

---

## 🐛 Troubleshooting

### **Issue: "ECONNREFUSED 127.0.0.1:6379"**

**Cause**: Redis not running

**Fix**:
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

---

### **Issue: "Live API: Disconnecting..." loop**

**Cause**: Old reconnect-based logic (should be fixed)

**Check**:
1. Verify `geminiLiveService.sendContextUpdate()` is being called (not `disconnectSession`)
2. Check backend logs for "📝 Context updated"
3. Should NOT see "🔌 Disconnected session" between questions

---

### **Issue: AI keeps interrupting me**

**Cause**: VAD threshold too low or turn-taking not enforced

**Check**:
1. Backend logs for state transitions
2. Should see: `ready → user_speaking → processing → ai_speaking`
3. Should NOT see `user_speaking` and `ai_speaking` at same time

**Fix**: Check orchestrator guards in `interviewHandler.js:119`

---

### **Issue: Evaluations not running**

**Cause**: Redis worker not initialized

**Check**:
```bash
# Backend console should show:
📊 Evaluation queue worker initialized
```

**Fix**: Ensure `backend/src/server.js` imports `./queues/evaluationQueue.js`

---

### **Issue: Audio doesn't stop when I interrupt**

**Cause**: Barge-in not working

**Check**:
1. Console should show `🎤 User speech started` when you speak
2. Backend should receive `user_speech_started` event
3. `sourcesRef.current.forEach(s => s.stop())` should execute

**Fix**: Check `useInterviewWebSocket.ts:147-153` barge-in logic

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
├─────────────────────────────────────────────────────────────┤
│  InterviewRoom.tsx                                           │
│    └─> useInterviewWebSocket (VAD + Barge-In)              │
│         └─> useVoiceActivityDetection (900ms threshold)    │
│              └─> audio-processor.js (exposes audioLevel)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js)                       │
├─────────────────────────────────────────────────────────────┤
│  WebSocket Handler                                           │
│    └─> InterviewOrchestrator (XState State Machine)        │
│         └─> Hard Locks (drop packets if state != allowed)  │
│         └─> Transition to next question                    │
│              ├─> Trigger background evaluation (BullMQ)    │
│              ├─> Update backend session (MongoDB)          │
│              └─> Send context update (NO RECONNECT)        │
│                   └─> geminiLiveService.sendContextUpdate() │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKGROUND WORKERS (Redis)                  │
├─────────────────────────────────────────────────────────────┤
│  BullMQ Queue → Evaluation Worker                           │
│    └─> EvaluationAgent (Gemini Flash Thinking)             │
│         └─> Stores to QuestionEvaluation (MongoDB)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎮 Testing Checklist

Before marking as "working", verify:

- [ ] **Connection < 2 seconds**
- [ ] **VAD detects end-of-utterance in 900ms**
- [ ] **Barge-in stops AI audio instantly**
- [ ] **Question transitions smooth (no reconnects)**
- [ ] **No AI interruptions during user speech**
- [ ] **Backend evaluations run in background**
- [ ] **Orchestrator state logs show correct flow**
- [ ] **Redis queue processes jobs successfully**

---

## 📝 Next Steps (Future Enhancements)

- **Code Execution** - Integrate Piston API for coding questions
- **Final Report Generator** - Aggregate all evaluations
- **Performance Analytics** - Charts and skill breakdown
- **Push-to-Talk** - Fallback for noisy environments

---

## 🆘 Support

If issues persist:

1. Check **all three services are running**: MongoDB, Redis, Backend
2. Review **backend console logs** for errors
3. Check **browser console** for WebSocket errors
4. Verify **environment variables** are set correctly
5. Restart all services (MongoDB, Redis, Backend, Frontend)

---

**Last Updated**: February 5, 2026
**Version**: 2.0.0 (Multi-Agent Architecture)
