import { REWARDS_CONFIG } from '../config/rewards.config.js';
import {
  findUserById,
  updateUser,
  getUserSettings,
  createRewardEvent,
  getSessionAwardEvent,
  getTodayEarnedPoints,
  countBreaksForSession,
  getActiveBreakForSession,
  getSessionById,
} from './dbService.js';
import { getLocalTodayString, daysBetween, addDays } from '../utils/dateUtils.js';

/**
 * Returns Level info based on lifetime_points (never decreases)
 */
export function getLevelInfo(lifetimePoints = 0) {
  const safePoints = Math.max(0, lifetimePoints || 0);
  const levels = REWARDS_CONFIG.LEVELS;
  let currentLevel = levels[0];
  let nextLevel = null;

  for (let i = 0; i < levels.length; i++) {
    if (safePoints >= levels[i].minLifetimePoints) {
      currentLevel = levels[i];
      nextLevel = levels[i + 1] || null;
    } else {
      break;
    }
  }

  let progressToNext = 100;
  let pointsToNext = 0;

  if (nextLevel) {
    const range = nextLevel.minLifetimePoints - currentLevel.minLifetimePoints;
    const currentInRange = safePoints - currentLevel.minLifetimePoints;
    progressToNext = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
    pointsToNext = Math.max(0, nextLevel.minLifetimePoints - safePoints);
  }

  return {
    level: currentLevel.name,
    next_level: nextLevel ? nextLevel.name : null,
    progress_to_next: progressToNext,
    points_to_next: pointsToNext,
    lifetime_points: safePoints,
  };
}

/**
 * Calculate focus-quality multiplier, streak multiplier, and capped combined multiplier (max x2.0)
 */
export function getMultipliers(focusScore, currentStreak) {
  let focusMult = 1.0;
  for (const item of REWARDS_CONFIG.FOCUS_MULTIPLIERS) {
    if (focusScore >= item.minScore) {
      focusMult = item.multiplier;
      break;
    }
  }

  let streakMult = 1.0;
  for (const item of REWARDS_CONFIG.STREAK_MULTIPLIERS) {
    if (currentStreak >= item.minDays) {
      streakMult = item.multiplier;
      break;
    }
  }

  const combined = Math.min(
    REWARDS_CONFIG.MAX_COMBINED_MULTIPLIER,
    Math.round(focusMult * streakMult * 100) / 100
  );

  return {
    focus_multiplier: focusMult,
    streak_multiplier: streakMult,
    combined_multiplier: combined,
  };
}

/**
 * Compute active focus minutes excluding paused time.
 * Paused time is never counted as on-topic time.
 */
export function computeActiveFocusMinutes(session) {
  const planned = session.duration_minutes || 0;
  const pausedMins = (session.total_paused_seconds || 0) / 60;

  if (session.started_at && session.ended_at) {
    const wallMins = Math.max(
      0,
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000
    );
    if (wallMins >= planned) {
      return Math.min(planned, Math.max(0, Math.round(wallMins - pausedMins)));
    }
  }
  return Math.max(0, Math.round(planned - pausedMins));
}

/**
 * Pure calculation for session base points, multipliers, deep-stretch bonus, and daily cap clamping
 */
