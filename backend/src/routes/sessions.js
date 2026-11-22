import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate, createSessionSchema, endSessionSchema } from '../middleware/validate.js';
import {
  getActiveSession,
  createSession,
  getSessionById,
  updateSession,
  listSessions,
  getLastGoal,
  getUserSettings,
  getActiveBreakForSession,
  countBreaksForSession,
} from '../services/dbService.js';
import { getSessionReport } from '../services/analytics.js';
import { awardSessionRewards } from '../services/rewards.js';

const router = express.Router();

// All session routes require authentication
router.use(authenticateToken);

/**
 * POST /sessions
 * Start a new focus session. Only one active or paused session is allowed per user.
 */
router.post('/', validate(createSessionSchema), async (req, res, next) => {
  try {
    const existing = await getActiveSession(req.user.id);
    if (existing) {
      return res.status(409).json({
        error: 'You already have an ongoing session. Please end or discard it before starting a new one.',
        active_session: existing,
      });
    }

    const settings = await getUserSettings(req.user.id);
    const goal = req.body.goal;
    const durationMinutes = req.body.duration_minutes || settings.default_duration || 25;
    const mode = req.body.mode || settings.default_mode || 'soft';

    const session = await createSession({
      userId: req.user.id,
      goal,
      durationMinutes,
      mode,
    });

    res.status(201).json({
      message: 'Focus session started successfully',
      session,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sessions/active
 * Retrieve the current active or paused session for the user
 */
router.get('/active', async (req, res, next) => {
  try {
    const session = await getActiveSession(req.user.id);
    let activeBreak = null;
    let breaksUsed = 0;
    if (session) {
      activeBreak = await getActiveBreakForSession(session.id);
      breaksUsed = await countBreaksForSession(session.id);
    }
    res.json({
      session,
      active_break: activeBreak ? { break_ends_at: activeBreak.break_ends_at } : null,
      breaks_used: breaksUsed,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sessions/last-goal
 * Retrieve the user's most recent session goal for quick restart
 */
router.get('/last-goal', async (req, res, next) => {
  try {
    const lastSession = await getLastGoal(req.user.id);
    res.json({ last_session: lastSession });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sessions
 * Retrieve session history with optional pagination and filters
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const status = req.query.status || undefined;
    const mode = req.query.mode || undefined;

    const result = await listSessions({
      userId: req.user.id,
      page,
      limit,
      status,
      mode,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sessions/:id/pause
 * Pause an active session
 */
router.post('/:id/pause', async (req, res, next) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: `Cannot pause a session with status "${session.status}"` });
    }

    const updated = await updateSession(session.id, {
      status: 'paused',
      paused_at: new Date().toISOString(),
    });

    res.json({
      message: 'Session paused',
      session: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sessions/:id/resume
 * Resume a paused session
 */
router.post('/:id/resume', async (req, res, next) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'paused') {
      return res.status(400).json({ error: `Cannot resume a session with status "${session.status}"` });
    }

    let additionalPausedSeconds = 0;
    if (session.paused_at) {
      const pausedAt = new Date(session.paused_at).getTime();
      const now = Date.now();
      additionalPausedSeconds = Math.max(0, Math.round((now - pausedAt) / 1000));
    }

    const updated = await updateSession(session.id, {
      status: 'active',
      paused_at: null,
      total_paused_seconds: (session.total_paused_seconds || 0) + additionalPausedSeconds,
    });

    res.json({
      message: 'Session resumed',
      session: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sessions/:id/end
 * End an active or paused session (marked as completed or discarded)
 */
router.post('/:id/end', validate(endSessionSchema), async (req, res, next) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'completed' || session.status === 'discarded') {
      return res.status(400).json({ error: 'Session is already closed' });
    }

    let additionalPausedSeconds = 0;
    if (session.status === 'paused' && session.paused_at) {
      const pausedAt = new Date(session.paused_at).getTime();
      const now = Date.now();
      additionalPausedSeconds = Math.max(0, Math.round((now - pausedAt) / 1000));
    }

    const updated = await updateSession(session.id, {
      status: req.body.status,
      ended_at: new Date().toISOString(),
      paused_at: null,
      total_paused_seconds: (session.total_paused_seconds || 0) + additionalPausedSeconds,
    });

    let reward = null;
    if (req.body.status === 'completed') {
      try {
        const report = await getSessionReport(req.user.id, updated.id);
        const clientDate = req.body.client_date || req.headers['x-client-date'] || null;
        const clientTimezone = req.headers['x-client-timezone'] || null;
        const rewardResult = await awardSessionRewards({
          userId: req.user.id,
          session: updated,
          focusScore: report?.focus_score ?? 100,
          longestStretchMinutes: report?.longest_on_goal_stretch_minutes ?? (updated.duration_minutes || 25),
          clientDate,
          clientTimezone,
        });
        reward = rewardResult.reward;
      } catch (rewardErr) {
        console.warn('Session reward computation skipped:', rewardErr.message);
      }
    }

    res.json({
      message: `Session marked as ${req.body.status}`,
      session: updated,
      reward,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
