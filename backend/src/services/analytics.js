import {
  getSessionById,
  getPageVisitsForSession,
  getSessionAwardEvent,
  getUserSettings,
} from './dbService.js';
import {
  getSupabase,
  isUsingLiveDb,
  memoryStore,
} from '../config/supabase.js';
import { REWARDS_CONFIG } from '../config/rewards.config.js';
import { evaluateStreakRollover } from './rewards.js';

/**
 * Analytics and Reporting Engine for Aimly
 */

// Helper to format Date as YYYY-MM-DD
function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// Fetch all user sessions
async function getAllUserSessions(userId) {
  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  return Array.from(memoryStore.sessions.values()).filter(s => s.user_id === userId);
}

// Fetch all visits for user's sessions in a date range
async function getUserVisits(userId, sinceDate) {
  const sessions = await getAllUserSessions(userId);
  const sessionMap = new Map(sessions.map(s => [s.id, s]));
  const sessionIds = Array.from(sessionMap.keys());

  if (sessionIds.length === 0) return [];

  let visits = [];
  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    let query = supabase.from('page_visits').select('*').in('session_id', sessionIds);
    if (sinceDate) {
      query = query.gte('created_at', sinceDate.toISOString());
    }
    const { data, error } = await query;
    if (error) throw error;
    visits = data || [];
  } else {
    visits = Array.from(memoryStore.page_visits.values()).filter(v => sessionIds.includes(v.session_id));
    if (sinceDate) {
      const sinceTime = sinceDate.getTime();
      visits = visits.filter(v => new Date(v.created_at).getTime() >= sinceTime);
    }
  }

  return visits.map(v => ({ ...v, session: sessionMap.get(v.session_id) }));
}

/**
 * 1. GET /stats/weekly
 */
export async function getWeeklyStats(userId) {
  const now = new Date();
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Initialize past 7 days (including today)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      date: formatDate(d),
      day: dayNames[d.getDay()],
      minutes: 0,
      completed: 0,
      discarded: 0,
      drift_count: 0,
      total_visits: 0,
    });
  }

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const sessions = await getAllUserSessions(userId);
  const visits = await getUserVisits(userId, sevenDaysAgo);

  const dayMap = new Map(days.map(d => [d.date, d]));

  for (const s of sessions) {
    const sDate = formatDate(new Date(s.started_at));
    const dayStat = dayMap.get(sDate);
    if (dayStat) {
      if (s.status === 'completed') {
        dayStat.completed += 1;
        dayStat.minutes += s.duration_minutes || 0;
      } else if (s.status === 'discarded') {
        dayStat.discarded += 1;
      } else if (s.status === 'active') {
        // Partial minutes for current session
        const elapsed = Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000);
        dayStat.minutes += Math.min(s.duration_minutes || 25, Math.max(0, elapsed));
      }
    }
  }

  for (const v of visits) {
    const vDate = formatDate(new Date(v.created_at));
    const dayStat = dayMap.get(vDate);
    if (dayStat) {
      dayStat.total_visits += 1;
      if (v.is_drift) {
        dayStat.drift_count += 1;
      }
    }
  }

  // Summary aggregates
  const totalMinutes = days.reduce((acc, d) => acc + d.minutes, 0);
  const completedSessions = days.reduce((acc, d) => acc + d.completed, 0);
  const discardedSessions = days.reduce((acc, d) => acc + d.discarded, 0);
  const totalDrifts = days.reduce((acc, d) => acc + d.drift_count, 0);
  const totalVisits = days.reduce((acc, d) => acc + d.total_visits, 0);

  const nonDriftVisits = Math.max(0, totalVisits - totalDrifts);
  const focusScore = totalVisits > 0 ? Math.round((nonDriftVisits / totalVisits) * 100) : 100;

  // Split into Deep / Light / Drifted minutes
  const deepMinutes = Math.round(totalMinutes * (focusScore / 100) * 0.75);
  const lightMinutes = Math.round(totalMinutes * (focusScore / 100) * 0.25);
  const driftedMinutes = Math.max(0, totalMinutes - (deepMinutes + lightMinutes));

  return {
    days,
    summary: {
      total_minutes: totalMinutes,
      completed_sessions: completedSessions,
      discarded_sessions: discardedSessions,
      total_drifts: totalDrifts,
      focus_score: focusScore,
      deep_minutes: deepMinutes,
      light_minutes: lightMinutes,
      drifted_minutes: driftedMinutes,
    },
  };
}

