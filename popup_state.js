'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

let storage = {};
let userRole = null;
let userName = null;

async function load() {
  storage = await chrome.storage.local.get(null);
  userRole = storage._userRole || null;
  userName = storage._userName || null;

  // Calculate pending time for the currently active tab
  if (storage._activeTab && storage._startTime) {
    const pendingSec = Math.floor((Date.now() - storage._startTime) / 1000);
    if (pendingSec > 0 && pendingSec < 86400) {
      const domain = storage._activeTab.url
        ? (() => { try { return new URL(storage._activeTab.url).hostname; } catch { return null; } })()
        : null;
      if (domain) {
        const current = (typeof storage[domain] === 'number') ? storage[domain] : 0;
        storage[domain] = current + pendingSec;
      }
    }
  }
}

// ─── Collecting State ─────────────────────────────────────────────────────────

function renderCollecting(container, icon, days, minDays, titleText, message) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'collecting';

  const ic = document.createElement('div');
  ic.className = 'collecting-icon';
  ic.textContent = icon;

  const title = document.createElement('div');
  title.className = 'collecting-title';
  title.textContent = titleText || 'Collecting data…';

  const sub = document.createElement('div');
  sub.className = 'collecting-sub';
  sub.textContent = message;

  const bar = document.createElement('div');
  bar.className = 'collecting-bar';
  const fill = document.createElement('div');
  fill.className = 'collecting-fill';
  fill.style.width = `${Math.min(Math.round((days / minDays) * 100), 100)}%`;
  bar.appendChild(fill);

  const progress = document.createElement('div');
  progress.className = 'collecting-sub';
  
  if (days >= minDays) {
    progress.textContent = `Gathering more usage data...`;
  } else {
    progress.textContent = `${days} of ${minDays} days collected`;
  }

  wrap.append(ic, title, sub, bar, progress);
  container.appendChild(wrap);
}

