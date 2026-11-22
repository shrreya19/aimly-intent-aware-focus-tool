import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate, updateSettingsSchema } from '../middleware/validate.js';
import { getUserSettings, updateUserSettings } from '../services/dbService.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /settings
 * Get current user settings
 */
router.get('/', async (req, res, next) => {
  try {
    const settings = await getUserSettings(req.user.id);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /settings
 * Update user settings
 */
router.put('/', validate(updateSettingsSchema), async (req, res, next) => {
  try {
    const updated = await updateUserSettings(req.user.id, req.body);
    res.json({
      message: 'Settings updated successfully',
      settings: updated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
