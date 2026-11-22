import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  findUserByEmail,
  createUser,
  updateUser,
  createUserSettings,
  updateUserSettings,
  createSession,
  updateSession,
  createPageVisit,
  createFeedback,
  createRewardEvent,
} from './services/dbService.js';
import {
  getSupabase,
  isUsingLiveDb,
  memoryStore,
  testSupabaseConnection,
} from './config/supabase.js';

export async function seedDemoData() {
  console.log('🌱 Starting Aimly demo database seeding...');
  await testSupabaseConnection();

  const demoEmail = 'demo@aimly.app';
  const demoPassword = 'demo1234';
  const demoName = 'Demo Student';

  // 1. Wipe existing demo user data if present
  let user = await findUserByEmail(demoEmail);

  if (isUsingLiveDb()) {
    const supabase = getSupabase();
    if (user) {
      await supabase.from('reward_events').delete().eq('user_id', user.id);
      await supabase.from('feedback').delete().eq('user_id', user.id);
      await supabase.from('sessions').delete().eq('user_id', user.id);
      await supabase.from('user_settings').delete().eq('user_id', user.id);
      await supabase.from('users').delete().eq('id', user.id);
      console.log('   Cleared existing Supabase demo user records.');
    }
  } else {
    if (user) {
      // Clear memoryStore for demo user
      const uId = user.id;
      memoryStore.users.delete(uId);
      memoryStore.user_settings.delete(uId);
      for (const [rId, r] of memoryStore.reward_events.entries()) {
        if (r.user_id === uId) memoryStore.reward_events.delete(rId);
      }
      const userSessions = Array.from(memoryStore.sessions.values()).filter(s => s.user_id === uId);
      const sIds = new Set(userSessions.map(s => s.id));
      for (const sid of sIds) memoryStore.sessions.delete(sid);
      for (const [vid, v] of memoryStore.page_visits.entries()) {
        if (sIds.has(v.session_id)) memoryStore.page_visits.delete(vid);
      }
      for (const [fid, f] of memoryStore.feedback.entries()) {
        if (f.user_id === uId) memoryStore.feedback.delete(fid);
      }
      console.log('   Cleared existing in-memory demo user records.');
    }
  }

  // 2. Create demo user
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(demoPassword, salt);
  user = await createUser({
    name: demoName,
    email: demoEmail,
    passwordHash,
  });

  // 3. User settings
  await createUserSettings(user.id, {
    default_mode: 'soft',
    default_duration: 25,
    sensitivity: 'medium',
    tracking_enabled: true,
    rewards_enabled: true,
    allowed_domains: ['github.com', 'developer.mozilla.org', 'wikipedia.org'],
  });

  // 4. Generate 21 days of realistic sessions
  const sampleGoals = [
    { goal: 'Study Graph Traversal Algorithms (BFS/DFS)', duration: 45, mode: 'strict' },
    { goal: 'Implement Dijkstra Shortest Path in Python', duration: 30, mode: 'strict' },
    { goal: 'Dynamic Programming: 0/1 Knapsack & Memoization', duration: 60, mode: 'soft' },
    { goal: 'Review Operating Systems Virtual Memory & Paging', duration: 25, mode: 'soft' },
    { goal: 'Design Wireframes & Glassmorphism UI for Aimly', duration: 45, mode: 'soft' },
    { goal: 'Database Indexing B-Trees and Query Optimization', duration: 30, mode: 'strict' },
    { goal: 'Read React 19 Concurrent Rendering Documentation', duration: 25, mode: 'soft' },
    { goal: 'Solve 3 LeetCode Medium Tree Problems', duration: 45, mode: 'strict' },
    { goal: 'Computer Networks TCP Congestion Control', duration: 30, mode: 'soft' },
    { goal: 'Sentence Transformers & Cosine Similarity for HCI', duration: 60, mode: 'strict' },
    { goal: 'FastAPI Microservices Architecture & Endpoints', duration: 25, mode: 'soft' },
    { goal: 'PostgreSQL Relational Schema Design & Foreign Keys', duration: 35, mode: 'strict' },
    { goal: 'Web Accessibility WCAG AA Guidelines Review', duration: 25, mode: 'soft' },
    { goal: 'JavaScript Async/Await Event Loop Mastery', duration: 40, mode: 'strict' },
    { goal: 'Prepare HCI Viva Presentation Slides', duration: 50, mode: 'soft' },
  ];

  const now = new Date();

  // Create historical sessions (days 20 down to 1; today left open so user can keep streak alive)
  for (let dayOffset = 20; dayOffset >= 1; dayOffset--) {
    // Skip 2 days to simulate a past broken streak (dayOffset 16 and 9)
    if (dayOffset === 16 || dayOffset === 9) continue;

    const goalTemplate = sampleGoals[(20 - dayOffset) % sampleGoals.length];
    const isDiscarded = dayOffset === 12 || dayOffset === 7;

    const sessionDate = new Date(now);
    sessionDate.setDate(sessionDate.getDate() - dayOffset);
    // Alternate hours: 10 AM, 2 PM, 4 PM, 8 PM
    const startHour = [10, 14, 16, 20][dayOffset % 4];
    sessionDate.setHours(startHour, 15, 0, 0);

    const startedAt = sessionDate.toISOString();
    const duration = goalTemplate.duration;
    const endDate = new Date(sessionDate.getTime() + duration * 60000);
    const endedAt = endDate.toISOString();

    const createdSession = await createSession({
      userId: user.id,
      goal: goalTemplate.goal,
      durationMinutes: duration,
      mode: goalTemplate.mode,
    });

    // Update with historical timestamps and status
    const status = isDiscarded ? 'discarded' : 'completed';
    await updateSession(createdSession.id, {
      status,
      started_at: startedAt,
      ended_at: isDiscarded ? new Date(sessionDate.getTime() + 10 * 60000).toISOString() : endedAt,
      created_at: startedAt,
    });

    // Add 3-5 realistic visits for this session
    const visits = [
      {
        url: 'https://www.geeksforgeeks.org/graph-data-structure-and-algorithms/',
        domain: 'geeksforgeeks.org',
        title: `${goalTemplate.goal} Tutorial & Code`,
        description: 'Comprehensive tutorials, diagrams and code examples.',
        relevance_score: 0.85,
        is_drift: false,
        method: 'model',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Algorithm',
        domain: 'wikipedia.org',
        title: 'Computer Science Reference - Wikipedia',
        description: 'Academic concepts and formal definitions.',
        relevance_score: 0.72,
        is_drift: false,
        method: 'model',
      },
      {
        url: 'https://leetcode.com/problemset/all/',
        domain: 'leetcode.com',
        title: 'LeetCode Problem Solving',
        description: 'Practice coding challenges and algorithm test cases.',
        relevance_score: 0.78,
        is_drift: false,
        method: 'model',
      },
    ];

    // Every 3rd session has a drift event
    if (dayOffset % 3 === 0) {
      visits.push({
        url: 'https://www.youtube.com/watch?v=standup_comedy_highlights',
        domain: 'youtube.com',
        title: 'Funniest Standup Comedy Live Special 2026',
        description: 'Trending comedy video and hilarious jokes.',
        relevance_score: 0.08,
        is_drift: true,
        method: 'keyword',
      });
    }

    for (const v of visits) {
      const vDate = new Date(sessionDate.getTime() + Math.floor(Math.random() * (duration - 5)) * 60000);
      const visitRow = await createPageVisit({
        sessionId: createdSession.id,
        url: v.url,
        domain: v.domain,
        title: v.title,
        description: v.description,
        relevanceScore: v.relevance_score,
        isDrift: v.is_drift,
        method: v.method,
      });

      // Add feedback occasionally
      if (v.is_drift && Math.random() > 0.5) {
        await createFeedback({
          userId: user.id,
          pageVisitId: visitRow.id,
          domain: v.domain,
          label: 'irrelevant',
        });
      }
    }

    // Seed realistic reward_events for completed historical sessions
    if (!isDiscarded) {
      const hasDrift = dayOffset % 3 === 0;
      const focusScore = hasDrift ? 75 : 100;
      const onTopicMinutes = Math.round(duration * (focusScore / 100));
      const basePoints = onTopicMinutes * 2;
      const focusMult = focusScore >= 90 ? 1.5 : 1.25;
      const streakMult = dayOffset <= 6 ? 1.1 : 1.0;
      const combinedMult = Math.min(2.0, Math.round(focusMult * streakMult * 100) / 100);
      const multipliedPoints = Math.round(basePoints * combinedMult);
      const deepBonus = !hasDrift && duration >= 20 ? 20 : 0;
      const awarded = multipliedPoints + deepBonus;
      const sessionDayStr = sessionDate.toISOString().split('T')[0];

      await createRewardEvent({
        userId: user.id,
        sessionId: createdSession.id,
        type: 'session_award',
        points: awarded,
        breakdown: {
          award_date: sessionDayStr,
          on_topic_minutes: onTopicMinutes,
          base_points: basePoints,
          focus_score: focusScore,
          focus_multiplier: focusMult,
          streak_multiplier: streakMult,
          combined_multiplier: combinedMult,
          multiplied_points: multipliedPoints,
          deep_stretch_bonus: deepBonus,
          uncapped_points: awarded,
          awarded_points: awarded,
          was_clamped: false,
          daily_cap: 600,
          milestone_bonus: dayOffset === 14 ? 50 : 0,
          comeback_bonus: dayOffset === 15 ? 75 : 0,
          comeback: dayOffset === 15,
          encouraging_copy: dayOffset === 15 ? 'Welcome back! Fresh start.' : null,
        },
        createdAt: endedAt,
      });

      // Past broken streak at dayOffset 16 -> comeback bonus on dayOffset 15
      if (dayOffset === 15) {
        await createRewardEvent({
          userId: user.id,
          sessionId: createdSession.id,
          type: 'comeback_bonus',
          points: 75,
          breakdown: { bonus: 75, copy: 'Welcome back! Fresh start.', award_date: sessionDayStr },
          createdAt: endedAt,
        });
      }

      // 3-day milestone hit during current streak
      if (dayOffset === 4) {
        await createRewardEvent({
          userId: user.id,
          sessionId: createdSession.id,
          type: 'streak_milestone',
          points: 50,
          breakdown: { days: 3, bonus: 50, award_date: sessionDayStr },
          createdAt: endedAt,
        });
      }
    }
  }

  // 5. Seed freeze purchase & final user reward/streak summary (active 6-day streak ending yesterday -> streak_at_risk = true)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const freezeDate = new Date(now);
  freezeDate.setDate(freezeDate.getDate() - 3);
  await createRewardEvent({
    userId: user.id,
    type: 'freeze_purchased',
    points: -250,
    breakdown: { cost: 250, new_total: 1 },
    createdAt: freezeDate.toISOString(),
  });

  await updateUser(user.id, {
    points_balance: 580,
    lifetime_points: 1280,
    streak_freezes: 1,
    current_streak: 6,
    longest_streak: 7,
    last_streak_date: yesterdayStr,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });

  console.log(`✅ Demo database seeded successfully!`);
  console.log(`   User: ${demoEmail} | Password: ${demoPassword}`);
  console.log(`   Created 19 sessions spanning 3 weeks with full analytics.`);
  return { success: true, email: demoEmail };
}

// Allow standalone execution via `node src/seed.js`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
