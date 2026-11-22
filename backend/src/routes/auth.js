import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { validate, signupSchema, loginSchema } from '../middleware/validate.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  createUserSettings,
  getUserSettings,
} from '../services/dbService.js';
import { evaluateStreakRollover } from '../services/rewards.js';
import { seedDemoData } from '../seed.js';

const router = express.Router();

// Rate limiter for auth endpoints (relaxed in development/demo)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 500,
  message: { error: 'Too many authentication attempts. Please try again after a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /auth/signup
 * Register a new user and generate default settings
 */
router.post('/signup', authRateLimiter, validate(signupSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await createUser({
      name,
      email,
      passwordHash,
    });

    // Create default settings for user
    const settings = await createUserSettings(user.id);

    const token = generateToken({ id: user.id, email: user.email });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        settings,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login
 * Authenticate existing user with email and password
 */
router.post('/login', authRateLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    let user = await findUserByEmail(email);
    if (!user && email.toLowerCase() === 'demo@aimly.app') {
      console.log('🌱 Demo account requested but not in store. Auto-seeding now...');
      await seedDemoData().catch(e => console.warn('Auto-seed failed:', e.message));
      user = await findUserByEmail(email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const settings = await getUserSettings(user.id);
    const clientDate = req.headers['x-client-date'] || null;
    const clientTimezone = req.headers['x-client-timezone'] || null;
    await evaluateStreakRollover(user.id, clientDate, clientTimezone).catch(() => {});
    const freshUser = (await findUserById(user.id)) || user;
    const token = generateToken({ id: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: freshUser.id,
        name: freshUser.name,
        email: freshUser.email,
        points_balance: freshUser.points_balance || 0,
        lifetime_points: freshUser.lifetime_points || 0,
        streak_freezes: freshUser.streak_freezes || 0,
        current_streak: freshUser.current_streak || 0,
        longest_streak: freshUser.longest_streak || 0,
        timezone: freshUser.timezone || null,
        settings,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Retrieve authenticated user profile and settings
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const clientDate = req.headers['x-client-date'] || null;
    const clientTimezone = req.headers['x-client-timezone'] || null;
    await evaluateStreakRollover(req.user.id, clientDate, clientTimezone).catch(() => {});
    const fullUser = await findUserById(req.user.id);
    const settings = await getUserSettings(req.user.id);
    res.json({
      user: {
        id: fullUser?.id || req.user.id,
        name: fullUser?.name || req.user.name,
        email: fullUser?.email || req.user.email,
        points_balance: fullUser?.points_balance || 0,
        lifetime_points: fullUser?.lifetime_points || 0,
        streak_freezes: fullUser?.streak_freezes || 0,
        current_streak: fullUser?.current_streak || 0,
        longest_streak: fullUser?.longest_streak || 0,
        timezone: fullUser?.timezone || null,
        settings,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
