-- ==============================================================================
-- Aimly Database Migration: Focus Rewards with Streak Protection
-- ==============================================================================

-- 1. Users Table Additions (do not alter or drop existing columns)
ALTER TABLE users ADD COLUMN IF NOT EXISTS points_balance INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_points INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freezes INT NOT NULL DEFAULT 0 CHECK (streak_freezes >= 0 AND streak_freezes <= 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_streak_date DATE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT NULL;

-- 2. User Settings Table Additions
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS rewards_enabled BOOLEAN NOT NULL DEFAULT true;

-- 3. Reward Events Table
CREATE TABLE IF NOT EXISTS reward_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('session_award','streak_milestone','comeback_bonus','break_redeemed','freeze_purchased','freeze_used','task_bonus')),
    points INT NOT NULL,
    breakdown JSONB,
    break_ends_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_events_user_created ON reward_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reward_events_session_id ON reward_events(session_id);
