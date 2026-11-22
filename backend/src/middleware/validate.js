import { z } from 'zod';

/**
 * Validation schemas with clear, plain-language error messages
 */
export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createSessionSchema = z.object({
  goal: z
    .string()
    .trim()
    .min(3, 'Goal must be at least 3 characters')
    .max(120, 'Goal cannot exceed 120 characters'),
  duration_minutes: z
    .coerce
    .number()
    .int('Duration must be a whole number')
    .min(5, 'Session duration must be at least 5 minutes')
    .max(180, 'Session duration cannot exceed 180 minutes')
    .optional(),
  mode: z.enum(['soft', 'strict'], {
    errorMap: () => ({ message: 'Mode must be either "soft" or "strict"' }),
  }).optional(),
});

export const clientDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Local date must be formatted as YYYY-MM-DD')
  .optional();

export const endSessionSchema = z.object({
  status: z.enum(['completed', 'discarded'], {
    errorMap: () => ({ message: 'Status must be either "completed" or "discarded"' }),
  }),
  client_date: clientDateSchema,
});

export const checkRelevanceSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  url: z.string().url('A valid URL is required'),
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
});

export const feedbackSchema = z.object({
  page_visit_id: z.string().uuid('Invalid page visit ID').optional(),
  domain: z.string().min(1, 'Domain is required'),
  label: z.enum(['relevant', 'irrelevant'], {
    errorMap: () => ({ message: 'Feedback label must be "relevant" or "irrelevant"' }),
  }),
});

export const redeemBreakSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
});

export const updateSettingsSchema = z.object({
  default_mode: z.enum(['soft', 'strict']).optional(),
  default_duration: z.coerce.number().int().min(5).max(180).optional(),
  sensitivity: z.enum(['low', 'medium', 'high']).optional(),
  tracking_enabled: z.boolean().optional(),
  rewards_enabled: z.boolean().optional(),
  allowed_domains: z.array(z.string()).optional(),
});

/**
 * Middleware factory for validating request bodies
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errorMessages = err.errors.map(e => e.message);
        return res.status(400).json({
          error: errorMessages[0],
          details: errorMessages,
        });
      }
      next(err);
    }
  };
}
