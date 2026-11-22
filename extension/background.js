// Aimly Background Service Worker (Manifest V3)

const BACKEND_URL = 'http://localhost:8000';
let activeTimers = new Map(); // tabId -> timerId

// Helper to get stored auth token
async function getToken() {
  const data = await chrome.storage.local.get(['aimly_token']);
  return data.aimly_token || null;
}

// Helper to check if a focus break is currently active (persisted in chrome.storage.local)
async function isBreakActive() {
  const data = await chrome.storage.local.get(['aimly_break_ends_at']);
  if (!data.aimly_break_ends_at) return false;
  const endsAt = new Date(data.aimly_break_ends_at).getTime();
  if (isNaN(endsAt) || endsAt <= Date.now()) {
    await chrome.storage.local.remove(['aimly_break_ends_at']);
    return false;
  }
  return true;
}

// Helper to store break_ends_at and schedule chrome.alarms to end it (survives MV3 sleep)
async function scheduleBreakEndAlarm(breakEndsAt) {
  if (!breakEndsAt) return;
  const when = new Date(breakEndsAt).getTime();
  if (isNaN(when) || when <= Date.now()) return;
  await chrome.storage.local.set({ aimly_break_ends_at: breakEndsAt });
  chrome.alarms.create('aimly_break_end', { when });
}

// Helper to get active session (and sync any active break started from web app)
async function getActiveSession() {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/sessions/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.active_break?.break_ends_at) {
      await scheduleBreakEndAlarm(json.active_break.break_ends_at);
    }
    return json.session || null;
  } catch (err) {
    console.warn('[Aimly Background] Could not fetch active session:', err.message);
    return null;
  }
}

// Determine if a URL should be skipped from tracking
function shouldSkipUrl(url) {
  if (!url) return true;
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:')
  ) {
    return true;
  }

  try {
    const parsed = new URL(url);
    // Skip Aimly web app itself
    if (
      parsed.hostname === 'localhost' &&
      (parsed.port === '5173' || parsed.port === '3000')
    ) {
      return true;
    }
    if (parsed.hostname === 'aimly.app') {
      return true;
    }
  } catch {
    return true;
  }

  return false;
}

// Execute 8-second dwell timer before checking relevance
async function scheduleRelevanceCheck(tabId, tabUrl) {
  // Clear any existing timer for this tab
  if (activeTimers.has(tabId)) {
    clearTimeout(activeTimers.get(tabId));
    activeTimers.delete(tabId);
  }

  if (shouldSkipUrl(tabUrl)) return;

  const session = await getActiveSession();
  if (!session || session.status !== 'active') return;

  // 8-second dwell wait on the page
  const timer = setTimeout(async () => {
    activeTimers.delete(tabId);
    await performRelevanceCheck(tabId, tabUrl, session);
  }, 8000);

  activeTimers.set(tabId, timer);
}

// Perform relevance check after dwell
async function performRelevanceCheck(tabId, tabUrl, session) {
  // Skip drift evaluation completely while a guilt-free break is active
  if (await isBreakActive()) return;

  const token = await getToken();
  if (!token) return;

  try {
    // Extract metadata from the tab
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const title = document.title || '';
        const metaDesc =
          document.querySelector('meta[name="description"]')?.getAttribute('content') ||
          document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
          '';
        return { title, description: metaDesc };
      },
    });

    const { title, description } = result?.result || { title: '', description: '' };

    // POST /check-relevance
    const response = await fetch(`${BACKEND_URL}/check-relevance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        session_id: session.id,
        url: tabUrl,
        title,
        description,
      }),
    });

    if (!response.ok) return;
    const data = await response.json();
    console.log(`[Aimly] Relevance evaluated for "${tabUrl.substring(0, 45)}...": score=${data.score}, drift=${data.is_drift}`);

    // If drift is flagged, notify content script to show overlay
    if (data.is_drift) {
      let domain = 'unknown';
      try {
        domain = new URL(tabUrl).hostname.replace(/^www\./, '');
      } catch {}

      const overlayPayload = {
        action: 'SHOW_DRIFT_OVERLAY',
        goal: session.goal,
        score: data.score,
        mode: session.mode,
        page_visit_id: data.page_visit_id,
        domain,
      };

      try {
        await chrome.tabs.sendMessage(tabId, overlayPayload);
      } catch (msgErr) {
        // Tab was likely open before extension reload; inject content script and retry
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js'],
          });
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, overlayPayload).catch(() => {});
          }, 150);
        } catch (injectErr) {
          console.warn('[Aimly Background] Could not show overlay:', injectErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('[Aimly Background] Relevance check error:', err.message);
  }
}

// Listen to Tab Activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      scheduleRelevanceCheck(tab.id, tab.url);
    }
  } catch {}
});

// Listen to Tab Update (completed status or SPA in-page navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if ((changeInfo.status === 'complete' || changeInfo.url) && tab.url) {
    scheduleRelevanceCheck(tabId, tab.url);
  }
});

// Handle Messages from Content Script or Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SYNC_TOKEN' && message.token) {
    chrome.storage.local.set({ aimly_token: message.token });
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'CLOSE_CURRENT_TAB' && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
    sendResponse({ success: true });
  } else if (message.action === 'DISCARD_ACTIVE_SESSION') {
    (async () => {
      const token = await getToken();
      const session = await getActiveSession();
      if (token && session) {
        await fetch(`${BACKEND_URL}/sessions/${session.id}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'discarded' }),
        });
      }
      sendResponse({ success: true });
    })();
    return true; // Keep message channel open for async response
  } else if (message.action === 'SUBMIT_FEEDBACK') {
    (async () => {
      const token = await getToken();
      if (token) {
        await fetch(`${BACKEND_URL}/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            page_visit_id: message.page_visit_id,
            domain: message.domain,
            label: message.label,
          }),
        });
      }
      sendResponse({ success: true });
    })();
    return true;
  } else if (message.action === 'START_BREAK_ALARM' && message.break_ends_at) {
    (async () => {
      await scheduleBreakEndAlarm(message.break_ends_at);
      sendResponse({ success: true });
    })();
    return true;
  } else if (message.action === 'CLEAR_BREAK_ALARM') {
    (async () => {
      await chrome.storage.local.remove(['aimly_break_ends_at']);
      await chrome.alarms.clear('aimly_break_end');
      sendResponse({ success: true });
    })();
    return true;
  }
});

// Alarms for session completion & break end notifications
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'aimly_break_end') {
    await chrome.storage.local.remove(['aimly_break_ends_at']);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Aimly: Break Complete',
      message: 'Your 5-minute break is over — welcome back on aim!',
      priority: 1,
    });
  } else if (alarm.name.startsWith('aimly_session_timer_')) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Aimly: Focus Session Complete!',
      message: 'Great job staying on aim. Open your dashboard to view your report.',
      priority: 2,
    });
  }
});
