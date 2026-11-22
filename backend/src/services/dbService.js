import { getSupabase, isUsingLiveDb, memoryStore } from '../config/supabase.js';
import crypto from 'crypto';

/**
 * Data Access Layer for Aimly.
 * Routes directly to Supabase Postgres via service role key,
 * with seamless in-memory fallback for offline/demo verification.
 */

const IS_DEMO = process.env.DEMO_MODE === 'true';

async function withTimeout(promise, ms = 3000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Database query timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

// ==========================================
// Users
// ==========================================
export async function createUser({ name, email, passwordHash }) {
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .insert({
            name,
            email: email.toLowerCase(),
            password_hash: passwordHash,
          })
          .select('id, name, email, created_at')
          .single()
      );

      if (!error && data) {
        memoryStore.users.set(data.id, { ...data, password_hash: passwordHash });
        return data;
      }
      if (error && !IS_DEMO) throw error;
    } catch (err) {
      console.warn('Supabase createUser failed, using fallback:', err.message);
      if (!IS_DEMO) throw err;
    }
  }

  // Memory Fallback
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const user = {
    id,
    name,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    points_balance: 0,
    lifetime_points: 0,
    streak_freezes: 0,
    current_streak: 0,
    longest_streak: 0,
    last_streak_date: null,
    timezone: null,
    created_at: now,
  };
  memoryStore.users.set(id, user);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    points_balance: user.points_balance,
    lifetime_points: user.lifetime_points,
    streak_freezes: user.streak_freezes,
    current_streak: user.current_streak,
    longest_streak: user.longest_streak,
    last_streak_date: user.last_streak_date,
    timezone: user.timezone,
    created_at: user.created_at,
  };
}

export async function findUserByEmail(email) {
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle()
      );

      if (!error && data) return data;
      if (error && !IS_DEMO) throw error;
    } catch (err) {
      console.warn('Supabase findUserByEmail failed, using fallback:', err.message);
      if (!IS_DEMO) throw err;
    }
  }

  // Memory Fallback
  for (const user of memoryStore.users.values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) {
      return { ...user };
    }
  }
  return null;
}

export async function findUserById(id) {
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select('id, name, email, points_balance, lifetime_points, streak_freezes, current_streak, longest_streak, last_streak_date, timezone, created_at')
          .eq('id', id)
          .maybeSingle()
      );

      if (!error && data) return data;
      if (error && !IS_DEMO) throw error;
    } catch (err) {
      console.warn('Supabase findUserById failed, using fallback:', err.message);
      if (!IS_DEMO) throw err;
    }
  }

  // Memory Fallback
  const user = memoryStore.users.get(id);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    points_balance: user.points_balance ?? 0,
    lifetime_points: user.lifetime_points ?? 0,
    streak_freezes: user.streak_freezes ?? 0,
    current_streak: user.current_streak ?? 0,
    longest_streak: user.longest_streak ?? 0,
    last_streak_date: user.last_streak_date ?? null,
    timezone: user.timezone ?? null,
    created_at: user.created_at,
  };
}

export async function updateUser(id, updates) {
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .update(updates)
          .eq('id', id)
          .select('id, name, email, points_balance, lifetime_points, streak_freezes, current_streak, longest_streak, last_streak_date, timezone, created_at')
          .single()
      );

      if (!error && data) {
        const existing = memoryStore.users.get(id) || {};
        memoryStore.users.set(id, { ...existing, ...data });
        return data;
      }
      if (error && !IS_DEMO) throw error;
    } catch (err) {
      console.warn('Supabase updateUser failed, using fallback:', err.message);
      if (!IS_DEMO) throw err;
    }
  }

  // Memory Fallback
  const existing = memoryStore.users.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  memoryStore.users.set(id, updated);
  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    points_balance: updated.points_balance ?? 0,
    lifetime_points: updated.lifetime_points ?? 0,
    streak_freezes: updated.streak_freezes ?? 0,
    current_streak: updated.current_streak ?? 0,
    longest_streak: updated.longest_streak ?? 0,
    last_streak_date: updated.last_streak_date ?? null,
    timezone: updated.timezone ?? null,
    created_at: updated.created_at,
  };
}

// ==========================================
// User Settings
// ==========================================
export async function createUserSettings(userId, settings = {}) {
  const defaults = {
    user_id: userId,
    default_mode: settings.default_mode || 'soft',
    default_duration: settings.default_duration || 25,
    sensitivity: settings.sensitivity || 'medium',
    tracking_enabled: settings.tracking_enabled ?? true,
    rewards_enabled: settings.rewards_enabled ?? true,
    allowed_domains: settings.allowed_domains || [],
    updated_at: new Date().toISOString(),
  };

  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('user_settings')
          .upsert(defaults)
          .select('*')
          .single()
      );

      if (!error && data) {
        memoryStore.user_settings.set(userId, { ...data });
        return data;
      }
      if (error && !IS_DEMO) throw error;
    } catch (err) {
      console.warn('Supabase createUserSettings failed, using fallback:', err.message);
      if (!IS_DEMO) throw err;
    }
  }

  // Memory Fallback
  memoryStore.user_settings.set(userId, { ...defaults });
  return { ...defaults };
}

