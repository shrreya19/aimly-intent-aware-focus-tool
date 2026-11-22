// Aimly Popup Logic (Manifest V3)

const BACKEND_URL = 'http://localhost:8000';
const WEB_APP_URL = 'http://localhost:5173';

let currentSession = null;
let currentToken = null;
let currentRewards = null;
let activeBreakEndsAt = null;
let sessionBreaksUsed = 0;
let pollInterval = null;
let countdownTimer = null;
let selectedDuration = 25;
let selectedMode = 'soft';

function getLocalDateHeader() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getAuthHeaders(extra = {}) {
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  })();
  return {
    Authorization: `Bearer ${currentToken}`,
    'X-Client-Date': getLocalDateHeader(),
    ...(tz ? { 'X-Client-Timezone': tz } : {}),
    ...extra,
  };
}

// DOM Elements
const stateLoading = document.getElementById('state-loading');
const stateLoggedOut = document.getElementById('state-logged-out');
const stateIdle = document.getElementById('state-idle');
const stateRunning = document.getElementById('state-running');
const errorBanner = document.getElementById('error-banner');
const userInitials = document.getElementById('user-initials');

// Lifecycle Init
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await refreshPopupState();
});

function showState(state) {
  stateLoading.style.display = state === 'loading' ? 'block' : 'none';
  stateLoggedOut.style.display = state === 'logged-out' ? 'flex' : 'none';
  stateIdle.style.display = state === 'idle' ? 'flex' : 'none';
  stateRunning.style.display = state === 'running' ? 'flex' : 'none';

  const rewardsBar = document.getElementById('rewards-mini-bar');
  const riskHint = document.getElementById('streak-at-risk-hint');
  if (state === 'logged-out' || state === 'loading') {
    if (rewardsBar) rewardsBar.style.display = 'none';
    if (riskHint) riskHint.style.display = 'none';
  } else {
    renderRewardsMiniBar(state);
  }
}

function renderRewardsMiniBar(state = null) {
  const rewardsBar = document.getElementById('rewards-mini-bar');
  const riskHint = document.getElementById('streak-at-risk-hint');
  if (!rewardsBar) return;

  if (!currentRewards || currentRewards.rewards_enabled === false) {
    rewardsBar.style.display = 'none';
    if (riskHint) riskHint.style.display = 'none';
    return;
  }

  document.getElementById('rewards-tier-badge').textContent = currentRewards.level || 'Beginner';
  document.getElementById('rewards-pts').textContent = `${currentRewards.points_balance || 0} pts`;
  document.getElementById('rewards-streak').textContent = `${currentRewards.current_streak || 0}d`;
  document.getElementById('rewards-freezes').textContent = `${currentRewards.streak_freezes || 0}`;
  rewardsBar.style.display = 'flex';

  const isIdle = state ? state === 'idle' : stateIdle.style.display === 'flex';
  if (riskHint) {
    if (isIdle && currentRewards.streak_at_risk) {
      riskHint.textContent = `Your ${currentRewards.current_streak}-day streak is waiting, one session keeps it alive.`;
      riskHint.style.display = 'block';
    } else {
      riskHint.style.display = 'none';
    }
  }
}

