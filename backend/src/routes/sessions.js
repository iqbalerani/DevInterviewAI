import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '../models/Session.js';
import { interviewLimitMiddleware } from '../middleware/interviewLimit.js';

const router = express.Router();

// Create a new interview session (with weekly limit check)
router.post('/create', interviewLimitMiddleware, async (req, res) => {
  try {
    const { resumeData, jobDescription, questions } = req.body;

    const session = await Session.create({
      id: uuidv4(),
      userId: req.user.userId,
      status: 'setup',
      phase: 'intro',
      resumeData,
      jobDescription,
      questions,
      currentQuestionIndex: 0
    });

    // Increment weekly interview count
    req.userDoc.interviewsThisWeek += 1;
    await req.userDoc.save();

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get session by ID (ownership check)
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findOne({ id: req.params.id });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Ownership check (admin can access any)
    if (req.user.role !== 'admin' && session.userId && session.userId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update session (ownership check)
router.put('/:id', async (req, res) => {
  try {
    const session = await Session.findOne({ id: req.params.id });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Ownership check
    if (req.user.role !== 'admin' && session.userId && session.userId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const updates = req.body;
    const updated = await Session.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true }
    );

    res.json({ success: true, session: updated });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sessions (filtered by user, admin gets all)
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user.userId };
    const sessions = await Session.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
