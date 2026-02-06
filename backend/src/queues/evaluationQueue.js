import { Queue, Worker } from 'bullmq';
import { evaluationAgent } from '../agents/evaluationAgent.js';
import { Session } from '../models/Session.js';
import { Transcript } from '../models/Transcript.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

// Create evaluation queue
export const evaluationQueue = new Queue('evaluation', { connection });

// Worker to process evaluation jobs
const worker = new Worker('evaluation', async (job) => {
  const { sessionId, questionId } = job.data;

  console.log(`🔄 Processing evaluation for session ${sessionId}, question ${questionId}`);

  try {
    // Fetch session and question details
    const session = await Session.findOne({ id: sessionId });
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found in session`);
    }

    // Fetch transcripts for this question
    // Note: In future, transcripts should be tagged with questionId
    // For now, we'll get the most recent transcripts since question started
    const transcripts = await Transcript.find({ sessionId })
      .sort({ timestamp: 1 })
      .limit(50); // Last 50 transcripts as context

    // Extract user responses
    const userTranscript = transcripts
      .filter(t => t.speaker === 'user')
      .map(t => t.text)
      .join(' ');

    if (!userTranscript || userTranscript.trim().length === 0) {
      console.warn(`⚠️  No user transcript found for question ${questionId}`);
      return { success: false, reason: 'No user response detected' };
    }

    // Run evaluation
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
  concurrency: 3, // Process up to 3 evaluations in parallel
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000 // Per second
  }
});

// Event handlers
worker.on('completed', (job, result) => {
  console.log(`✅ Evaluation job ${job.id} completed:`, result);
});

worker.on('failed', (job, error) => {
  console.error(`❌ Evaluation job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('❌ Worker error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📊 Shutting down evaluation worker...');
  await worker.close();
});

console.log('📊 Evaluation queue worker initialized');

export { worker as evaluationWorker };
