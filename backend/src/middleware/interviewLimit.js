import { User, getNextMonday } from '../models/User.js';

export async function interviewLimitMiddleware(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    // Admin bypasses all limits
    if (user.role === 'admin') {
      req.userDoc = user;
      return next();
    }

    // Reset weekly counter if past reset date
    if (Date.now() >= new Date(user.weekResetDate).getTime()) {
      user.interviewsThisWeek = 0;
      user.weekResetDate = getNextMonday();
      await user.save();
    }

    if (user.interviewsThisWeek >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Weekly interview limit reached. Upgrade or wait for the reset.',
        limit: 5,
        used: user.interviewsThisWeek,
        resetsAt: user.weekResetDate
      });
    }

    req.userDoc = user;
    next();
  } catch (err) {
    console.error('Interview limit middleware error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
