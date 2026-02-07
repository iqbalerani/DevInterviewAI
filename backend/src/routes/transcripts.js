import express from 'express';
import { Transcript } from '../models/Transcript.js';
import { Session } from '../models/Session.js';

const router = express.Router();

// Get all transcripts for a session (with ownership check)
router.get('/:sessionId', async (req, res) => {
  try {
    // Verify session ownership
    const session = await Session.findOne({ id: req.params.sessionId });
    if (session && req.user.role !== 'admin' && session.userId && session.userId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const transcripts = await Transcript.find({
      sessionId: req.params.sessionId
    }).sort({ timestamp: 1 });

    res.json({ success: true, transcripts });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a transcript entry (manual)
router.post('/', async (req, res) => {
  try {
    const { sessionId, speaker, text, timestamp } = req.body;

    const transcript = await Transcript.create({
      sessionId,
      speaker,
      text,
      timestamp: timestamp || Date.now()
    });

    res.json({ success: true, transcript });
  } catch (error) {
    console.error('Error creating transcript:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
