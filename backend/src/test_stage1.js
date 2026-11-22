import app from './index.js';

let server;
const PORT = 8009; // Use distinct port for automated verification test

async function runTests() {
  console.log('🧪 Starting Stage 1 automated verification test...');

  server = app.listen(PORT, async () => {
    try {
      const baseUrl = `http://127.0.0.1:${PORT}`;

      // 1. Health check
      console.log('1. Testing GET /health');
      const healthRes = await fetch(`${baseUrl}/health`);
      const healthJson = await healthRes.json();
      if (healthRes.status !== 200 || healthJson.status !== 'healthy') {
        throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
      }
      console.log('   ✅ Health check passed');

      // 2. Signup
      console.log('2. Testing POST /auth/signup');
      const signupRes = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Stage One Tester',
          email: 'stage1@aimly.app',
          password: 'password123',
        }),
      });
      const signupJson = await signupRes.json();
      if (signupRes.status !== 201 || !signupJson.token) {
        throw new Error(`Signup failed: ${JSON.stringify(signupJson)}`);
      }
      const token = signupJson.token;
      console.log('   ✅ Signup passed, JWT received');

      // 3. Login
      console.log('3. Testing POST /auth/login');
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'stage1@aimly.app',
          password: 'password123',
        }),
      });
      const loginJson = await loginRes.json();
      if (loginRes.status !== 200 || !loginJson.token) {
        throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
      }
      console.log('   ✅ Login passed');

      // 4. Auth Me
      console.log('4. Testing GET /auth/me');
      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meJson = await meRes.json();
      if (meRes.status !== 200 || meJson.user.email !== 'stage1@aimly.app') {
        throw new Error(`Auth me failed: ${JSON.stringify(meJson)}`);
      }
      console.log('   ✅ Auth me passed, user settings loaded');

      // 5. Validation Check: Goal too short
      console.log('5. Testing validation error (goal too short)');
      const valRes = await fetch(`${baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          goal: 'no', // < 3 chars
          duration_minutes: 25,
        }),
      });
      if (valRes.status !== 400) {
        throw new Error(`Validation check failed: expected 400 but got ${valRes.status}`);
      }
      console.log('   ✅ Validation rejected short goal properly');

      // 6. Start valid session
      console.log('6. Testing POST /sessions');
      const sessionRes = await fetch(`${baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          goal: 'Complete DSA Graph Problems',
          duration_minutes: 30,
          mode: 'strict',
        }),
      });
      const sessionJson = await sessionRes.json();
      if (sessionRes.status !== 201 || !sessionJson.session?.id) {
        throw new Error(`Create session failed: ${JSON.stringify(sessionJson)}`);
      }
      const sessionId = sessionJson.session.id;
      console.log('   ✅ Session started successfully');

      // 7. Prevent concurrent active session
      console.log('7. Testing single active session constraint');
      const conflictRes = await fetch(`${baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          goal: 'Another goal concurrently',
          duration_minutes: 20,
        }),
      });
      if (conflictRes.status !== 409) {
        throw new Error(`Single session check failed: expected 409 but got ${conflictRes.status}`);
      }
      console.log('   ✅ Concurrent session rejected with 409 Conflict');

      // 8. Active session lookup
      console.log('8. Testing GET /sessions/active');
      const activeRes = await fetch(`${baseUrl}/sessions/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const activeJson = await activeRes.json();
      if (!activeJson.session || activeJson.session.id !== sessionId) {
        throw new Error(`Get active session failed: ${JSON.stringify(activeJson)}`);
      }
      console.log('   ✅ Active session fetched');

      // 9. Pause session
      console.log('9. Testing POST /sessions/:id/pause');
      const pauseRes = await fetch(`${baseUrl}/sessions/${sessionId}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const pauseJson = await pauseRes.json();
      if (pauseRes.status !== 200 || pauseJson.session.status !== 'paused') {
        throw new Error(`Pause session failed: ${JSON.stringify(pauseJson)}`);
      }
      console.log('   ✅ Session paused');

      // 10. Resume session
      console.log('10. Testing POST /sessions/:id/resume');
      const resumeRes = await fetch(`${baseUrl}/sessions/${sessionId}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const resumeJson = await resumeRes.json();
      if (resumeRes.status !== 200 || resumeJson.session.status !== 'active') {
        throw new Error(`Resume session failed: ${JSON.stringify(resumeJson)}`);
      }
      console.log('   ✅ Session resumed');

      // 11. End session
      console.log('11. Testing POST /sessions/:id/end');
      const endRes = await fetch(`${baseUrl}/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'completed' }),
      });
      const endJson = await endRes.json();
      if (endRes.status !== 200 || endJson.session.status !== 'completed') {
        throw new Error(`End session failed: ${JSON.stringify(endJson)}`);
      }
      console.log('   ✅ Session completed');

      // 12. Check last-goal
      console.log('12. Testing GET /sessions/last-goal');
      const lastGoalRes = await fetch(`${baseUrl}/sessions/last-goal`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lastGoalJson = await lastGoalRes.json();
      if (lastGoalJson.last_session?.goal !== 'Complete DSA Graph Problems') {
        throw new Error(`Last goal fetch failed: ${JSON.stringify(lastGoalJson)}`);
      }
      console.log('   ✅ Last goal successfully retrieved');

      console.log('\n🎉 ALL STAGE 1 CHECKS PASSED PERFECTLY!\n');
      process.exit(0);
    } catch (err) {
      console.error('❌ Test failed:', err);
      process.exit(1);
    } finally {
      server.close();
    }
  });
}

runTests();
