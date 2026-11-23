// Aimly Content Script - Drift Warning Injection

(function () {
  let shadowHost = null;
  let shadowRoot = null;

  // Mark extension presence on page
  try {
    document.documentElement.dataset.aimlyExtension = 'connected';
  } catch {}

  // Auto-sync authentication token when user is on the Aimly web app
  if (
    (window.location.hostname === 'localhost' &&
      (window.location.port === '5173' || window.location.port === '3000')) ||
    window.location.hostname.endsWith('.vercel.app') ||
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'aimly.app'
  ) {
    const syncToken = () => {
      try {
        const token = localStorage.getItem('aimly_token');
        if (token) {
          chrome.runtime.sendMessage({ action: 'SYNC_TOKEN', token }).catch(() => {});
        }
      } catch {}
    };
    syncToken();
    window.addEventListener('storage', syncToken);
  }

  // Listen for messages from background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SHOW_DRIFT_OVERLAY') {
      showDriftOverlay(message);
      sendResponse({ status: 'overlay_shown' });
    } else if (message.action === 'DISMISS_DRIFT_OVERLAY') {
      removeOverlay();
      sendResponse({ status: 'overlay_dismissed' });
    }
  });

  function showDriftOverlay({ goal, score, mode, page_visit_id, domain, backend_url, token }) {
    if (shadowHost) {
      removeOverlay();
    }

    shadowHost = document.createElement('div');
    shadowHost.id = 'aimly-drift-host';
    shadowHost.style.position = 'fixed';
    shadowHost.style.top = '0';
    shadowHost.style.left = '0';
    shadowHost.style.width = '100vw';
    shadowHost.style.height = '100vh';
    shadowHost.style.zIndex = '2147483647';
    shadowHost.style.pointerEvents = 'auto';

    shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    // Link overlay.css
    const cssUrl = chrome.runtime.getURL('overlay.css');
    const linkElem = document.createElement('link');
    linkElem.setAttribute('rel', 'stylesheet');
    linkElem.setAttribute('href', cssUrl);
    shadowRoot.appendChild(linkElem);

    // Build Backdrop & Card
    const backdrop = document.createElement('div');
    backdrop.className = 'aimly-backdrop';

    const card = document.createElement('div');
    card.className = 'aimly-card';
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'aimly-heading');

    const matchPct = Math.round((score || 0) * 100);
    const isStrict = mode === 'strict';

    card.innerHTML = `
      <div class="aimly-icon-container">
        <svg class="aimly-icon" viewBox="0 0 24 24">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
      </div>

      <h2 id="aimly-heading" class="aimly-heading">You're Drifting From Your Aim</h2>
      
      <div class="aimly-goal-chip" title="${escapeHtml(goal || '')}">
        Aim: ${escapeHtml(goal || 'Your Focus Goal')}
      </div>

      <div>
        <span class="aimly-match-badge">Relevance: ${matchPct}%</span>
      </div>

      ${
        isStrict
          ? `
        <p class="aimly-strict-hint">
          Strict mode is active. Close this tab to stay in your flow state and protect your streak.
        </p>
        <div class="aimly-button-group">
          <button id="aimly-btn-close-tab" class="aimly-btn aimly-btn-strict" autofocus>
            Close This Tab
          </button>
        </div>
      `
          : `
        <div class="aimly-button-group">
          <button id="aimly-btn-continue" class="aimly-btn aimly-btn-primary" autofocus>
            Continue with Goal
          </button>
          <button id="aimly-btn-discard" class="aimly-btn aimly-btn-secondary">
            Discard Session
          </button>
        </div>
        <div>
          <button id="aimly-btn-feedback" class="aimly-feedback-link">
            This page is relevant to my goal
          </button>
        </div>
      `
      }
    `;

    backdrop.appendChild(card);
    shadowRoot.appendChild(backdrop);
    document.body.appendChild(shadowHost);

    // Wire Interactive Actions
    if (isStrict) {
      const closeBtn = shadowRoot.getElementById('aimly-btn-close-tab');
      closeBtn?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'CLOSE_CURRENT_TAB' });
      });

      // Strict mode: Trap focus, Escape key does nothing
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
        }
      });
    } else {
      // Soft mode handlers
      const continueBtn = shadowRoot.getElementById('aimly-btn-continue');
      continueBtn?.addEventListener('click', () => {
        removeOverlay();
      });

      const discardBtn = shadowRoot.getElementById('aimly-btn-discard');
      discardBtn?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'DISCARD_ACTIVE_SESSION' });
        removeOverlay();
      });

      const feedbackBtn = shadowRoot.getElementById('aimly-btn-feedback');
      feedbackBtn?.addEventListener('click', async () => {
        chrome.runtime.sendMessage({
          action: 'SUBMIT_FEEDBACK',
          page_visit_id,
          domain: domain || window.location.hostname,
          label: 'relevant',
        });
        removeOverlay();
      });

      // Allow Escape in soft mode
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          removeOverlay();
          window.removeEventListener('keydown', handleEscape);
        }
      };
      window.addEventListener('keydown', handleEscape);
    }
  }

  function removeOverlay() {
    if (shadowHost) {
      shadowHost.remove();
      shadowHost = null;
      shadowRoot = null;
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