async function fetchRewardsSummary() {
  if (!currentToken) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/rewards/summary`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    currentRewards = data;
    renderRewardsMiniBar();
    updateBreakUI();
    return data;
  } catch {
    // Fail gracefully if unreachable
    return null;
  }
}

function updateBreakUI() {
  const container = document.getElementById('running-break-container');
  const btn = document.getElementById('btn-redeem-break');
  const activeBox = document.getElementById('running-break-active');
  const digits = document.getElementById('break-countdown-digits');
  if (!container || !btn || !activeBox) return;

  if (!currentRewards || currentRewards.rewards_enabled === false || !currentSession) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  const remainingSecs = activeBreakEndsAt
    ? Math.max(0, Math.round((new Date(activeBreakEndsAt).getTime() - Date.now()) / 1000))
    : 0;

  if (remainingSecs > 0) {
    btn.style.display = 'none';
    activeBox.style.display = 'block';
    const mm = String(Math.floor(remainingSecs / 60)).padStart(2, '0');
    const ss = String(remainingSecs % 60).padStart(2, '0');
    if (digits) digits.textContent = `${mm}:${ss}`;
  } else {
    activeBreakEndsAt = null;
    activeBox.style.display = 'none';
    btn.style.display = 'inline-flex';
    const isPaused = currentSession.status === 'paused';
    const balance = currentRewards.points_balance || 0;
    btn.disabled = isPaused || sessionBreaksUsed >= 2 || balance < 100;
    btn.textContent =
      sessionBreaksUsed >= 2
        ? 'Max breaks used (2/2)'
        : balance < 100
        ? 'Take 5-min break (need 100 pts)'
        : `Take 5-min break (100 pts) • ${sessionBreaksUsed}/2`;
  }
}

function showError(msg) {
  if (msg) {
    errorBanner.textContent = msg;
    errorBanner.style.display = 'block';
  } else {
    errorBanner.style.display = 'none';
  }
}

async function refreshPopupState() {
  showState('loading');
  showError('');

  const data = await chrome.storage.local.get(['aimly_token']);
  currentToken = data.aimly_token || null;

  if (!currentToken) {
    showState('logged-out');
    return;
  }

  try {
    // 1. Verify user profile
    const meRes = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });

    if (meRes.status === 401) {
      await chrome.storage.local.remove(['aimly_token']);
      showState('logged-out');
      return;
    }

    if (!meRes.ok) {
      throw new Error("Can't reach Aimly right now. Check your connection.");
    }

    const meData = await meRes.json();
    const name = meData.user?.name || 'U';
    userInitials.textContent = name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    // 2. Load rewards summary gracefully & check active session
    await fetchRewardsSummary();

    const activeRes = await fetch(`${BACKEND_URL}/sessions/active`, {
      headers: getAuthHeaders(),
    });
    const activeData = await activeRes.json();

    if (activeData.session) {
      currentSession = activeData.session;
      activeBreakEndsAt = activeData.active_break?.break_ends_at || null;
      sessionBreaksUsed = activeData.breaks_used || 0;
      if (activeBreakEndsAt) {
        chrome.runtime.sendMessage({ action: 'START_BREAK_ALARM', break_ends_at: activeBreakEndsAt }).catch(() => {});
      }
      renderRunningState(currentSession);
      showState('running');
      startPolling();
    } else {
      currentSession = null;
      activeBreakEndsAt = null;
      sessionBreaksUsed = 0;
      await renderIdleState();
      showState('idle');
    }
  } catch (err) {
    showState('logged-out');
    showError("Can't reach Aimly right now. Check your connection.");
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    if (!currentToken) return;
    try {
      const activeRes = await fetch(`${BACKEND_URL}/sessions/active`, {
        headers: getAuthHeaders(),
      });
      const activeData = await activeRes.json();
      if (!activeData.session) {
        clearInterval(pollInterval);
        currentSession = null;
        activeBreakEndsAt = null;
        sessionBreaksUsed = 0;
        await fetchRewardsSummary();
        await renderIdleState();
        showState('idle');
      } else {
        currentSession = activeData.session;
        activeBreakEndsAt = activeData.active_break?.break_ends_at || activeBreakEndsAt;
        sessionBreaksUsed = activeData.breaks_used ?? sessionBreaksUsed;
        updateRunningDisplay(currentSession);
      }
    } catch {}
  }, 3000);
}

// -----------------------------------------------------------------------------
// State 2: Idle Rendering
// -----------------------------------------------------------------------------
async function renderIdleState() {
  try {
    // Load weekly stats & streak
    const [weeklyRes, streakRes, lastGoalRes] = await Promise.all([
      fetch(`${BACKEND_URL}/stats/weekly`, { headers: { Authorization: `Bearer ${currentToken}` } }),
      fetch(`${BACKEND_URL}/streak`, { headers: { Authorization: `Bearer ${currentToken}` } }),
      fetch(`${BACKEND_URL}/sessions/last-goal`, { headers: { Authorization: `Bearer ${currentToken}` } }),
    ]);

    const weeklyData = await weeklyRes.json();
    const streakData = await streakRes.json();
    const lastGoalData = await lastGoalRes.json();

    const mins = weeklyData.summary?.total_minutes || 0;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    document.getElementById('idle-weekly-stat').textContent = `${h}h ${m}m focused this week`;
    document.getElementById('weekly-total-preview').textContent = `${h}h ${m}m this week`;

    const streak = streakData.current_streak || 0;
    document.getElementById('footer-streak-text').textContent = `${streak} day streak`;

    // Last goal card
    const lastSess = lastGoalData.last_session;
    const lastGoalText = document.getElementById('last-goal-text');
    const lastGoalDur = document.getElementById('last-goal-duration');
    const lastGoalMode = document.getElementById('last-goal-mode');
    const resumeBtn = document.getElementById('resume-btn');

    if (lastSess && lastSess.goal) {
      lastGoalText.textContent = lastSess.goal;
      lastGoalDur.textContent = `${lastSess.duration_minutes || 25}m`;
      lastGoalMode.textContent = lastSess.mode || 'soft';
      resumeBtn.disabled = false;
      resumeBtn.style.opacity = '1';
    } else {
      lastGoalText.textContent = 'No sessions yet';
      lastGoalDur.style.display = 'none';
      lastGoalMode.style.display = 'none';
      resumeBtn.disabled = true;
      resumeBtn.style.opacity = '0.4';
    }
  } catch (err) {
    console.warn('Error loading idle data:', err);
  }
}

// -----------------------------------------------------------------------------
// State 3: Running Rendering
// -----------------------------------------------------------------------------
function renderRunningState(session) {
  document.getElementById('running-goal-text').textContent = session.goal;
  
  const modeChip = document.getElementById('running-mode-chip');
  if (session.mode === 'strict') {
    modeChip.textContent = 'Strict';
    modeChip.style.background = 'var(--ink)';
    modeChip.style.color = '#FFFFFF';
  } else {
    modeChip.textContent = 'Soft';
    modeChip.style.background = 'var(--amber)';
    modeChip.style.color = 'var(--ink)';
  }

  updateRunningDisplay(session);
}

function updateRunningDisplay(session) {
  const isPaused = session.status === 'paused';
  const totalDurationSecs = (session.duration_minutes || 25) * 60;
  const startedAt = new Date(session.started_at).getTime();
  const now = Date.now();

  let pausedSecs = session.total_paused_seconds || 0;
  if (isPaused && session.paused_at) {
    pausedSecs += Math.round((now - new Date(session.paused_at).getTime()) / 1000);
  }

  const elapsedTotal = Math.max(0, Math.round((now - startedAt) / 1000) - pausedSecs);
  const remaining = Math.max(0, totalDurationSecs - elapsedTotal);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  document.getElementById('countdown-digits').textContent = `${mm}:${ss}`;

  // Ring appearance
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, remaining / totalDurationSecs));
  const dashoffset = circumference - fraction * circumference;

  const ring = document.getElementById('countdown-progress-ring');
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${dashoffset}`;
  ring.style.stroke = isPaused ? 'var(--amber)' : 'var(--primary)';

  const label = document.getElementById('countdown-label');
  label.textContent = isPaused ? 'Paused' : 'Focusing';

  // Toggle button text
  const pauseBtn = document.getElementById('btn-toggle-pause');
  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
  if (isPaused) {
    pauseBtn.classList.remove('btn-outline');
    pauseBtn.classList.add('btn-primary');
  } else {
    pauseBtn.classList.remove('btn-primary');
    pauseBtn.classList.add('btn-outline');
  }

  updateBreakUI();
}

