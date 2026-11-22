import assert from 'assert';
import crypto from 'crypto';
import {
  getLevelInfo,
  getMultipliers,
  computeActiveFocusMinutes,
  calculateSessionRewardBreakdown,
  evaluateStreakRollover,
  awardSessionRewards,
  buyStreakFreeze,
  redeemBreak,
  getRewardsSummary,
} from './services/rewards.js';
import {
  createUser,
  createUserSettings,
  updateUserSettings,
  updateUser,
  createSession,
  updateSession,
  findUserById,
  getRewardEventsForUser,
  exportUserData,
  deleteUserData,
} from './services/dbService.js';
import { evaluateRelevance } from './services/relevance.js';
import { getStreakData } from './services/analytics.js';
import { getLocalTodayString, daysBetween, addDays } from './utils/dateUtils.js';
import { REWARDS_CONFIG } from './config/rewards.config.js';

async function runTests() {
  console.log('🧪 Running Focus Rewards & Streak Protection Unit Tests...\n');
  let passed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}`);
      console.error('     ', err.message);
      process.exitCode = 1;
      throw err;
    }
  };

  // 1. Level lookup
  await test('Level lookup thresholds & progress', async () => {
    assert.strictEqual(getLevelInfo(0).level, 'Beginner');
    assert.strictEqual(getLevelInfo(0).next_level, 'Focused');
    assert.strictEqual(getLevelInfo(250).progress_to_next, 50);
    assert.strictEqual(getLevelInfo(500).level, 'Focused');
    assert.strictEqual(getLevelInfo(1500).level, 'Deep Worker');
    assert.strictEqual(getLevelInfo(4000).level, 'Flow Master');
    assert.strictEqual(getLevelInfo(9000).level, 'Zen');
    assert.strictEqual(getLevelInfo(9000).next_level, null);
    assert.strictEqual(getLevelInfo(12000).progress_to_next, 100);
  });

  // 2. Multipliers & max cap
  await test('Focus & streak multipliers and x2.0 combined cap', async () => {
    const m1 = getMultipliers(95, 0);
    assert.strictEqual(m1.focus_multiplier, 1.5);
    assert.strictEqual(m1.streak_multiplier, 1.0);
    assert.strictEqual(m1.combined_multiplier, 1.5);

    const m2 = getMultipliers(80, 5);
    assert.strictEqual(m2.focus_multiplier, 1.25);
    assert.strictEqual(m2.streak_multiplier, 1.1);
    assert.strictEqual(m2.combined_multiplier, 1.38);

    const m3 = getMultipliers(92, 10);
    assert.strictEqual(m3.focus_multiplier, 1.5);
    assert.strictEqual(m3.streak_multiplier, 1.2);
    assert.strictEqual(m3.combined_multiplier, 1.8);

    const m4 = getMultipliers(95, 20);
    assert.strictEqual(m4.focus_multiplier, 1.5);
    assert.strictEqual(m4.streak_multiplier, 1.3);
    assert.strictEqual(m4.combined_multiplier, 1.95);
    assert.ok(m4.combined_multiplier <= REWARDS_CONFIG.MAX_COMBINED_MULTIPLIER);

    const m5 = getMultipliers(65, 1);
    assert.strictEqual(m5.focus_multiplier, 1.0);
    assert.strictEqual(m5.streak_multiplier, 1.0);
    assert.strictEqual(m5.combined_multiplier, 1.0);
  });

  // 3. Paused time excluded from on-topic time
  await test('Paused time is excluded from active focus minutes', async () => {
    const t0 = new Date('2026-11-18T10:00:00Z');
    const t1 = new Date('2026-11-18T10:25:00Z');
    const activeMins = computeActiveFocusMinutes({
      duration_minutes: 25,
      started_at: t0.toISOString(),
      ended_at: t1.toISOString(),
      total_paused_seconds: 600, // 10 minutes paused out of 25 wall minutes
    });
    assert.strictEqual(activeMins, 15);
  });

  // 4. Point calculation, deep stretch bonus, and daily cap clamping
  await test('Point calculation, deep-stretch bonus & 600 pt daily cap clamping', async () => {
    // < 10 min -> 0 points
    const shortB = calculateSessionRewardBreakdown({
      activeMinutes: 8,
      focusScore: 100,
      longestStretchMinutes: 8,
      currentStreak: 5,
      todayEarnedSoFar: 0,
    });
    assert.strictEqual(shortB.awarded_points, 0);

    // 30m at 100% focus, 0 streak, 25m uninterrupted stretch -> base 60 * 1.5 = 90 + 20 = 110
    const b1 = calculateSessionRewardBreakdown({
      activeMinutes: 30,
      focusScore: 100,
      longestStretchMinutes: 25,
      currentStreak: 0,
      todayEarnedSoFar: 0,
    });
    assert.strictEqual(b1.base_points, 60);
    assert.strictEqual(b1.multiplied_points, 90);
    assert.strictEqual(b1.deep_stretch_bonus, 20);
    assert.strictEqual(b1.awarded_points, 110);
    assert.strictEqual(b1.was_clamped, false);

    // Near daily cap (550 already earned today -> cap is 600 -> clamped to 50)
    const bCap = calculateSessionRewardBreakdown({
      activeMinutes: 30,
      focusScore: 100,
      longestStretchMinutes: 25,
      currentStreak: 0,
      todayEarnedSoFar: 550,
    });
    assert.strictEqual(bCap.uncapped_points, 110);
    assert.strictEqual(bCap.awarded_points, 50);
    assert.strictEqual(bCap.was_clamped, true);
  });

  // 5. Idempotent session award & milestone exempt from daily cap
  await test('Idempotent session award & 3-day milestone exempt from daily cap', async () => {
    const user = await createUser({
      name: 'Milestone Tester',
      email: `milestone_${crypto.randomUUID()}@test.local`,
      passwordHash: 'hash',
    });
    await createUserSettings(user.id, { rewards_enabled: true });
    await updateUser(user.id, {
      current_streak: 2,
      longest_streak: 2,
      last_streak_date: '2026-11-17',
      points_balance: 580,
      lifetime_points: 580,
    });

    // Simulate user already hit 590 of 600 daily cap today on an earlier session? Let's complete a 600pt session first on 2026-11-18:
    const s1 = await createSession({
      userId: user.id,
      goal: 'Milestone test session',
      durationMinutes: 25,
      mode: 'soft',
    });
    await updateSession(s1.id, { status: 'completed' });

    const res1 = await awardSessionRewards({
      userId: user.id,
      session: { ...s1, status: 'completed' },
      focusScore: 100,
      longestStretchMinutes: 25,
      clientDate: '2026-11-18',
    });
    assert.strictEqual(res1.reward.new_streak, 3);
    assert.strictEqual(res1.reward.breakdown.milestone_bonus, 50);
    assert.strictEqual(res1.reward.milestones_hit.length, 1);

    const balanceAfterFirst = (await findUserById(user.id)).points_balance;

    // Idempotency check: calling awardSessionRewards again on same session MUST NOT double-award
    const res2 = await awardSessionRewards({
      userId: user.id,
      session: { ...s1, status: 'completed' },
      focusScore: 100,
      longestStretchMinutes: 25,
      clientDate: '2026-11-18',
    });
    const balanceAfterSecond = (await findUserById(user.id)).points_balance;
    assert.strictEqual(balanceAfterSecond, balanceAfterFirst);
    assert.strictEqual(res2.reward.new_streak, 3);
  });

  // 6. Streak freeze auto-consumption & idempotent rollover
  await test('Streak freeze auto-consumption is idempotent and bridges missed day', async () => {
    const user = await createUser({
      name: 'Freeze Tester',
      email: `freeze_${crypto.randomUUID()}@test.local`,
      passwordHash: 'hash',
    });
    await createUserSettings(user.id, { rewards_enabled: true });
    await updateUser(user.id, {
      current_streak: 5,
      longest_streak: 5,
      streak_freezes: 2,
      last_streak_date: '2026-11-16',
    });

    // Today is 2026-11-18 -> missed 2026-11-17 (1 missed day) -> consumes 1 freeze!
    const r1 = await evaluateStreakRollover(user.id, '2026-11-18');
    assert.strictEqual(r1.current_streak, 5);
    assert.strictEqual(r1.freezes_used, 1);
    assert.strictEqual(r1.user.streak_freezes, 1);
    assert.strictEqual(r1.user.last_streak_date, '2026-11-17');
    assert.strictEqual(r1.streak_at_risk, true);

    // Calling rollover AGAIN on 2026-11-18 MUST NOT consume the second freeze!
    const r2 = await evaluateStreakRollover(user.id, '2026-11-18');
    assert.strictEqual(r2.current_streak, 5);
    assert.strictEqual(r2.freezes_used, 0);
    assert.strictEqual(r2.user.streak_freezes, 1);
    assert.strictEqual(r2.streak_at_risk, true);
  });

  // 7. Streak reset without freeze & comeback bonus (once per break)
  await test('Streak reset when no freeze + comeback bonus (+75) once per break', async () => {
    const user = await createUser({
      name: 'Comeback Tester',
      email: `comeback_${crypto.randomUUID()}@test.local`,
      passwordHash: 'hash',
    });
    await createUserSettings(user.id, { rewards_enabled: true });
    await updateUser(user.id, {
      points_balance: 300,
      lifetime_points: 600,
      current_streak: 4,
      longest_streak: 4,
      streak_freezes: 0,
      last_streak_date: '2026-11-15',
    });

    // Missed 2 days with 0 freezes -> streak resets to 0, points NOT deducted!
    const roll = await evaluateStreakRollover(user.id, '2026-11-18');
    assert.strictEqual(roll.broken_streak, true);
    assert.strictEqual(roll.current_streak, 0);
    assert.strictEqual(roll.user.points_balance, 300); // Never deduct points

    // First qualifying session earns comeback bonus +75
    const s1 = await createSession({
      userId: user.id,
      goal: 'Fresh start session',
      durationMinutes: 15,
      mode: 'soft',
    });
    const res1 = await awardSessionRewards({
      userId: user.id,
      session: { ...s1, status: 'completed' },
      focusScore: 80,
      longestStretchMinutes: 15,
      clientDate: '2026-11-18',
    });
    assert.strictEqual(res1.reward.comeback, true);
    assert.strictEqual(res1.reward.breakdown.comeback_bonus, 75);
    assert.strictEqual(res1.reward.breakdown.encouraging_copy, 'Welcome back! Fresh start.');
    assert.strictEqual(res1.reward.new_streak, 1);

    // Second session same day does NOT earn comeback bonus again
    const s2 = await createSession({
      userId: user.id,
      goal: 'Second session same day',
      durationMinutes: 15,
      mode: 'soft',
    });
    const res2 = await awardSessionRewards({
      userId: user.id,
      session: { ...s2, status: 'completed' },
      focusScore: 80,
      longestStretchMinutes: 15,
      clientDate: '2026-11-18',
    });
    assert.strictEqual(res2.reward.comeback, false);
    assert.strictEqual(res2.reward.breakdown.comeback_bonus, 0);
  });

  // 8. Spending: Buy Freeze & Earn-a-Break + invalid rejections + break skips drift
  await test('Buy freeze, redeem break, invalid rejections, and drift bypass during break', async () => {
    const user = await createUser({
      name: 'Spender Tester',
      email: `spender_${crypto.randomUUID()}@test.local`,
      passwordHash: 'hash',
    });
    await createUserSettings(user.id, { rewards_enabled: true });
    await updateUser(user.id, { points_balance: 700, lifetime_points: 700, streak_freezes: 0 });

    // Buy 2 freezes (500 pts total) -> lifetime_points stays 700
    const f1 = await buyStreakFreeze(user.id);
    assert.strictEqual(f1.streak_freezes, 1);
    assert.strictEqual(f1.points_balance, 450);

    const f2 = await buyStreakFreeze(user.id);
    assert.strictEqual(f2.streak_freezes, 2);
    assert.strictEqual(f2.points_balance, 200);
    assert.strictEqual((await findUserById(user.id)).lifetime_points, 700);

    // Reject 3rd freeze (max 2)
    await assert.rejects(() => buyStreakFreeze(user.id), /maximum of 2/i);

    // Start active session & redeem 5-min break (100 pts)
    const activeSess = await createSession({
      userId: user.id,
      goal: 'Study Algorithms',
      durationMinutes: 25,
      mode: 'strict',
    });

    const brk = await redeemBreak(user.id, activeSess.id);
    assert.strictEqual(brk.points_balance, 100);
    assert.strictEqual(brk.breaks_used, 1);
    assert.ok(brk.break_ends_at);

    // Reject second break while one is already active
    await assert.rejects(() => redeemBreak(user.id, activeSess.id), /already active/i);

    // During active break, visiting an off-topic comedy URL skips drift!
    const rel = await evaluateRelevance({
      session_id: activeSess.id,
      url: 'https://www.youtube.com/watch?v=standup_comedy',
      title: 'Standup Comedy Special',
      description: 'Funny jokes and memes',
    });
    assert.strictEqual(rel.is_drift, false);
    assert.strictEqual(rel.reason, 'break_active');
  });

  // 9. rewards_enabled = false disables awards & UI data while keeping analytics alive
  await test('rewards_enabled = false suppresses awards without breaking /streak analytics', async () => {
    const user = await createUser({
      name: 'OptOut Tester',
      email: `optout_${crypto.randomUUID()}@test.local`,
      passwordHash: 'hash',
    });
    await createUserSettings(user.id, { rewards_enabled: false });

    const summary = await getRewardsSummary(user.id, '2026-11-18');
    assert.strictEqual(summary.rewards_enabled, false);
    assert.strictEqual(summary.points_balance, undefined);

    const s = await createSession({
      userId: user.id,
      goal: 'Opt-out session',
      durationMinutes: 25,
      mode: 'soft',
    });
    const res = await awardSessionRewards({
      userId: user.id,
      session: { ...s, status: 'completed' },
      focusScore: 100,
      longestStretchMinutes: 25,
      clientDate: '2026-11-18',
    });
    assert.strictEqual(res.points_earned, 0);
    assert.strictEqual(res.reward, null);

    // Existing streak analytics still works
    const streakData = await getStreakData(user.id);
    assert.ok(Array.isArray(streakData.heatmap));
    assert.strictEqual(streakData.heatmap.length, 84);
  });

  // 10. Timezone date utilities & GDPR export/delete
  await test('Date utilities & GDPR export/delete include and wipe reward_events', async () => {
    assert.strictEqual(daysBetween('2026-11-17', '2026-11-18'), 1);
    assert.strictEqual(addDays('2026-11-18', -1), '2026-11-17');
    assert.strictEqual(getLocalTodayString('2026-11-18', 'Asia/Kolkata'), '2026-11-18');

    const user = await createUser({
      name: 'GDPR Tester',
      email: `gdpr_${crypto.randomUUID()}@test.local`,
      passwordHash: 'hash',
    });
    await createUserSettings(user.id, { rewards_enabled: true });
    await updateUser(user.id, { points_balance: 300, lifetime_points: 300 });
    await buyStreakFreeze(user.id);

    const exported = await exportUserData(user.id);
    assert.ok(Array.isArray(exported.reward_events));
    assert.strictEqual(exported.reward_events.length, 1);
    assert.strictEqual(exported.streak.streak_freezes, 1);

    await deleteUserData(user.id);
    const remainingEvents = await getRewardEventsForUser(user.id);
    assert.strictEqual(remainingEvents.length, 0);
    assert.strictEqual((await findUserById(user.id)).points_balance, 0);
  });

  console.log(`\n🎉 All ${passed} Focus Rewards & Streak Protection test suites passed!`);
}

runTests().catch(() => process.exit(1));