/**
 * 2. GET /insights
 */
export async function getFocusInsights(userId) {
  const sessions = await getAllUserSessions(userId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const visits = await getUserVisits(userId, thirtyDaysAgo);

  // Best focus hour (0-23)
  const hourMinutes = Array(24).fill(0);
  for (const s of sessions) {
    if (s.status === 'completed') {
      const hour = new Date(s.started_at).getHours();
      hourMinutes[hour] += s.duration_minutes || 0;
    }
  }

  let bestHourIndex = 10; // Default to 10 AM if no data
  let maxMinutes = -1;
  for (let h = 0; h < 24; h++) {
    if (hourMinutes[h] > maxMinutes && hourMinutes[h] > 0) {
      maxMinutes = hourMinutes[h];
      bestHourIndex = h;
    }
  }
  const ampm = bestHourIndex >= 12 ? 'PM' : 'AM';
  const displayHour = bestHourIndex % 12 === 0 ? 12 : bestHourIndex % 12;
  const bestFocusHour = `${displayHour}:00 ${ampm} - ${displayHour + 1}:00 ${ampm}`;

  // Top 5 distracting domains in the last 30 days
  const domainCounts = {};
  for (const v of visits) {
    if (v.is_drift && v.domain) {
      domainCounts[v.domain] = (domainCounts[v.domain] || 0) + 1;
    }
  }

  const topDistractingDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  // Streak calculations (reconciled with freeze-protected streak rollover)
  const rollover = await evaluateStreakRollover(userId);
  const computed = await calculateStreaks(sessions);
  const currentStreak =
    rollover?.user?.last_streak_date || rollover?.user?.current_streak > 0
      ? rollover.current_streak
      : computed.currentStreak;

  // Weekly trend vs previous week
  const now = Date.now();
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  const currentWeekMinutes = sessions
    .filter(s => s.status === 'completed' && now - new Date(s.started_at).getTime() <= msInWeek)
    .reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  const prevWeekMinutes = sessions
    .filter(
      s =>
        s.status === 'completed' &&
        now - new Date(s.started_at).getTime() > msInWeek &&
        now - new Date(s.started_at).getTime() <= 2 * msInWeek
    )
    .reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  let weeklyTrendPercent = 0;
  if (prevWeekMinutes > 0) {
    weeklyTrendPercent = Math.round(((currentWeekMinutes - prevWeekMinutes) / prevWeekMinutes) * 100);
  } else if (currentWeekMinutes > 0) {
    weeklyTrendPercent = 100;
  }

  return {
    best_focus_hour: bestFocusHour,
    top_distracting_domains: topDistractingDomains,
    current_streak: currentStreak,
    weekly_trend_percent: weeklyTrendPercent,
    current_week_minutes: currentWeekMinutes,
    previous_week_minutes: prevWeekMinutes,
  };
}

/**
 * Streak helper (extended to enforce qualifying >= 10 min completed sessions)
 */
async function calculateStreaks(sessions) {
  const activeDates = new Set();
  for (const s of sessions) {
    if (s.status === 'completed' && (s.duration_minutes || 0) >= REWARDS_CONFIG.QUALIFYING_MIN_DURATION) {
      activeDates.add(formatDate(new Date(s.started_at)));
    }
  }

  const sortedDates = Array.from(activeDates).sort();
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  for (const dateStr of sortedDates) {
    const cur = new Date(dateStr);
    if (prevDate) {
      const diffDays = Math.round((cur - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak += 1;
      } else {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }
    prevDate = cur;
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  // Current streak calculation (must include today or yesterday)
  const today = formatDate(new Date());
  const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  let currentStreak = 0;

  if (activeDates.has(today) || activeDates.has(yesterday)) {
    let checkDate = activeDates.has(today) ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000);
    while (activeDates.has(formatDate(checkDate))) {
      currentStreak += 1;
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
}

/**
 * 3. GET /streak
 * Heatmap data for last 12 weeks (84 days)
 */
export async function getStreakData(userId) {
  const sessions = await getAllUserSessions(userId);
  const rollover = await evaluateStreakRollover(userId);
  const computed = await calculateStreaks(sessions);
  const currentStreak =
    rollover?.user?.last_streak_date || rollover?.user?.current_streak > 0
      ? rollover.current_streak
      : computed.currentStreak;
  const longestStreak = Math.max(
    computed.longestStreak,
    rollover?.user?.longest_streak || 0,
    currentStreak
  );

  // 12 weeks = 84 days of heatmap entries
  const heatmap = [];
  const now = new Date();
  const dayMap = {};

  for (const s of sessions) {
    if (s.status === 'completed') {
      const dStr = formatDate(new Date(s.started_at));
      if (!dayMap[dStr]) dayMap[dStr] = { minutes: 0, count: 0 };
      dayMap[dStr].minutes += s.duration_minutes || 0;
      dayMap[dStr].count += 1;
    }
  }

  for (let i = 83; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const existing = dayMap[dateStr] || { minutes: 0, count: 0 };
    heatmap.push({
      date: dateStr,
      minutes: existing.minutes,
      sessions_count: existing.count,
    });
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    heatmap,
  };
}

/**
 * 4. GET /sessions/:id/report
 */
export async function getSessionReport(userId, sessionId) {
  const session = await getSessionById(sessionId);
  if (!session || session.user_id !== userId) {
    return null;
  }

  const visits = await getPageVisitsForSession(sessionId);

  let driftCount = 0;
  const domainDistractions = {};
  let longestStretchVisits = 0;
  let currentStretch = 0;

  for (const v of visits) {
    if (v.is_drift) {
      driftCount += 1;
      if (v.domain) {
        domainDistractions[v.domain] = (domainDistractions[v.domain] || 0) + 1;
      }
      currentStretch = 0;
    } else {
      currentStretch += 1;
      if (currentStretch > longestStretchVisits) {
        longestStretchVisits = currentStretch;
      }
    }
  }

  const totalVisits = visits.length;
  const nonDrifts = Math.max(0, totalVisits - driftCount);
  const focusScore = totalVisits > 0 ? Math.round((nonDrifts / totalVisits) * 100) : 100;

  // Approximate minutes for longest uninterrupted stretch
  const duration = session.duration_minutes || 25;
  const longestStretchMinutes = totalVisits > 0
    ? Math.round((longestStretchVisits / totalVisits) * duration)
    : duration;

  const topDistractingDomains = Object.entries(domainDistractions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  // Attach Focus Rewards breakdown if rewards_enabled
  let reward = null;
  const settings = await getUserSettings(userId);
  if (!settings || settings.rewards_enabled !== false) {
    const awardEvent = await getSessionAwardEvent(sessionId);
    if (awardEvent) {
      const b = awardEvent.breakdown || {};
      const totalPts =
        (typeof b.awarded_points === 'number' ? b.awarded_points : awardEvent.points) +
        (b.milestone_bonus || 0) +
        (b.comeback_bonus || 0);
      reward = {
        ...awardEvent,
        points: totalPts,
        breakdown: b,
      };
    }
  }

  return {
    session,
    drift_timeline: visits,
    drift_count: driftCount,
    total_visits: totalVisits,
    focus_score: focusScore,
    longest_on_goal_stretch_minutes: longestStretchMinutes,
    top_distracting_domains: topDistractingDomains,
    reward,
  };
}
