import express from 'express';
import { seedDemoData } from '../seed.js';

const router = express.Router();

/**
 * POST /demo/reset
 * Re-seeds the demo account with 3 weeks of realistic data
 */
router.post('/reset', async (req, res, next) => {
  try {
    const result = await seedDemoData();
    res.json({
      message: 'Demo account reset and re-seeded successfully with 3 weeks of historical data.',
      account: 'demo@aimly.app',
      password: 'demo1234',
      result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
