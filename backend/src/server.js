import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import { createServer } from 'http';
import { connectDatabase } from './db/connection.js';
import { setupWebSocketServer } from './websocket/interviewHandler.js';
import authRouter from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';
import sessionsRouter from './routes/sessions.js';
import transcriptsRouter from './routes/transcripts.js';
import evaluationsRouter from './routes/evaluations.js';
import resumeRouter from './routes/resume.js';
import dashboardRouter from './routes/dashboard.js';
import userResumeRouter from './routes/userResume.js';
// Initialize evaluation queue worker
import './queues/evaluationQueue.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter); // Public — no auth required
app.use('/api/sessions', authMiddleware, sessionsRouter);
app.use('/api/transcripts', authMiddleware, transcriptsRouter);
app.use('/api/evaluations', authMiddleware, evaluationsRouter);
app.use('/api/resume', authMiddleware, resumeRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/user/resume', authMiddleware, userResumeRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server
setupWebSocketServer(server);

// Connect to database and start server
async function startServer() {
  try {
    await connectDatabase();

    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║                                          ║
║   🚀 DevProof Backend Server Running    ║
║                                          ║
║   HTTP Server: http://localhost:${PORT}    ║
║   WebSocket: ws://localhost:${PORT}/ws/interview ║
║                                          ║
║   Environment: ${process.env.NODE_ENV || 'development'}                ║
║                                          ║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

startServer();

// CRITICAL: Catch unhandled errors to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  // Log but don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Log but don't exit - keep server running
});
