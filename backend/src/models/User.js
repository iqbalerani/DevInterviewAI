import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * Compute the next Monday at 00:00 UTC from the current time.
 */
export function getNextMonday() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilMonday);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  interviewsThisWeek: {
    type: Number,
    default: 0
  },
  weekResetDate: {
    type: Date,
    default: getNextMonday
  },
  resume: {
    fileName: String,
    fileType: String,
    fileData: Buffer,
    extractedText: String,
    uploadedAt: Date
  }
}, { timestamps: true });

// Hash password before saving when modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
