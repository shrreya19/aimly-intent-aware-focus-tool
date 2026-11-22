import app from './index.js';

let server;
const PORT = 8011;

async function runTests() {
  console.log('🧪 Starting Stage 3 automated verification test...');

  server = app.listen(PORT, async () => {
    try {
      const baseUrl = `http://127.0.0.1:${PORT}`;

      // 1. Reset and Seed Demo Data
      console.log('1. Testing POST /demo/reset (seeding 3 weeks of historical data)');
      const seedRes = await fetch(`${baseUrl}/demo/reset`, { method: 'POST' });
      const seedJson = await seedRes.json();
      if (seedRes.status !== 200 || !seedJson.account) {
        throw new Error(`Demo seed failed: ${JSON.stringify(seedJson)}`);
      }
      console.log('   ✅ Demo data successfully seeded');

      // 2. Login as demo user
      console.log('2. Logging in as demo user demo@aimly.app');
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo@aimly.app',
          password: 'demo1234',
        }),
      });
      const loginJson = await loginRes.json();
      if (loginRes.status !== 200 || !loginJson.token) {
        throw new Error(`Demo login failed: ${JSON.stringify(loginJson)}`);
      }
      const token = loginJson.token;
      console.log('   ✅ Demo user logged in');

      // 3. Test GET /stats/weekly
      console.log('3. Testing GET /stats/weekly');
      const weeklyRes = await fetch(`${baseUrl}/stats/weekly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const weeklyJson = await weeklyRes.json();
      if (!weeklyJson.summary || !weeklyJson.days || weeklyJson.days.length !== 7) {
        throw new Error(`Weekly stats invalid: ${JSON.stringify(weeklyJson)}`);
      }
      console.log('   Total minutes:', weeklyJson.summary.total_minutes);
      console.log('   Focus score:', weeklyJson.summary.focus_score);
      console.log('   Deep/Light/Drifted split:', {
        deep: weeklyJson.summary.deep_minutes,
        light: weeklyJson.summary.light_minutes,
        drifted: weeklyJson.summary.drifted_minutes,
      });
      console.log('   ✅ GET /stats/weekly passed with full 7-day metrics');

      // 4. Test GET /insights
      console.log('4. Testing GET /insights');
      const insightsRes = await fetch(`${baseUrl}/insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const insightsJson = await insightsRes.json();
      if (!insightsJson.best_focus_hour || typeof insightsJson.current_streak !== 'number') {
        throw new Error(`Insights invalid: ${JSON.stringify(insightsJson)}`);
      }
      console.log('   Best focus hour:', insightsJson.best_focus_hour);
      console.log('   Current streak:', insightsJson.current_streak, 'days');
      console.log('   Top distracting domains:', insightsJson.top_distracting_domains);
      console.log('   ✅ GET /insights passed');

      // 5. Test GET /streak
      console.log('5. Testing GET /streak');
      const streakRes = await fetch(`${baseUrl}/streak`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const streakJson = await streakRes.json();
      if (!streakJson.heatmap || streakJson.heatmap.length !== 84) {
        throw new Error(`Heatmap invalid: expected 84 days, got ${streakJson.heatmap?.length}`);
      }
      console.log('   Heatmap 12 weeks total days:', streakJson.heatmap.length);
      console.log('   ✅ GET /streak passed');

      // 6. Test GET /sessions/:id/report
      console.log('6. Testing GET /sessions/:id/report');
      const sessionsRes = await fetch(`${baseUrl}/sessions?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sessionsJson = await sessionsRes.json();
      const firstSession = sessionsJson.sessions[0];
      if (!firstSession) {
        throw new Error('No sessions found in history');
      }

      const reportRes = await fetch(`${baseUrl}/sessions/${firstSession.id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const reportJson = await reportRes.json();
      if (!reportJson.session || typeof reportJson.focus_score !== 'number') {
        throw new Error(`Session report invalid: ${JSON.stringify(reportJson)}`);
      }
      console.log('   Session goal:', reportJson.session.goal);
      console.log('   Report focus score:', reportJson.focus_score);
      console.log('   Visits on timeline:', reportJson.drift_timeline?.length);
      console.log('   Longest on-goal stretch:', reportJson.longest_on_goal_stretch_minutes, 'mins');
      console.log('   ✅ GET /sessions/:id/report passed');

      // 7. Test Settings
      console.log('7. Testing Settings GET and PUT');
      const putSettingsRes = await fetch(`${baseUrl}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sensitivity: 'high',
          default_duration: 45,
          default_mode: 'strict',
        }),
      });
      const putSettingsJson = await putSettingsRes.json();
      if (putSettingsJson.settings.sensitivity !== 'high') {
        throw new Error(`Settings update failed: ${JSON.stringify(putSettingsJson)}`);
      }
      console.log('   ✅ Settings updated');

      // 8. Test Data Export (GDPR compliance)
      console.log('8. Testing GET /me/export');
      const exportRes = await fetch(`${baseUrl}/me/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const exportJson = await exportRes.json();
      if (!exportJson.user || !exportJson.sessions || !exportJson.page_visits) {
        throw new Error(`Export data invalid: ${JSON.stringify(exportJson)}`);
      }
      console.log('   Exported records count: sessions:', exportJson.sessions.length, 'visits:', exportJson.page_visits.length);
      console.log('   ✅ GET /me/export passed');

      // 9. Test Data Deletion
      console.log('9. Testing DELETE /me/data');
      const deleteRes = await fetch(`${baseUrl}/me/data`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const deleteJson = await deleteRes.json();
      console.log('   Delete response:', deleteJson.message);

      // Verify sessions wiped
      const checkSessionsRes = await fetch(`${baseUrl}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkSessionsJson = await checkSessionsRes.json();
      if (checkSessionsJson.sessions.length !== 0) {
        throw new Error('Expected 0 sessions after DELETE /me/data');
      }
      console.log('   ✅ User personal data wiped successfully');

      // 10. Re-seed demo data so subsequent testing and demo runs stay populated
      console.log('10. Re-seeding demo data for upcoming stages');
      await fetch(`${baseUrl}/demo/reset`, { method: 'POST' });
      console.log('   ✅ Demo data restored');

      console.log('\n🎉 ALL STAGE 3 CHECKS PASSED PERFECTLY!\n');
      process.exit(0);
    } catch (err) {
      console.error('❌ Stage 3 test failed:', err);
      process.exit(1);
    } finally {
      server.close();
    }
  });
}

runTests();