export function calculateSessionRewardBreakdown({
  activeMinutes,
  focusScore,
  longestStretchMinutes = 0,
  currentStreak = 0,
  todayEarnedSoFar = 0,
}) {
  if (activeMinutes < REWARDS_CONFIG.QUALIFYING_MIN_DURATION) {
    return {
      on_topic_minutes: 0,
      base_points: 0,
      focus_score: focusScore,
      focus_multiplier: 1.0,
      streak_multiplier: 1.0,
      combined_multiplier: 1.0,
      multiplied_points: 0,
      deep_stretch_bonus: 0,
      uncapped_points: 0,
      awarded_points: 0,
      was_clamped: false,
      daily_cap: REWARDS_CONFIG.DAILY_CAP,
    };
  }

  const { focus_multiplier, streak_multiplier, combined_multiplier } = getMultipliers(
    focusScore,
    currentStreak
  );

  const onTopicMinutes = Math.max(0, Math.round(activeMinutes * (focusScore / 100)));
  const basePoints = REWARDS_CONFIG.POINTS_PER_ON_TOPIC_MINUTE * onTopicMinutes;
  const multipliedPoints = Math.round(basePoints * combined_multiplier);
  const deepStretchBonus =
    longestStretchMinutes >= REWARDS_CONFIG.DEEP_STRETCH_MIN_MINUTES
      ? REWARDS_CONFIG.DEEP_STRETCH_BONUS
      : 0;

  const uncappedPoints = multipliedPoints + deepStretchBonus;
  const availableCap = Math.max(0, REWARDS_CONFIG.DAILY_CAP - todayEarnedSoFar);
  const awardedPoints = Math.min(uncappedPoints, availableCap);
  const wasClamped = uncappedPoints > availableCap;

  return {
    on_topic_minutes: onTopicMinutes,
    base_points: basePoints,
    focus_score: focusScore,
    focus_multiplier,
    streak_multiplier,
    combined_multiplier,
    multiplied_points: multipliedPoints,
    deep_stretch_bonus: deepStretchBonus,
    uncapped_points: uncappedPoints,
    awarded_points: awardedPoints,
    was_clamped: wasClamped,
    daily_cap: REWARDS_CONFIG.DAILY_CAP,
  };
}

/**
 * Lazy, idempotent streak rollover check.
 * Evaluates missed calendar days, auto-consumes freezes if available, or resets streak to 0.
 * Calling twice on the same day never consumes a second freeze.
 */
export async function evaluateStreakRollover(userId, clientDate = null, clientTimezone = null) {
  let user = await findUserById(userId);
  if (!user) return null;

  // Persist user's timezone if sent and not yet stored
  if (clientTimezone && user.timezone !== clientTimezone) {
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: clientTimezone });
      user = await updateUser(user.id, { timezone: clientTimezone });
    } catch {
      // Ignore invalid timezone strings
    }
  }

  const todayStr = getLocalTodayString(clientDate, user.timezone);

  if (!user.last_streak_date || (user.current_streak || 0) === 0) {
    return {
      user,
      current_streak: user.current_streak || 0,
      streak_at_risk: false,
      freezes_used: 0,
      broken_streak: false,
    };
  }

  const daysDiff = daysBetween(user.last_streak_date, todayStr);

  // Completed today or ahead due to timezone travel -> streak intact, not at risk
  if (daysDiff <= 0) {
    return {
      user,
      current_streak: user.current_streak,
      streak_at_risk: false,
      freezes_used: 0,
      broken_streak: false,
    };
  }

  // Completed yesterday -> streak intact, at risk if streak >= 3
  if (daysDiff === 1) {
    const atRisk = user.current_streak >= REWARDS_CONFIG.STREAK_AT_RISK_MIN_DAYS;
    return {
      user,
      current_streak: user.current_streak,
      streak_at_risk: atRisk,
      freezes_used: 0,
      broken_streak: false,
    };
  }

  // Missed at least one calendar day (daysDiff >= 2)
  const missedDays = daysDiff - 1;

  if ((user.streak_freezes || 0) >= missedDays) {
    // Auto-consume freezes to bridge missed day(s) up to yesterday
    const bridgedTo = addDays(todayStr, -1);
    const updatedUser = await updateUser(user.id, {
      streak_freezes: user.streak_freezes - missedDays,
      last_streak_date: bridgedTo,
    });

    for (let i = 1; i <= missedDays; i++) {
      const bridgedDate = addDays(user.last_streak_date, i);
      await createRewardEvent({
        userId: user.id,
        type: 'freeze_used',
        points: 0,
        breakdown: {
          bridged_date: bridgedDate,
          remaining_freezes: updatedUser.streak_freezes,
          streak_preserved: updatedUser.current_streak,
        },
      });
    }

    const atRisk = updatedUser.current_streak >= REWARDS_CONFIG.STREAK_AT_RISK_MIN_DAYS;
    return {
      user: updatedUser,
      current_streak: updatedUser.current_streak,
      streak_at_risk: atRisk,
      freezes_used: missedDays,
      broken_streak: false,
    };
  }

  // Insufficient freezes -> streak resets to 0 (never deduct points)
  const updatedUser = await updateUser(user.id, {
    current_streak: 0,
    last_streak_date: null,
  });

  return {
    user: updatedUser,
    current_streak: 0,
    streak_at_risk: false,
    freezes_used: 0,
    broken_streak: true,
  };
}

