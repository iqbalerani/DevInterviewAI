import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  speaker: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient retrieval
transcriptSchema.index({ sessionId: 1, timestamp: 1 });

export const Transcript = mongoose.model('Transcript', transcriptSchema);
