-- ==============================================================================
-- Aimly Database Schema
-- Supabase (PostgreSQL) Schema Definition
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Users Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    points_balance INT NOT NULL DEFAULT 0,
    lifetime_points INT NOT NULL DEFAULT 0,
    streak_freezes INT NOT NULL DEFAULT 0 CHECK (streak_freezes >= 0 AND streak_freezes <= 2),
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_streak_date DATE NULL,
    timezone TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on email for quick lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ------------------------------------------------------------------------------
-- 2. User Settings Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_mode TEXT NOT NULL DEFAULT 'soft' CHECK (default_mode IN ('soft', 'strict')),
    default_duration INT NOT NULL DEFAULT 25 CHECK (default_duration >= 5 AND default_duration <= 180),
    sensitivity TEXT NOT NULL DEFAULT 'medium' CHECK (sensitivity IN ('low', 'medium', 'high')),
    tracking_enabled BOOLEAN NOT NULL DEFAULT true,
    rewards_enabled BOOLEAN NOT NULL DEFAULT true,
    allowed_domains TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. Sessions Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 180),
    mode TEXT NOT NULL DEFAULT 'soft' CHECK (mode IN ('soft', 'strict')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    total_paused_seconds INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'discarded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for session queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

-- ------------------------------------------------------------------------------
-- 4. Page Visits Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    title TEXT,
    description TEXT,
    relevance_score FLOAT NOT NULL,
    is_drift BOOLEAN NOT NULL DEFAULT false,
    method TEXT NOT NULL CHECK (method IN ('model', 'keyword', 'rule', 'allowed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for page visits
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_domain ON page_visits(domain);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_is_drift ON page_visits(is_drift);

-- ------------------------------------------------------------------------------
-- 5. Feedback Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page_visit_id UUID REFERENCES page_visits(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    label TEXT NOT NULL CHECK (label IN ('relevant', 'irrelevant')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_domain ON feedback(domain);
CREATE INDEX IF NOT EXISTS idx_feedback_page_visit_id ON feedback(page_visit_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- ------------------------------------------------------------------------------
-- 6. Reward Events Table (Focus Rewards)
-- ------------------------------------------------------------------------------
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

-- Indexes for reward events
CREATE INDEX IF NOT EXISTS idx_reward_events_user_created ON reward_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reward_events_session_id ON reward_events(session_id);