export async function getUserSettings(userId) {
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      );

      if (!error && data) return data;
      if (error && !IS_DEMO) throw error;
    } catch (err) {
      console.warn('Supabase getUserSettings failed, using fallback:', err.message);
      if (!IS_DEMO) throw err;
    }
  }

  // Memory Fallback
  let settings = memoryStore.user_settings.get(userId);
  if (!settings) {
    settings = await createUserSettings(userId);
  }
  return { ...settings };
}

export async function updateUserSettings(userId, updates) {
  const updatedData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('user_settings')
          .update(updatedData)
          .eq('user_id', userId)
          .select('*')
          .single()
      );

      if (!error && data) {
        memoryStore.user_settings.set(userId, { ...data });
        return data;
      }
      if (error && !IS_DEMO) throw error;
    } catch (err) {
      console.warn('Supabase updateUserSettings failed, using fallback:', err.message);
      if (!IS_DEMO) throw err;
    }
  }

  // Memory Fallback
  const current = (await getUserSettings(userId)) || {};
  const merged = { ...current, ...updatedData };
  memoryStore.user_settings.set(userId, merged);
  return merged;
}

// ==========================================
// Sessions
// ==========================================
export async function getActiveSession(userId) {
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('sessions')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['active', 'paused'])
          .order('started_at', { ascending: false })
          .maybeSingle()
      );

      if (!error) return data || null;
      if (error && !IS_DEMO) throw error;
    } catch (err) {
      console.warn('Supabase getActiveSession failed, using fallback:', err.message);
      if (!IS_DEMO) throw err;
    }
  }

  // Memory Fallback
  for (const session of memoryStore.sessions.values()) {
    if (session.user_id === userId && (session.status === 'active' || session.status === 'paused')) {
      return { ...session };
    }
  }
  return null;
}

export async function createSession({ userId, goal, durationMinutes, mode }) {
  const sessionData = {
    user_id: userId,
    goal,
    duration_minutes: durationMinutes,
    mode: mode || 'soft',
    started_at: new Date().toISOString(),
    ended_at: null,
    paused_at: null,
    total_paused_seconds: 0,
    status: 'active',
  };

  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // Memory Fallback
  const id = crypto.randomUUID();
  const session = {
    id,
    ...sessionData,
    created_at: sessionData.started_at,
  };
  memoryStore.sessions.set(id, session);
  return { ...session };
}

export async function getSessionById(sessionId) {
  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // Memory Fallback
  const session = memoryStore.sessions.get(sessionId);
  return session ? { ...session } : null;
}

export async function updateSession(sessionId, updates) {
  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // Memory Fallback
  const session = memoryStore.sessions.get(sessionId);
  if (!session) return null;
  const updated = { ...session, ...updates };
  memoryStore.sessions.set(sessionId, updated);
  return { ...updated };
}

export async function listSessions({ userId, page = 1, limit = 10, status, mode }) {
  const offset = (page - 1) * limit;

  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    let query = supabase
      .from('sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (status) query = query.eq('status', status);
    if (mode) query = query.eq('mode', mode);

    const { data, error, count } = await query
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { sessions: data, total: count, page, limit };
  }

  // Memory Fallback
  let list = Array.from(memoryStore.sessions.values()).filter(s => s.user_id === userId);
  if (status) list = list.filter(s => s.status === status);
  if (mode) list = list.filter(s => s.mode === mode);
  list.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

  const total = list.length;
  const paged = list.slice(offset, offset + limit);
  return { sessions: paged, total, page, limit };
}

export async function getLastGoal(userId) {
  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .select('goal, duration_minutes, mode, created_at')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // Memory Fallback
  const list = Array.from(memoryStore.sessions.values())
    .filter(s => s.user_id === userId)
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

  if (list.length === 0) return null;
  const last = list[0];
  return {
    goal: last.goal,
    duration_minutes: last.duration_minutes,
    mode: last.mode,
    created_at: last.created_at || last.started_at,
  };
}

