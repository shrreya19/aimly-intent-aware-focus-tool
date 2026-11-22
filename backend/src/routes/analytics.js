import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getWeeklyStats,
  getFocusInsights,
  getStreakData,
  getSessionReport,
} from '../services/analytics.js';
import { exportUserData, deleteUserData } from '../services/dbService.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /stats/weekly
 * Returns 7-day breakdown and deep/light/drifted minute split
 */
router.get('/stats/weekly', async (req, res, next) => {
  try {
    const stats = await getWeeklyStats(req.user.id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /insights
 * Returns top focus hour, distracting domains, streak, and weekly trend
 */
router.get('/insights', async (req, res, next) => {
  try {
    const insights = await getFocusInsights(req.user.id);
    res.json(insights);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /streak
 * Returns streak info and 12-week heatmap dataset
 */
router.get('/streak', async (req, res, next) => {
  try {
    const streak = await getStreakData(req.user.id);
    res.json(streak);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sessions/:id/report
 * Returns full report, drift timeline, and distraction analysis for a session
 */
router.get('/sessions/:id/report', async (req, res, next) => {
  try {
    const report = await getSessionReport(req.user.id, req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Session report not found' });
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /me/export
 * Privacy GDPR export of all user records
 */
router.get('/me/export', async (req, res, next) => {
  try {
    const data = await exportUserData(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /me/data
 * Wipes all user sessions, visits, and feedback
 */
router.delete('/me/data', async (req, res, next) => {
  try {
    await deleteUserData(req.user.id);
    res.json({ message: 'All personal session data and visits have been permanently deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
