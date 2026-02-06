import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '../models/Session.js';

const router = express.Router();

// Create a new interview session
router.post('/create', async (req, res) => {
  try {
    const { resumeData, jobDescription, questions } = req.body;

    const session = await Session.create({
      id: uuidv4(),
      status: 'setup',
      phase: 'intro',
      resumeData,
      jobDescription,
      questions,
      currentQuestionIndex: 0
    });

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get session by ID
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findOne({ id: req.params.id });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update session
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const session = await Session.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sessions (for admin/dashboard)
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
