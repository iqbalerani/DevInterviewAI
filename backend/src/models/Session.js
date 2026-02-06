import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  id: String,
  text: String,
  type: {
    type: String,
    enum: ['behavioral', 'technical', 'coding']
  },
  difficulty: {
    type: String,
    enum: ['junior', 'mid', 'senior']
  },
  expectedTopics: [String],
  testCases: [{
    input: String,
    expectedOutput: String
  }],
  submittedCode: { type: String, default: '' },
  codeLanguage: { type: String, default: 'python' }
});

const sessionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: String,
  status: {
    type: String,
    enum: ['idle', 'setup', 'active', 'completed'],
    default: 'idle'
  },
  phase: {
    type: String,
    enum: ['intro', 'behavioral', 'technical', 'coding', 'closing'],
    default: 'intro'
  },
  startTime: Date,
  endTime: Date,
  resumeData: mongoose.Schema.Types.Mixed,
  jobDescription: String,
  questions: [questionSchema],
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  hintsUsed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export const Session = mongoose.model('Session', sessionSchema);
