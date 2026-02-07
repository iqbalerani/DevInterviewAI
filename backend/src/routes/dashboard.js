import express from 'express';
import { Session } from '../models/Session.js';
import { SessionEvaluation } from '../models/Evaluation.js';

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Aggregates sessions + evaluations into a single dashboard payload.
 */
router.get('/stats', async (req, res) => {
  try {
    // Fetch sessions (filtered by user, admin sees all)
    const filter = req.user.role === 'admin' ? {} : { userId: req.user.userId };
    const sessions = await Session.find(filter).sort({ createdAt: -1 }).lean();
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const completedIds = completedSessions.map(s => s.id);

    // Bulk-fetch evaluations for completed sessions
    const evaluations = await SessionEvaluation.find({
      sessionId: { $in: completedIds }
    }).lean();

    // O(1) lookup map
    const evalMap = new Map();
    for (const ev of evaluations) {
      evalMap.set(ev.sessionId, ev);
    }

    // --- Computed stats ---

    // Average score across all evaluations
    let averageScore = 0;
    if (evaluations.length > 0) {
      const total = evaluations.reduce((sum, ev) => {
        const s = ev.scores || {};
        const avg = ((s.technical || 0) + (s.coding || 0) + (s.communication || 0) + (s.problemSolving || 0)) / 4;
        return sum + avg;
      }, 0);
      averageScore = Math.round((total / evaluations.length) * 10) / 10;
    }

    // Skill growth: avg of last 5 vs avg of prior 5 (by createdAt)
    let skillGrowth = 0;
    if (evaluations.length >= 10) {
      const sorted = [...evaluations].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const avgOf = (arr) => {
        const t = arr.reduce((sum, ev) => {
          const s = ev.scores || {};
          return sum + ((s.technical || 0) + (s.coding || 0) + (s.communication || 0) + (s.problemSolving || 0)) / 4;
        }, 0);
        return t / arr.length;
      };
      const recent5 = sorted.slice(-5);
      const prior5 = sorted.slice(-10, -5);
      skillGrowth = Math.round((avgOf(recent5) - avgOf(prior5)) * 10) / 10;
    }

    // Average duration in seconds
    let averageDuration = 0;
    const sessionsWithDuration = completedSessions.filter(s => s.startTime && s.endTime);
    if (sessionsWithDuration.length > 0) {
      const totalDuration = sessionsWithDuration.reduce((sum, s) => {
        return sum + (new Date(s.endTime) - new Date(s.startTime)) / 1000;
      }, 0);
      averageDuration = Math.round(totalDuration / sessionsWithDuration.length);
    }

    // Recent sessions with joined evaluation
    const recentSessions = sessions.slice(0, 20).map(s => ({
      id: s.id,
      status: s.status,
      createdAt: s.createdAt,
      startTime: s.startTime,
      endTime: s.endTime,
      jobDescription: s.jobDescription || '',
      questions: s.questions || [],
      evaluation: evalMap.get(s.id) || null
    }));

    // Skill progression: all evaluations sorted oldest-first
    const skillProgression = [...evaluations]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(ev => {
        const s = ev.scores || {};
        return {
          date: ev.createdAt,
          overallScore: Math.round(((s.technical || 0) + (s.coding || 0) + (s.communication || 0) + (s.problemSolving || 0)) / 4),
          technical: s.technical || 0,
          coding: s.coding || 0,
          communication: s.communication || 0,
          problemSolving: s.problemSolving || 0
        };
      });

    res.json({
      success: true,
      data: {
        totalCompleted: completedSessions.length,
        totalSessions: sessions.length,
        averageScore,
        skillGrowth,
        averageDuration,
        recentSessions,
        skillProgression
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