// -----------------------------------------------------------------------------
// Event Handlers Setup
// -----------------------------------------------------------------------------
function setupEventListeners() {
  // Login form submission
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      await chrome.storage.local.set({ aimly_token: data.token });
      await refreshPopupState();
    } catch (err) {
      showError(err.message);
    }
  });

  // Link: Create account in web app
  document.getElementById('btn-quick-demo-fill')?.addEventListener('click', () => {
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    if (emailEl && passEl) {
      emailEl.value = 'demo@aimly.app';
      passEl.value = 'demo1234';
      document.getElementById('login-form')?.requestSubmit();
    }
  });

  document.getElementById('link-create-account')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${WEB_APP_URL}/signup` });
  });

  // Quick Start Input Validation
  const goalInput = document.getElementById('quick-goal-input');
  const startBtn = document.getElementById('start-session-btn');
  goalInput?.addEventListener('input', () => {
    startBtn.disabled = goalInput.value.trim().length < 3;
  });

  // Duration Chips
  document.querySelectorAll('.duration-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.duration-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedDuration = parseInt(chip.getAttribute('data-min'), 10);
    });
  });

  // Mode Toggle
  document.querySelectorAll('.toggle-opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.toggle-opt').forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedMode = opt.getAttribute('data-mode');

      const hint = document.getElementById('toggle-hint-text');
      if (selectedMode === 'soft') {
        hint.textContent = 'Soft: you can continue or discard';
      } else {
        hint.textContent = 'Strict: you must close the tab';
      }
    });
  });

  // Start Session Button
  startBtn?.addEventListener('click', async () => {
    const goal = goalInput.value.trim();
    if (goal.length < 3) return;

    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';

    try {
      const res = await fetch(`${BACKEND_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          goal,
          duration_minutes: selectedDuration,
          mode: selectedMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start session');

      currentSession = data.session;
      renderRunningState(currentSession);
      showState('running');
      startPolling();
    } catch (err) {
      showError(err.message);
      startBtn.disabled = false;
      startBtn.textContent = 'Start';
    }
  });

  // Resume Last Goal Button
  document.getElementById('resume-btn')?.addEventListener('click', async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/sessions/last-goal`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await res.json();
      if (!data.last_session) return;

      const startRes = await fetch(`${BACKEND_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          goal: data.last_session.goal,
          duration_minutes: data.last_session.duration_minutes || 25,
          mode: data.last_session.mode || 'soft',
        }),
      });

      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Failed to restart session');

      currentSession = startData.session;
      renderRunningState(currentSession);
      showState('running');
      startPolling();
    } catch (err) {
      showError(err.message);
    }
  });

  // Open Dashboard Cards
  document.getElementById('open-dashboard-card')?.addEventListener('click', () => {
    chrome.tabs.create({ url: `${WEB_APP_URL}/dashboard` });
  });

  document.getElementById('link-running-dashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${WEB_APP_URL}/dashboard` });
  });

  // Running Pause / Resume
  document.getElementById('btn-toggle-pause')?.addEventListener('click', async () => {
    if (!currentSession) return;
    const isPaused = currentSession.status === 'paused';
    const endpoint = isPaused
      ? `${BACKEND_URL}/sessions/${currentSession.id}/resume`
      : `${BACKEND_URL}/sessions/${currentSession.id}/pause`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        currentSession = data.session;
        updateRunningDisplay(currentSession);
      }
    } catch (err) {
      showError(err.message);
    }
  });

  // End Session Confirmation Controls
  const inlineConfirm = document.getElementById('inline-end-confirm');
  const runningActions = document.getElementById('running-main-actions');

  document.getElementById('btn-open-end-confirm')?.addEventListener('click', () => {
    inlineConfirm.style.display = 'block';
    runningActions.style.display = 'none';
  });

  document.getElementById('btn-cancel-end')?.addEventListener('click', () => {
    inlineConfirm.style.display = 'none';
    runningActions.style.display = 'flex';
  });

  document.getElementById('btn-confirm-complete')?.addEventListener('click', async () => {
    await endSession('completed');
  });

  document.getElementById('btn-confirm-discard')?.addEventListener('click', async () => {
    await endSession('discarded');
  });

  // Redeem 5-min Earn-a-Break button
  document.getElementById('btn-redeem-break')?.addEventListener('click', async () => {
    if (!currentSession || !currentToken) return;
    const btn = document.getElementById('btn-redeem-break');
    btn.disabled = true;
    btn.textContent = 'Activating break...';
    showError('');

    try {
      const res = await fetch(`${BACKEND_URL}/rewards/redeem-break`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ session_id: currentSession.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not redeem break');

      activeBreakEndsAt = data.break_ends_at;
      sessionBreaksUsed = data.breaks_used || sessionBreaksUsed + 1;
      chrome.runtime.sendMessage({ action: 'START_BREAK_ALARM', break_ends_at: activeBreakEndsAt }).catch(() => {});
      await fetchRewardsSummary();
      updateBreakUI();
    } catch (err) {
      showError(err.message);
      updateBreakUI();
    }
  });

  // Avatar click to logout
  document.getElementById('user-avatar-btn')?.addEventListener('click', async () => {
    if (confirm('Log out from Aimly?')) {
      await chrome.storage.local.remove(['aimly_token']);
      currentToken = null;
      currentSession = null;
      if (pollInterval) clearInterval(pollInterval);
      showState('logged-out');
    }
  });
}

async function endSession(status) {
  if (!currentSession) return;
  try {
    const res = await fetch(`${BACKEND_URL}/sessions/${currentSession.id}/end`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status, client_date: getLocalDateHeader() }),
    });

    if (res.ok) {
      const sessId = currentSession.id;
      currentSession = null;
      activeBreakEndsAt = null;
      sessionBreaksUsed = 0;
      chrome.runtime.sendMessage({ action: 'CLEAR_BREAK_ALARM' }).catch(() => {});
      if (pollInterval) clearInterval(pollInterval);
      chrome.tabs.create({ url: `${WEB_APP_URL}/report/${sessId}` });
      await fetchRewardsSummary();
      await renderIdleState();
      showState('idle');
    }
  } catch (err) {
    showError(err.message);
  }
}
