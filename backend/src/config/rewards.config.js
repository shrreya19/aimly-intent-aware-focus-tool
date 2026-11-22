/**
 * Centralized Configuration for Aimly Focus Rewards & Streak Protection
 * All tunable parameters live in this single file.
 */
export const REWARDS_CONFIG = {
  // Base earning & qualifying thresholds
  POINTS_PER_ON_TOPIC_MINUTE: 2,
  QUALIFYING_MIN_DURATION: 10, // minutes
  QUALIFYING_MIN_FOCUS_SCORE: 60, // percentage

  // Focus quality multipliers (evaluated top-down)
  FOCUS_MULTIPLIERS: [
    { minScore: 90, multiplier: 1.5 },
    { minScore: 75, multiplier: 1.25 },
    { minScore: 0, multiplier: 1.0 },
  ],

  // Streak multipliers (evaluated top-down)
  STREAK_MULTIPLIERS: [
    { minDays: 14, multiplier: 1.3 },
    { minDays: 7, multiplier: 1.2 },
    { minDays: 3, multiplier: 1.1 },
    { minDays: 0, multiplier: 1.0 },
  ],

  MAX_COMBINED_MULTIPLIER: 2.0,

  // Deep stretch bonus
  DEEP_STRETCH_MIN_MINUTES: 20,
  DEEP_STRETCH_BONUS: 20,

  // Daily points cap (milestone and comeback bonuses are exempt)
  DAILY_CAP: 600,

  // Streak milestone bonuses (one-time per streak, exempt from cap)
  MILESTONE_BONUSES: {
    3: 50,
    7: 150,
    14: 350,
    30: 800,
    60: 1800,
    100: 3500,
  },

  // Comeback bonus after a broken streak (exempt from cap, once per break)
  COMEBACK_BONUS: 75,
  COMEBACK_COPY: 'Welcome back! Fresh start.',

  // Streak Freeze spending & capacity
  STREAK_FREEZE_COST: 250,
  MAX_STREAK_FREEZES: 2,

  // Streak at risk threshold
  STREAK_AT_RISK_MIN_DAYS: 3,

  // Earn-a-Break spending & limits
  EARN_A_BREAK_COST: 100,
  EARN_A_BREAK_DURATION_MINUTES: 5,
  MAX_BREAKS_PER_SESSION: 2,

  // Lifetime-point levels (never decreases)
  LEVELS: [
    { name: 'Beginner', minLifetimePoints: 0 },
    { name: 'Focused', minLifetimePoints: 500 },
    { name: 'Deep Worker', minLifetimePoints: 1500 },
    { name: 'Flow Master', minLifetimePoints: 4000 },
    { name: 'Zen', minLifetimePoints: 9000 },
  ],
};

