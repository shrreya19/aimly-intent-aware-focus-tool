import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate, redeemBreakSchema, clientDateSchema } from '../middleware/validate.js';
import {
  getRewardsSummary,
  buyStreakFreeze,
  redeemBreak,
} from '../services/rewards.js';
import { getRewardEventsForUser, getUserSettings } from '../services/dbService.js';

const router = express.Router();

router.use(authenticateToken);

function extractValidatedClientDate(req) {
  const raw = req.query.date || req.headers['x-client-date'] || undefined;
  if (!raw) return null;
  const parsed = clientDateSchema.safeParse(raw);
  if (!parsed.success) {
    const err = new Error('Invalid local date format. Expected YYYY-MM-DD.');
    err.status = 400;
    throw err;
  }
  return parsed.data || null;
}

/**
 * GET /rewards/summary
 * Returns points balances, level progress, daily cap info, streak stats, and streak_at_risk flag
 */
router.get('/summary', async (req, res, next) => {
  try {
    const clientDate = extractValidatedClientDate(req);
    const clientTimezone = req.headers['x-client-timezone'] || null;
    const summary = await getRewardsSummary(req.user.id, clientDate, clientTimezone);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /rewards/history?limit=20
 * Returns recent reward events for user
 */
router.get('/history', async (req, res, next) => {
  try {
    const settings = await getUserSettings(req.user.id);
    if (settings && settings.rewards_enabled === false) {
      return res.json({ rewards_enabled: false, events: [] });
    }
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const events = await getRewardEventsForUser(req.user.id, limit);
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /rewards/buy-freeze
 * Purchase 1 streak freeze for 250 points (max 2 held)
 */
router.post('/buy-freeze', async (req, res, next) => {
  try {
    const result = await buyStreakFreeze(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /rewards/redeem-break
 * Redeem 100 points for a 5-minute break during an active focus session
 */
router.post('/redeem-break', validate(redeemBreakSchema), async (req, res, next) => {
  try {
    const result = await redeemBreak(req.user.id, req.body.session_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

