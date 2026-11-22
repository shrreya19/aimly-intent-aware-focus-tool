import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate, checkRelevanceSchema, feedbackSchema } from '../middleware/validate.js';
import { evaluateRelevance, extractDomain } from '../services/relevance.js';
import {
  createFeedback,
  getFeedbackCountByDomain,
  getUserSettings,
  updateUserSettings,
} from '../services/dbService.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * POST /check-relevance
 * Analyzes whether a page is relevant to the active session goal
 */
router.post('/check-relevance', validate(checkRelevanceSchema), async (req, res, next) => {
  try {
    const { session_id, url, title, description } = req.body;
    const result = await evaluateRelevance({
      session_id,
      url,
      title,
      description,
    });

    console.log(`🎯 [Relevance Check] ${url.substring(0, 50)}... -> Score: ${result.score} | Drift: ${result.is_drift} | Method: ${result.method}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /feedback
 * Records user feedback (relevant/irrelevant) on a flagged page.
 * If 3 or more pages from the same domain are marked 'relevant',
 * automatically appends the domain to the user's allowed_domains.
 */
router.post('/feedback', validate(feedbackSchema), async (req, res, next) => {
  try {
    const { page_visit_id, domain, label } = req.body;
    const normalizedDomain = extractDomain(`http://${domain}`);

    // Store feedback record
    const feedback = await createFeedback({
      userId: req.user.id,
      pageVisitId: page_visit_id,
      domain: normalizedDomain,
      label,
    });

    let autoAllowed = false;

    // Check if domain reached >= 3 'relevant' feedback entries
    if (label === 'relevant') {
      const relevantCount = await getFeedbackCountByDomain(req.user.id, normalizedDomain, 'relevant');
      if (relevantCount >= 3) {
        const settings = await getUserSettings(req.user.id);
        const allowed = new Set(settings.allowed_domains || []);
        if (!allowed.has(normalizedDomain)) {
          allowed.add(normalizedDomain);
          await updateUserSettings(req.user.id, {
            allowed_domains: Array.from(allowed),
          });
          autoAllowed = true;
        }
      }
    }

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback,
      auto_allowed_domain: autoAllowed,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