/**
 * Process Session Completion Rewards (Server-authoritative, Idempotent per session_id)
 */
export async function awardSessionRewards({
  userId,
  session,
  focusScore,
  longestStretchMinutes = 0,
  clientDate = null,
  clientTimezone = null,
}) {
  const settings = await getUserSettings(userId);
  if (settings && settings.rewards_enabled === false) {
    return { points_earned: 0, reward: null };
  }

  // Idempotency guard: if this session already received a session_award, return it without re-awarding
  const existingAward = await getSessionAwardEvent(session.id);
  if (existingAward) {
    const user = await findUserById(userId);
    return {
      points_earned: existingAward.points,
      reward: {
        points_earned: existingAward.points,
        points_balance: user?.points_balance || 0,
        lifetime_points: user?.lifetime_points || 0,
        new_streak: user?.current_streak || 0,
        longest_streak: user?.longest_streak || 0,
        milestones_hit: existingAward.breakdown?.milestones_hit || [],
        comeback: Boolean(existingAward.breakdown?.comeback),
        breakdown: existingAward.breakdown || {},
      },
    };
  }

  const activeMinutes = computeActiveFocusMinutes(session);

  // Discarded sessions or sessions < 10 active minutes earn 0 points
  if (session.status !== 'completed' || activeMinutes < REWARDS_CONFIG.QUALIFYING_MIN_DURATION) {
    return { points_earned: 0, reward: null };
  }

  // Run idempotent rollover check before updating streak
  const rollover = await evaluateStreakRollover(userId, clientDate, clientTimezone);
  const currentUser = rollover?.user || (await findUserById(userId));
  const todayStr = getLocalTodayString(clientDate, currentUser.timezone);

  // Qualifying streak day: activeMinutes >= 10 AND focusScore >= 60%
  const isQualifying =
    activeMinutes >= REWARDS_CONFIG.QUALIFYING_MIN_DURATION &&
    focusScore >= REWARDS_CONFIG.QUALIFYING_MIN_FOCUS_SCORE;

  // Comeback bonus: after a broken streak (current_streak === 0 while longest_streak > 0), first qualifying session gets +75 (exempt from cap)
  let comebackBonus = 0;
  if (isQualifying && (currentUser.current_streak || 0) === 0 && (currentUser.longest_streak || 0) > 0) {
    comebackBonus = REWARDS_CONFIG.COMEBACK_BONUS;
  }

  // Streak progression & milestone check
  let newStreak = currentUser.current_streak || 0;
  let newLongestStreak = currentUser.longest_streak || 0;
  let milestoneBonus = 0;
  const milestonesHit = [];

  if (isQualifying && currentUser.last_streak_date !== todayStr) {
    newStreak = (currentUser.current_streak || 0) + 1;
    newLongestStreak = Math.max(newLongestStreak, newStreak);

    if (REWARDS_CONFIG.MILESTONE_BONUSES[newStreak]) {
      milestoneBonus = REWARDS_CONFIG.MILESTONE_BONUSES[newStreak];
      milestonesHit.push({
        days: newStreak,
        bonus: milestoneBonus,
      });
    }
  }

  // Calculate base + multipliers + deep-stretch + daily cap clamping
  // Streak multiplier uses the streak level active for this session
  const effectiveStreakForMultiplier = Math.max(currentUser.current_streak || 0, newStreak);
  const todayEarnedSoFar = await getTodayEarnedPoints(userId, todayStr);
  const baseBreakdown = calculateSessionRewardBreakdown({
    activeMinutes,
    focusScore,
    longestStretchMinutes: Math.min(longestStretchMinutes, activeMinutes),
    currentStreak: effectiveStreakForMultiplier,
    todayEarnedSoFar,
  });

  // Total earned = capped session award + cap-exempt milestone + cap-exempt comeback
  const totalPointsEarned = baseBreakdown.awarded_points + milestoneBonus + comebackBonus;

  const updatedUser = await updateUser(userId, {
    points_balance: (currentUser.points_balance || 0) + totalPointsEarned,
    lifetime_points: (currentUser.lifetime_points || 0) + totalPointsEarned,
    current_streak: newStreak,
    longest_streak: newLongestStreak,
    ...(isQualifying ? { last_streak_date: todayStr } : {}),
  });

  const breakdown = {
    ...baseBreakdown,
    award_date: todayStr,
    active_minutes: activeMinutes,
    milestone_bonus: milestoneBonus,
    milestones_hit: milestonesHit,
    comeback_bonus: comebackBonus,
    comeback: comebackBonus > 0,
    encouraging_copy: comebackBonus > 0 ? REWARDS_CONFIG.COMEBACK_COPY : null,
  };

  await createRewardEvent({
    userId,
    sessionId: session.id,
    type: 'session_award',
    points: baseBreakdown.awarded_points,
    breakdown,
  });

  if (milestoneBonus > 0) {
    await createRewardEvent({
      userId,
      sessionId: session.id,
      type: 'streak_milestone',
      points: milestoneBonus,
      breakdown: { days: newStreak, bonus: milestoneBonus, award_date: todayStr },
    });
  }

  if (comebackBonus > 0) {
    await createRewardEvent({
      userId,
      sessionId: session.id,
      type: 'comeback_bonus',
      points: comebackBonus,
      breakdown: { bonus: comebackBonus, copy: REWARDS_CONFIG.COMEBACK_COPY, award_date: todayStr },
    });
  }

  return {
    points_earned: totalPointsEarned,
    reward: {
      points_earned: totalPointsEarned,
      points_balance: updatedUser.points_balance,
      lifetime_points: updatedUser.lifetime_points,
      new_streak: newStreak,
      longest_streak: newLongestStreak,
      milestones_hit: milestonesHit,
      comeback: comebackBonus > 0,
      breakdown,
    },
  };
}