// ==========================================
// Page Visits
// ==========================================
export async function createPageVisit({
  sessionId,
  url,
  domain,
  title,
  description,
  relevanceScore,
  isDrift,
  method,
}) {
  const visitData = {
    session_id: sessionId,
    url,
    domain,
    title: title || '',
    description: description || '',
    relevance_score: relevanceScore,
    is_drift: Boolean(isDrift),
    method,
    created_at: new Date().toISOString(),
  };

  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('page_visits')
      .insert(visitData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // Memory Fallback
  const id = crypto.randomUUID();
  const visit = { id, ...visitData };
  memoryStore.page_visits.set(id, visit);
  return { ...visit };
}

export async function getPageVisitsForSession(sessionId) {
  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('page_visits')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Memory Fallback
  return Array.from(memoryStore.page_visits.values())
    .filter(v => v.session_id === sessionId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

// ==========================================
// Feedback
// ==========================================
export async function createFeedback({ userId, pageVisitId, domain, label }) {
  const feedbackData = {
    user_id: userId,
    page_visit_id: pageVisitId || null,
    domain,
    label,
    created_at: new Date().toISOString(),
  };

  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('feedback')
      .insert(feedbackData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // Memory Fallback
  const id = crypto.randomUUID();
  const fb = { id, ...feedbackData };
  memoryStore.feedback.set(id, fb);
  return { ...fb };
}

export async function getFeedbackCountByDomain(userId, domain, label = 'relevant') {
  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('domain', domain)
      .eq('label', label);

    if (error) throw error;
    return count || 0;
  }

  // Memory Fallback
  return Array.from(memoryStore.feedback.values()).filter(
    f => f.user_id === userId && f.domain === domain && f.label === label
  ).length;
}

export async function getUserRecentFeedbackStats(userId, limit = 20) {
  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('feedback')
      .select('label')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    const total = data.length;
    const relevantCount = data.filter(f => f.label === 'relevant').length;
    return { total, relevantCount };
  }

  // Memory Fallback
  const list = Array.from(memoryStore.feedback.values())
    .filter(f => f.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  return {
    total: list.length,
    relevantCount: list.filter(f => f.label === 'relevant').length,
  };
}

// ==========================================
// User Data Wipe & Export
// ==========================================
export async function exportUserData(userId) {
  const user = await findUserById(userId);
  const settings = await getUserSettings(userId);
  let sessions = [];
  let visits = [];
  let feedbacks = [];

  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { data: sessData } = await supabase.from('sessions').select('*').eq('user_id', userId);
    sessions = sessData || [];

    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length > 0) {
      const { data: visitData } = await supabase.from('page_visits').select('*').in('session_id', sessionIds);
      visits = visitData || [];
    }

    const { data: fbData } = await supabase.from('feedback').select('*').eq('user_id', userId);
    feedbacks = fbData || [];

    const { data: rData } = await supabase.from('reward_events').select('*').eq('user_id', userId);
    var rewardEvents = rData || [];
  } else {
    sessions = Array.from(memoryStore.sessions.values()).filter(s => s.user_id === userId);
    const sessionIds = new Set(sessions.map(s => s.id));
    visits = Array.from(memoryStore.page_visits.values()).filter(v => sessionIds.has(v.session_id));
    feedbacks = Array.from(memoryStore.feedback.values()).filter(f => f.user_id === userId);
    var rewardEvents = Array.from(memoryStore.reward_events.values()).filter(r => r.user_id === userId);
  }

  return {
    user,
    settings,
    sessions,
    page_visits: visits,
    feedback: feedbacks,
    reward_events: rewardEvents,
    streak: {
      current_streak: user?.current_streak || 0,
      longest_streak: user?.longest_streak || 0,
      last_streak_date: user?.last_streak_date || null,
      streak_freezes: user?.streak_freezes || 0,
    },
    exported_at: new Date().toISOString(),
  };
}

export async function deleteUserData(userId) {
  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    await supabase.from('reward_events').delete().eq('user_id', userId);
    await supabase.from('feedback').delete().eq('user_id', userId);
    await supabase.from('sessions').delete().eq('user_id', userId);
    await supabase
      .from('users')
      .update({
        points_balance: 0,
        lifetime_points: 0,
        streak_freezes: 0,
        current_streak: 0,
        longest_streak: 0,
        last_streak_date: null,
      })
      .eq('id', userId);
    return true;
  }

  // Memory Fallback
  const userSessions = Array.from(memoryStore.sessions.values()).filter(s => s.user_id === userId);
  const sessionIds = new Set(userSessions.map(s => s.id));

  for (const sId of sessionIds) {
    memoryStore.sessions.delete(sId);
  }
  for (const [vId, v] of memoryStore.page_visits.entries()) {
    if (sessionIds.has(v.session_id)) {
      memoryStore.page_visits.delete(vId);
    }
  }
  for (const [fId, f] of memoryStore.feedback.entries()) {
    if (f.user_id === userId) {
      memoryStore.feedback.delete(fId);
    }
  }
  for (const [rId, r] of memoryStore.reward_events.entries()) {
    if (r.user_id === userId) {
      memoryStore.reward_events.delete(rId);
    }
  }
  const u = memoryStore.users.get(userId);
  if (u) {
    u.points_balance = 0;
    u.lifetime_points = 0;
    u.streak_freezes = 0;
    u.current_streak = 0;
    u.longest_streak = 0;
    u.last_streak_date = null;
    memoryStore.users.set(userId, u);
  }
  return true;
}

