import mongoose from 'mongoose';

// Per-question evaluation schema (for background agent)
const questionEvaluationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  questionId: {
    type: String,
    required: true,
    index: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  strengths: [{
    type: String
  }],
  improvements: [{
    type: String
  }],
  feedback: {
    type: String
  },
  userTranscript: {
    type: String
  },
  timestamp: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Compound index for efficient retrieval
questionEvaluationSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

// Final session evaluation schema (overall report)
const sessionEvaluationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  scores: {
    technical: { type: Number, min: 0, max: 100 },
    coding: { type: Number, min: 0, max: 100 },
    communication: { type: Number, min: 0, max: 100 },
    problemSolving: { type: Number, min: 0, max: 100 }
  },
  strengths: [String],
  weaknesses: [String],
  improvements: [String],
  learningPath: [String],
  skillGaps: [String],
  nextSteps: [String],
  summary: String,
  skillChartUrl: String,
  certificateUrl: String
}, {
  timestamps: true
});

export const QuestionEvaluation = mongoose.model('QuestionEvaluation', questionEvaluationSchema);
export const SessionEvaluation = mongoose.model('SessionEvaluation', sessionEvaluationSchema);