/**
 * Buy 1 Streak Freeze (250 pts, max 2 held)
 */
export async function buyStreakFreeze(userId) {
  const settings = await getUserSettings(userId);
  if (settings && settings.rewards_enabled === false) {
    const err = new Error('Focus rewards are currently disabled in settings.');
    err.status = 400;
    throw err;
  }

  const user = await findUserById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if ((user.streak_freezes || 0) >= REWARDS_CONFIG.MAX_STREAK_FREEZES) {
    const err = new Error(
      `You already hold the maximum of ${REWARDS_CONFIG.MAX_STREAK_FREEZES} streak freezes.`
    );
    err.status = 400;
    throw err;
  }

  const cost = REWARDS_CONFIG.STREAK_FREEZE_COST;
  if ((user.points_balance || 0) < cost) {
    const err = new Error(
      `Insufficient points balance. A streak freeze costs ${cost} points (you have ${user.points_balance || 0}).`
    );
    err.status = 400;
    throw err;
  }

  const updatedUser = await updateUser(user.id, {
    points_balance: user.points_balance - cost,
    streak_freezes: (user.streak_freezes || 0) + 1,
  });

  await createRewardEvent({
    userId: user.id,
    type: 'freeze_purchased',
    points: -cost,
    breakdown: { cost, new_total: updatedUser.streak_freezes },
  });

  return {
    success: true,
    message: 'Streak freeze acquired! It will automatically protect your streak if you miss a day.',
    streak_freezes: updatedUser.streak_freezes,
    points_balance: updatedUser.points_balance,
  };
}