// ==========================================
// Reward Events (Focus Rewards)
// ==========================================
export async function createRewardEvent({
  userId,
  sessionId = null,
  type,
  points,
  breakdown = {},
  breakEndsAt = null,
  createdAt = null,
}) {
  const row = {
    user_id: userId,
    session_id: sessionId,
    type,
    points,
    breakdown,
    break_ends_at: breakEndsAt,
    created_at: createdAt || new Date().toISOString(),
  };

  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase.from('reward_events').insert(row).select('*').single()
      );
      if (!error && data) {
        memoryStore.reward_events.set(data.id, data);
        return data;
      }
      if (error && !IS_DEMO) throw error;
    } catch (err) {
      console.warn('Supabase createRewardEvent failed, using fallback:', err.message);
      if (!IS_DEMO) throw err;
    }
  }

  // Memory Fallback
  const id = crypto.randomUUID();
  const event = { id, ...row };
  memoryStore.reward_events.set(id, event);
  return event;
}

export async function getSessionAwardEvent(sessionId) {
  if (!sessionId) return null;
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('reward_events')
          .select('*')
          .eq('session_id', sessionId)
          .eq('type', 'session_award')
          .maybeSingle()
      );
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getSessionAwardEvent failed, using fallback:', err.message);
    }
  }

  for (const e of memoryStore.reward_events.values()) {
    if (e.session_id === sessionId && e.type === 'session_award') {
      return e;
    }
  }
  return null;
}

export async function getRewardEventsForUser(userId, limit = 20) {
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('reward_events')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)
      );
      if (!error && data) return data;
      if (error && !IS_DEMO) throw error;
    } catch (err) {
      console.warn('Supabase getRewardEventsForUser failed, using fallback:', err.message);
      if (!IS_DEMO) throw err;
    }
  }

  return Array.from(memoryStore.reward_events.values())
    .filter(e => e.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

/**
 * Sums capped points earned on todayDateStr (session_award capped portion + task_bonus).
 * Milestone and comeback bonuses are exempt from the daily cap.
 */
export async function getTodayEarnedPoints(userId, todayDateStr) {
  let events = [];
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await withTimeout(
        supabase
          .from('reward_events')
          .select('points, type, breakdown, created_at')
          .eq('user_id', userId)
          .in('type', ['session_award', 'task_bonus'])
      );
      if (!error && data) events = data;
    } catch (err) {
      console.warn('Supabase getTodayEarnedPoints failed, using fallback:', err.message);
    }
  } else {
    events = Array.from(memoryStore.reward_events.values()).filter(
      e => e.user_id === userId && (e.type === 'session_award' || e.type === 'task_bonus')
    );
  }

  let total = 0;
  for (const e of events) {
    const eventDate = e.breakdown?.award_date || (e.created_at ? e.created_at.split('T')[0] : '');
    if (eventDate === todayDateStr) {
      const cappedPortion =
        e.type === 'session_award' && typeof e.breakdown?.awarded_points === 'number'
          ? e.breakdown.awarded_points
          : e.points;
      if (cappedPortion > 0) {
        total += cappedPortion;
      }
    }
  }
  return total;
}

export async function getActiveBreakForSession(sessionId) {
  if (!sessionId) return null;
  const nowTime = Date.now();

  let breaks = [];
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('reward_events')
        .select('*')
        .eq('session_id', sessionId)
        .eq('type', 'break_redeemed')
        .order('created_at', { ascending: false });
      breaks = data || [];
    } catch {}
  } else {
    breaks = Array.from(memoryStore.reward_events.values()).filter(
      e => e.session_id === sessionId && e.type === 'break_redeemed'
    );
  }

  for (const b of breaks) {
    if (b.break_ends_at && new Date(b.break_ends_at).getTime() > nowTime) {
      return b;
    }
  }
  return null;
}

export async function countBreaksForSession(sessionId) {
  if (!sessionId) return 0;
  if (isUsingLiveDb()) {
    try {
      const supabase = getSupabase();
      const { count } = await supabase
        .from('reward_events')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('type', 'break_redeemed');
      return count || 0;
    } catch {}
  }
  return Array.from(memoryStore.reward_events.values()).filter(
    e => e.session_id === sessionId && e.type === 'break_redeemed'
  ).length;
}
