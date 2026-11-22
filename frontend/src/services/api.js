const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getClientLocalDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getClientTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/**
 * Universal API Client with automatic JWT and local date/timezone headers
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('aimly_token');
  const tz = getClientTimezone();
  const headers = {
    'Content-Type': 'application/json',
    'X-Client-Date': getClientLocalDate(),
    ...(tz ? { 'X-Client-Timezone': tz } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    getMe: () => request('/auth/me'),
  },

  // Sessions
  sessions: {
    start: (body) => request('/sessions', { method: 'POST', body: JSON.stringify(body) }),
    getActive: () => request('/sessions/active'),
    getLastGoal: () => request('/sessions/last-goal'),
    pause: (id) => request(`/sessions/${id}/pause`, { method: 'POST' }),
    resume: (id) => request(`/sessions/${id}/resume`, { method: 'POST' }),
    end: (id, status) => request(`/sessions/${id}/end`, { method: 'POST', body: JSON.stringify({ status }) }),
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/sessions${q ? `?${q}` : ''}`);
    },
    getReport: (id) => request(`/sessions/${id}/report`),
  },

  // Analytics & Stats
  analytics: {
    getWeeklyStats: () => request('/stats/weekly'),
    getInsights: () => request('/insights'),
    getStreak: () => request('/streak'),
  },

  // Focus Rewards
  rewards: {
    getSummary: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/rewards/summary${q ? `?${q}` : ''}`);
    },
    getHistory: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/rewards/history${q ? `?${q}` : ''}`);
    },
    buyFreeze: () => request('/rewards/buy-freeze', { method: 'POST' }),
    redeemBreak: (sessionId) =>
      request('/rewards/redeem-break', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      }),
  },

  // Settings
  settings: {
    get: () => request('/settings'),
    update: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },

  // Privacy
  privacy: {
    exportData: () => request('/me/export'),
    deleteData: () => request('/me/data', { method: 'DELETE' }),
  },

  // Demo
  demo: {
    reset: () => request('/demo/reset', { method: 'POST' }),
  },

  // Relevance
  relevance: {
    check: (body) => request('/check-relevance', { method: 'POST', body: JSON.stringify(body) }),
    feedback: (body) => request('/feedback', { method: 'POST', body: JSON.stringify(body) }),
  },
};
