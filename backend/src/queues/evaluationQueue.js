import { Queue, Worker } from 'bullmq';
import { evaluationAgent } from '../agents/evaluationAgent.js';
import { Session } from '../models/Session.js';
import { Transcript } from '../models/Transcript.js';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;

const hasRedisConfig = REDIS_URL || (REDIS_HOST && REDIS_HOST !== 'localhost') || false;

let evaluationQueue = null;
let worker = null;

if (hasRedisConfig) {
  const connection = REDIS_URL
    ? { url: REDIS_URL }
    : { host: REDIS_HOST, port: parseInt(REDIS_PORT || '6379') };

  // Create evaluation queue
  evaluationQueue = new Queue('evaluation', { connection });

  // Worker to process evaluation jobs
  worker = new Worker('evaluation', async (job) => {
    const { sessionId, questionId } = job.data;

    console.log(`🔄 Processing evaluation for session ${sessionId}, question ${questionId}`);

    try {
      const session = await Session.findOne({ id: sessionId });
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const question = session.questions.find(q => q.id === questionId);
      if (!question) {
        throw new Error(`Question ${questionId} not found in session`);
      }

      const transcripts = await Transcript.find({ sessionId })
        .sort({ timestamp: 1 })
        .limit(50);

      const userTranscript = transcripts
        .filter(t => t.speaker === 'user')
        .map(t => t.text)
        .join(' ');

      if (!userTranscript || userTranscript.trim().length === 0) {
        console.warn(`⚠️  No user transcript found for question ${questionId}`);
        return { success: false, reason: 'No user response detected' };
      }

      const evaluation = await evaluationAgent.evaluateResponse(
        sessionId,
        question,
        userTranscript
      );

      console.log(`✅ Evaluation complete for question ${questionId}: Score ${evaluation.score}/100`);

      return {
        success: true,
        evaluation: {
          questionId: evaluation.questionId,
          score: evaluation.score,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          feedback: evaluation.feedback
        }
      };

    } catch (error) {
      console.error(`❌ Evaluation failed for session ${sessionId}, question ${questionId}:`, error);
      throw error;
    }
  }, {
    connection,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 1000
    }
  });

  worker.on('completed', (job, result) => {
    console.log(`✅ Evaluation job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Evaluation job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('❌ Worker error:', error.message);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📊 Shutting down evaluation worker...');
    await worker.close();
  });

  console.log('📊 Evaluation queue worker initialized (Redis connected)');
} else {
  console.log('📊 Evaluation queue: Redis not configured, evaluations will run inline');
}

// Fallback queue that runs evaluations directly when Redis is unavailable
const fallbackQueue = {
  async add(name, data) {
    console.log(`📊 Running inline evaluation for session ${data.sessionId}, question ${data.questionId}`);
    try {
      const session = await Session.findOne({ id: data.sessionId });
      if (!session) return;

      const question = session.questions.find(q => q.id === data.questionId);
      if (!question) return;

      const transcripts = await Transcript.find({ sessionId: data.sessionId })
        .sort({ timestamp: 1 })
        .limit(50);

      const userTranscript = transcripts
        .filter(t => t.speaker === 'user')
        .map(t => t.text)
        .join(' ');

      if (!userTranscript || userTranscript.trim().length === 0) return;

      const evaluation = await evaluationAgent.evaluateResponse(
        data.sessionId,
        question,
        userTranscript
      );

      console.log(`✅ Inline evaluation complete for question ${data.questionId}: Score ${evaluation.score}/100`);
    } catch (error) {
      console.error(`❌ Inline evaluation failed:`, error.message);
    }
  }
};

const activeQueue = evaluationQueue || fallbackQueue;

export { activeQueue as evaluationQueue, worker as evaluationWorker };