/**
 * Redeem 100 pts for a 5-minute Earn-a-Break during an active session (max 2 per session)
 */
export async function redeemBreak(userId, sessionId) {
  const settings = await getUserSettings(userId);
  if (settings && settings.rewards_enabled === false) {
    const err = new Error('Focus rewards are currently disabled in settings.');
    err.status = 400;
    throw err;
  }

  const user = await findUserById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const session = await getSessionById(sessionId);
  if (!session || session.user_id !== userId) {
    const err = new Error('Active focus session not found.');
    err.status = 404;
    throw err;
  }

  if (session.status !== 'active') {
    const err = new Error(
      `Breaks can only be redeemed during an active session (current status: ${session.status}).`
    );
    err.status = 400;
    throw err;
  }

  const activeBreak = await getActiveBreakForSession(session.id);
  if (activeBreak) {
    const err = new Error('A focus break is already active for this session.');
    err.status = 400;
    throw err;
  }

  const breaksUsed = await countBreaksForSession(session.id);
  if (breaksUsed >= REWARDS_CONFIG.MAX_BREAKS_PER_SESSION) {
    const err = new Error(
      `Maximum of ${REWARDS_CONFIG.MAX_BREAKS_PER_SESSION} breaks allowed per session.`
    );
    err.status = 400;
    throw err;
  }

  const cost = REWARDS_CONFIG.EARN_A_BREAK_COST;
  if ((user.points_balance || 0) < cost) {
    const err = new Error(
      `Insufficient points balance. A 5-minute break costs ${cost} points (you have ${user.points_balance || 0}).`
    );
    err.status = 400;
    throw err;
  }

  const breakEndsAt = new Date(
    Date.now() + REWARDS_CONFIG.EARN_A_BREAK_DURATION_MINUTES * 60 * 1000
  ).toISOString();

  const updatedUser = await updateUser(user.id, {
    points_balance: user.points_balance - cost,
  });

  await createRewardEvent({
    userId: user.id,
    sessionId: session.id,
    type: 'break_redeemed',
    points: -cost,
    breakdown: {
      cost,
      duration_minutes: REWARDS_CONFIG.EARN_A_BREAK_DURATION_MINUTES,
      breaks_used: breaksUsed + 1,
    },
    breakEndsAt,
  });

  return {
    success: true,
    message: '5-minute guilt-free break activated! Drift warnings are paused.',
    break_ends_at: breakEndsAt,
    duration_minutes: REWARDS_CONFIG.EARN_A_BREAK_DURATION_MINUTES,
    breaks_used: breaksUsed + 1,
    points_balance: updatedUser.points_balance,
  };
}

/**
 * Returns full rewards summary (respects rewards_enabled)
 */
export async function getRewardsSummary(userId, clientDate = null, clientTimezone = null) {
  const settings = await getUserSettings(userId);
  const rollover = await evaluateStreakRollover(userId, clientDate, clientTimezone);

  if (settings && settings.rewards_enabled === false) {
    return {
      rewards_enabled: false,
    };
  }

  const user = rollover?.user || (await findUserById(userId));
  const todayStr = getLocalTodayString(clientDate, user?.timezone);
  const todayEarned = await getTodayEarnedPoints(userId, todayStr);
  const levelInfo = getLevelInfo(user?.lifetime_points || 0);

  return {
    rewards_enabled: true,
    points_balance: user?.points_balance || 0,
    lifetime_points: user?.lifetime_points || 0,
    level: levelInfo.level,
    next_level: levelInfo.next_level,
    progress_to_next: levelInfo.progress_to_next,
    points_to_next: levelInfo.points_to_next,
    today_earned: todayEarned,
    daily_cap: REWARDS_CONFIG.DAILY_CAP,
    current_streak: user?.current_streak || 0,
    longest_streak: user?.longest_streak || 0,
    streak_freezes: user?.streak_freezes || 0,
    streak_at_risk: rollover?.streak_at_risk || false,
  };
}

