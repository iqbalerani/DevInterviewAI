import express from 'express';
import jwt from 'jsonwebtoken';
import { User, getNextMonday } from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function userResponse(user) {
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    interviewsThisWeek: user.interviewsThisWeek,
    weekResetDate: user.weekResetDate,
    resume: user.resume ? {
      fileName: user.resume.fileName,
      fileType: user.resume.fileType,
      uploadedAt: user.resume.uploadedAt,
    } : null
  };
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, error: 'Email, password, and full name are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    const user = await User.create({
      email,
      passwordHash: password, // pre-save hook hashes it
      fullName
    });

    const token = signToken(user);
    res.json({ success: true, token, user: userResponse(user) });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Reset weekly counter if past reset date
    if (Date.now() >= new Date(user.weekResetDate).getTime()) {
      user.interviewsThisWeek = 0;
      user.weekResetDate = getNextMonday();
      await user.save();
    }

    const token = signToken(user);
    res.json({ success: true, token, user: userResponse(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Reset weekly counter if past reset date
    if (Date.now() >= new Date(user.weekResetDate).getTime()) {
      user.interviewsThisWeek = 0;
      user.weekResetDate = getNextMonday();
      await user.save();
    }

    res.json({ success: true, user: userResponse(user) });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
