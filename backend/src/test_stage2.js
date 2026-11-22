import app from './index.js';

let server;
const PORT = 8010;

async function runTests() {
  console.log('🧪 Starting Stage 2 automated verification test...');

  server = app.listen(PORT, async () => {
    try {
      const baseUrl = `http://127.0.0.1:${PORT}`;

      // 1. Create a user and login
      const signupRes = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Stage Two Researcher',
          email: 'stage2@aimly.app',
          password: 'password123',
        }),
      });
      const signupJson = await signupRes.json();
      const token = signupJson.token;
      const userId = signupJson.user.id;

      // 2. Start a session with an academic goal
      const sessRes = await fetch(`${baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          goal: 'Study Graph Traversal Algorithms in DSA',
          duration_minutes: 30,
          mode: 'strict',
        }),
      });
      const sessJson = await sessRes.json();
      const sessionId = sessJson.session.id;
      console.log('   ✅ Test session created for DSA graphs');

      // 3. Test on-topic page (e.g. GeeksforGeeks graph algorithms)
      console.log('3. Testing relevant page visit on geeksforgeeks.org');
      const gfgRes = await fetch(`${baseUrl}/check-relevance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          url: 'https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/',
          title: 'Breadth First Search or BFS for a Graph - GeeksforGeeks',
          description: 'Learn graph traversal algorithms and implementations in Python and C++',
        }),
      });
      const gfgJson = await gfgRes.json();
      console.log('   Score:', gfgJson.score, 'is_drift:', gfgJson.is_drift, 'method:', gfgJson.method);
      if (gfgJson.is_drift !== false) {
        throw new Error(`Expected GFG page to not be drift, got: ${JSON.stringify(gfgJson)}`);
      }
      console.log('   ✅ On-topic page recognized as relevant (no drift)');

      // 4. Test off-topic drift page (e.g. Standup comedy on YouTube)
      console.log('4. Testing distracting page visit (standup comedy)');
      const comedyRes = await fetch(`${baseUrl}/check-relevance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          url: 'https://www.youtube.com/watch?v=funny_standup_comedy_special',
          title: 'Funniest Standup Comedy Live Special 2026',
          description: 'Laugh out loud with top standup comedy jokes and funny sketches',
        }),
      });
      const comedyJson = await comedyRes.json();
      console.log('   Score:', comedyJson.score, 'is_drift:', comedyJson.is_drift, 'method:', comedyJson.method);
      if (comedyJson.is_drift !== true) {
        throw new Error(`Expected comedy page to be flagged as drift, got: ${JSON.stringify(comedyJson)}`);
      }
      console.log('   ✅ Distracting comedy page flagged as drift');

      // 5. Test Allowed Domains bypass
      console.log('5. Testing Allowed Domains bypass');
      // Add 'github.com' to user's allowed_domains
      await fetch(`${baseUrl}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          allowed_domains: ['github.com'],
        }),
      });

      const allowedRes = await fetch(`${baseUrl}/check-relevance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          url: 'https://github.com/some/random/repo',
          title: 'Random Project Repository',
          description: 'Any random description',
        }),
      });
      const allowedJson = await allowedRes.json();
      if (allowedJson.is_drift !== false || allowedJson.method !== 'allowed') {
        throw new Error(`Expected allowed domain bypass, got: ${JSON.stringify(allowedJson)}`);
      }
      console.log('   ✅ Allowed domain bypass succeeded with method="allowed"');

      // 6. Test Feedback and Auto-allow domain after 3 relevant flags
      console.log('6. Testing Feedback and auto-allow domain logic');
      const domainToAutoAllow = 'documentation.org';
      for (let i = 1; i <= 3; i++) {
        const fbRes = await fetch(`${baseUrl}/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            domain: domainToAutoAllow,
            label: 'relevant',
          }),
        });
        const fbJson = await fbRes.json();
        if (i === 3) {
          if (!fbJson.auto_allowed_domain) {
            throw new Error(`Expected domain to be auto-allowed on 3rd feedback, got: ${JSON.stringify(fbJson)}`);
          }
          console.log('   ✅ Domain automatically added to allowed_domains after 3 relevant ratings');
        }
      }

      console.log('\n🎉 ALL STAGE 2 CHECKS PASSED PERFECTLY!\n');
      process.exit(0);
    } catch (err) {
      console.error('❌ Stage 2 test failed:', err);
      process.exit(1);
    } finally {
      server.close();
    }
  });
}

runTests();
