/**
 * background.js — DoomTab Service Worker v3.0
 *
 * Storage schema:
 *   _userId           — UUID (generated on first install)
 *   _userRole         — "developer" | "medical" | "journalist" | "other"
 *   _activeTab        — { url, tabId } currently tracked
 *   _startTime        — epoch ms of session start
 *   _currentDate      — "YYYY-MM-DD" for change detection
 *   _transitions      — [{ from, to, ts }] today's tab switch log (capped at 300)
 *   _hourly           — { "HH": { "domain": seconds } } today's hourly breakdown
 *   _day_YYYY-MM-DD   — { "domain": seconds, _transitions, _hourly } per-day archive
 *   "domain.com"      — number, today's live seconds (flat keys)
 *   _rabbitHole       — { enabled, sensitivity, stats, snooze }
 *   _interventionLog  — [{ domain, action, ts }] today's interventions
 */

// Import categories.js for categorize/DISTRACTION_CATEGORIES
importScripts('categories.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function extractDomain(url) {
  if (!url ||
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('about:') ||
      url.startsWith('edge://') ||
      url.startsWith('moz-extension://')) return null;
  try { return new URL(url).hostname || null; } catch { return null; }
}

function fmtBg(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ─── UUID Generation ──────────────────────────────────────────────────────────

async function ensureUserId() {
  const { _userId } = await chrome.storage.local.get('_userId');
  if (!_userId) {
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ _userId: id });
  }
}

// ─── Daily Reset ──────────────────────────────────────────────────────────────

async function performDailyReset(previousDate) {
  const allData = await chrome.storage.local.get(null);
  const archive = {};
  const toRemove = [];

  for (const [key, val] of Object.entries(allData)) {
    if (!key.startsWith('_') && typeof val === 'number') {
      archive[key] = val;
      toRemove.push(key);
    }
  }

  if (allData._transitions) archive._transitions = allData._transitions;
  if (allData._hourly) archive._hourly = allData._hourly;

  const updates = { _currentDate: getTodayKey() };
  if (Object.keys(archive).length > 0) {
    updates[`_day_${previousDate}`] = archive;
  }

  await chrome.storage.local.set(updates);

  toRemove.push('_transitions', '_hourly', '_interventionLog');
  if (toRemove.length > 0) await chrome.storage.local.remove(toRemove);
}

async function checkAndResetIfNewDay() {
  const { _currentDate } = await chrome.storage.local.get('_currentDate');
  const today = getTodayKey();
  if (_currentDate && _currentDate !== today) {
    await performDailyReset(_currentDate);
  } else if (!_currentDate) {
    await chrome.storage.local.set({ _currentDate: today });
  }
}

async function scheduleMidnightAlarm() {
  await chrome.alarms.clear('dailyReset');
  chrome.alarms.create('dailyReset', {
    when: Date.now() + getMsUntilMidnight(),
    periodInMinutes: 1440,
  });
}

async function scheduleHeartbeat() {
  await chrome.alarms.clear('heartbeat');
  chrome.alarms.create('heartbeat', {
    delayInMinutes: 0.5,
    periodInMinutes: 0.5,
  });
}

async function scheduleStreakCheck() {
  await chrome.alarms.clear('streakCheck');
  // Fire 2 hours before midnight
  const msUntilMidnight = getMsUntilMidnight();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  let delay = msUntilMidnight - twoHoursMs;
  if (delay < 0) delay += 24 * 60 * 60 * 1000; // already past 10pm, schedule for tomorrow
  chrome.alarms.create('streakCheck', {
    when: Date.now() + delay,
    periodInMinutes: 1440,
  });
}

async function checkStreakWarning() {
  // Compute today's focus score
  const allData = await chrome.storage.local.get(null);
  const role = allData._userRole || 'other';
  const entries = [];
  for (const [key, val] of Object.entries(allData)) {
    if (!key.startsWith('_') && typeof val === 'number') {
      entries.push([key, val]);
    }
  }
  if (entries.length === 0) return;

  // Calculate focus score using same logic as computeFocusBreakdown
  let productive = 0, distraction = 0;
  const productiveCats = ROLE_PRODUCTIVE[role] || ROLE_PRODUCTIVE.other;
  const prodSet = new Set(productiveCats);

  for (const [domain, sec] of entries) {
    const cat = categorize(domain);
    if (DISTRACTION_CATEGORIES.includes(cat)) distraction += sec;
    else if (prodSet.has(cat)) productive += sec;
  }

  const scored = productive + distraction;
  if (scored === 0) return;
  const score = Math.round((productive / scored) * 100);

  if (score >= 60) return; // they're fine

  // Check if they had a streak going (look at yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = `_day_${yesterday.toISOString().slice(0, 10)}`;
  const yArchive = allData[yKey];
  if (!yArchive) return; // no data = no streak to lose

  const yEntries = Object.entries(yArchive).filter(
    ([k, v]) => !k.startsWith('_') && typeof v === 'number'
  );
  if (yEntries.length === 0) return;

  let yProd = 0, yDist = 0;
  for (const [domain, sec] of yEntries) {
    const cat = categorize(domain);
    if (DISTRACTION_CATEGORIES.includes(cat)) yDist += sec;
    else if (prodSet.has(cat)) yProd += sec;
  }
  const yScored = yProd + yDist;
  if (yScored === 0) return;
  const yScore = Math.round((yProd / yScored) * 100);

  if (yScore < 60) return; // no streak to lose anyway

  // They had a streak yesterday and are about to lose it!
  try {
    chrome.notifications.create('streakWarning', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '🔥 Your streak is in danger!',
      message: `Your focus score is ${score}% — you need ≥60% to keep your streak alive. 2 hours left!`,
      priority: 2,
    });
  } catch { /* notifications permission might not be granted */ }
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

async function flushTime(activeTab, startTimeMs) {
  const domain = activeTab.domain || extractDomain(activeTab.url);
  if (!domain) return;
  const elapsed = Math.floor((Date.now() - startTimeMs) / 1000);
  if (elapsed <= 0) return;

  const result = await chrome.storage.local.get([domain, '_hourly']);
  const prev = typeof result[domain] === 'number' ? result[domain] : 0;

  const hour = String(new Date().getHours()).padStart(2, '0');
  const hourly = result._hourly || {};
  if (!hourly[hour]) hourly[hour] = {};
  hourly[hour][domain] = (hourly[hour][domain] || 0) + elapsed;

  await chrome.storage.local.set({
    [domain]: prev + elapsed,
    _hourly: hourly,
  });
}

async function logTransition(fromDomain, toDomain) {
  if (!fromDomain || !toDomain || fromDomain === toDomain) return;
  const { _transitions } = await chrome.storage.local.get('_transitions');
  const transitions = Array.isArray(_transitions) ? _transitions : [];
  transitions.push({ from: fromDomain, to: toDomain, ts: Date.now() });
  if (transitions.length > 300) transitions.splice(0, transitions.length - 300);
  await chrome.storage.local.set({ _transitions: transitions });
}

async function updateActionBadge(domain) {
  if (!domain) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  const { _userRole } = await chrome.storage.local.get('_userRole');
  const role = _userRole || 'other';
  const cat = categorize(domain);
  const prodCats = ROLE_PRODUCTIVE[role] || ROLE_PRODUCTIVE.other;

  if (DISTRACTION_CATEGORIES.includes(cat)) {
    chrome.action.setBadgeText({ text: 'DOOM' });
    chrome.action.setBadgeBackgroundColor({ color: '#e84060' });
  } else if (prodCats.includes(cat)) {
    chrome.action.setBadgeText({ text: 'WORK' });
    chrome.action.setBadgeBackgroundColor({ color: '#56c9a0' });
  } else {
    chrome.action.setBadgeText({ text: '' }); // Neutral or Uncategorized
  }
}

async function startTracking(url, tabId) {
  let domain = extractDomain(url);
  if (!domain) {
    await chrome.storage.local.remove(['_activeTab', '_startTime']);
    updateActionBadge(null);
    return;
  }

  // Attempt to get YouTube specific genre
  if (domain === 'youtube.com' && tabId && url.includes('/watch')) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const m = document.querySelector('meta[itemprop="genre"]');
          return m ? m.content : null;
        }
      });
      if (results && results[0] && results[0].result) {
        domain = `youtube.com (${results[0].result})`;
      }
    } catch(e) {}
  }

  await chrome.storage.local.set({ _activeTab: { url, tabId, domain }, _startTime: Date.now() });
  updateActionBadge(domain);
  return domain;
}

async function transition(newUrl, newTabId) {
  await checkAndResetIfNewDay();
  const { _activeTab, _startTime } = await chrome.storage.local.get(['_activeTab', '_startTime']);

  const fromDomain = _activeTab ? (_activeTab.domain || extractDomain(_activeTab.url)) : null;
  
  if (_activeTab && _startTime) await flushTime(_activeTab, _startTime);

  const toDomain = await startTracking(newUrl || '', newTabId || null);

  if (fromDomain && toDomain) {
    await logTransition(fromDomain, toDomain);
  }

  // Check for rabbit hole intervention
  if (toDomain && newTabId) {
    await checkRabbitHole(fromDomain, toDomain, newTabId);
  }
}

async function pauseTracking() {
  const { _activeTab, _startTime } = await chrome.storage.local.get(['_activeTab', '_startTime']);
  if (_activeTab && _startTime) await flushTime(_activeTab, _startTime);
  await chrome.storage.local.remove(['_activeTab', '_startTime']);
}

async function resumeFromActiveTab() {
  await checkAndResetIfNewDay();
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab && tab.url) await transition(tab.url, tab.id);
  } catch { /* ignore */ }
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

async function heartbeatFlush() {
  const { _activeTab, _startTime } = await chrome.storage.local.get(['_activeTab', '_startTime']);
  if (!_activeTab || !_startTime) return;
  await flushTime(_activeTab, _startTime);
  await chrome.storage.local.set({ _startTime: Date.now() });

  // Evaluate rabbit hole threshold while the user is actively sitting on this tab
  const domain = _activeTab.domain || extractDomain(_activeTab.url);
  if (domain && _activeTab.tabId) {
    await checkRabbitHole(null, domain, _activeTab.tabId);
  }
}

// ─── Rabbit Hole Detection ───────────────────────────────────────────────────

async function getRabbitHoleSettings() {
  const { _rabbitHole } = await chrome.storage.local.get('_rabbitHole');
  return _rabbitHole || { enabled: false, sensitivity: 'moderate' };
}

async function checkRabbitHole(fromDomain, toDomain, tabId) {
  const settings = await getRabbitHoleSettings();
  if (!settings.enabled) return;

  const cat = categorize(toDomain);
  const isDistraction = DISTRACTION_CATEGORIES.includes(cat);
  if (!isDistraction) return;

  // Check snooze
  const { _rabbitSnooze } = await chrome.storage.local.get('_rabbitSnooze');
  const snooze = _rabbitSnooze || {};
  const now = Date.now();
  if (snooze[toDomain] && snooze[toDomain] > now) return; // snoozed

  // Get time spent on this category today
  const allData = await chrome.storage.local.get(null);
  let categorySeconds = 0;
  for (const [key, val] of Object.entries(allData)) {
    if (!key.startsWith('_') && typeof val === 'number') {
      if (categorize(key) === cat) categorySeconds += val;
    }
  }

  // Sensitivity thresholds
  const thresholds = {
    aggressive: 60,    // 1 min on category → intervene
    moderate: 300,     // 5 min on category → intervene
    chill: 900,        // 15 min on category → intervene
  };
  const threshold = thresholds[settings.sensitivity] || thresholds.moderate;

  // Check for trigger pattern (from productive → distraction)
  let isTrigger = false;
  let triggerCount = 0;
  if (fromDomain) {
    const fromCat = categorize(fromDomain);
    const { _userRole } = await chrome.storage.local.get('_userRole');
    const role = _userRole || 'other';
    const prodCats = ROLE_PRODUCTIVE[role] || ROLE_PRODUCTIVE.other;
    const fromProductive = prodCats.includes(fromCat);

    if (fromProductive) {
      // Count how many times this pattern has occurred
      const transitions = allData._transitions || [];
      triggerCount = transitions.filter(t =>
        t.from === fromDomain && categorize(t.to) === cat
      ).length;

      if (triggerCount >= 2) isTrigger = true;
    }
  }

  // Decide whether to intervene
  const shouldIntervene = isTrigger || categorySeconds >= threshold;
  if (!shouldIntervene) return;

  // Inject content script and send message
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['intervene.js'],
    });

    // Inject CSS safely to bypass CSP restrictions on inline <style>
    await chrome.scripting.insertCSS({
      target: { tabId },
      css: `
        #doomtab-intervention-overlay {
          position: fixed; inset: 0; z-index: 2147483647;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,.7) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px);
          animation: doomtab-fadein .3s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        @keyframes doomtab-fadein { from { opacity: 0; } to { opacity: 1; } }
        .doomtab-card {
          background: #0d0d12 !important;
          border: 1px solid rgba(232,64,96,.3) !important;
          border-radius: 16px !important;
          padding: 32px 28px !important;
          max-width: 380px !important; width: 90% !important;
          text-align: center !important;
          box-shadow: 0 20px 60px rgba(0,0,0,.5), 0 0 40px rgba(232,64,96,.1) !important;
          animation: doomtab-slidein .3s ease;
        }
        @keyframes doomtab-slidein {
          from { transform: scale(.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .doomtab-icon {
          font-size: 48px !important; margin-bottom: 12px !important;
          animation: doomtab-pulse 2s infinite;
        }
        @keyframes doomtab-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .doomtab-title {
          font-size: 20px !important; font-weight: 800 !important; color: #e84060 !important;
          margin-bottom: 12px !important; letter-spacing: -.02em !important;
        }
        .doomtab-message {
          font-size: 14px !important; color: #b0b0cc !important; line-height: 1.6 !important;
          margin-bottom: 16px !important;
        }
        .doomtab-message strong { color: #ecedf0 !important; font-weight: 700 !important; }
        .doomtab-badge {
          display: inline-block !important;
          background: rgba(232,64,96,.1) !important;
          border: 1px solid rgba(232,64,96,.2) !important;
          border-radius: 20px !important;
          padding: 6px 14px !important;
          font-size: 12px !important; font-weight: 700 !important; color: #e84060 !important;
          margin-bottom: 20px !important;
        }
        .doomtab-buttons { display: flex !important; gap: 8px !important; }
        .doomtab-btn {
          flex: 1 !important; padding: 10px 8px !important;
          border-radius: 8px !important; border: 1px solid #2a2a42 !important;
          font-size: 13px !important; font-weight: 700 !important;
          cursor: pointer !important; transition: all .15s !important;
          font-family: inherit !important;
        }
        .doomtab-btn-continue { background: rgba(232,192,64,.08) !important; color: #e8c040 !important; border-color: rgba(232,192,64,.3) !important; }
        .doomtab-btn-continue:hover { background: rgba(232,192,64,.15) !important; }
        .doomtab-btn-close { background: rgba(232,64,96,.1) !important; color: #e84060 !important; border-color: rgba(232,64,96,.3) !important; }
        .doomtab-btn-close:hover { background: rgba(232,64,96,.2) !important; }
        .doomtab-btn-later { background: rgba(80,80,104,.15) !important; color: #8888a0 !important; border-color: rgba(80,80,104,.3) !important; }
        .doomtab-btn-later:hover { background: rgba(80,80,104,.25) !important; }
      `
    });

    // Small delay to let script initialize
    await new Promise(r => setTimeout(r, 100));

    await chrome.tabs.sendMessage(tabId, {
      type: 'DOOMTAB_INTERVENE',
      domain: toDomain,
      fromDomain: fromDomain || '',
      category: cat,
      timeSpent: fmtBg(categorySeconds),
      trigger: isTrigger,
      triggerCount: triggerCount,
    });

    // Log the intervention
    await logIntervention(toDomain, 'shown');
  } catch (e) {
    // Can't inject on some pages (chrome://, etc.) — ignore
  }
}

async function logIntervention(domain, action) {
  const { _interventionLog } = await chrome.storage.local.get('_interventionLog');
  const log = Array.isArray(_interventionLog) ? _interventionLog : [];
  log.push({ domain, action, ts: Date.now() });
  if (log.length > 100) log.splice(0, log.length - 100);
  await chrome.storage.local.set({ _interventionLog: log });
}

// ─── Message Handling (from content script) ──────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'DOOMTAB_RESPONSE') return;

  (async () => {
    await logIntervention(msg.domain, msg.action);

    if (msg.action === 'close' && sender.tab) {
      try { await chrome.tabs.remove(sender.tab.id); } catch {}
    }

    if ((msg.action === 'continue' || msg.action === 'later') && msg.snoozeMins) {
      const { _rabbitSnooze } = await chrome.storage.local.get('_rabbitSnooze');
      const snooze = _rabbitSnooze || {};
      snooze[msg.domain] = Date.now() + msg.snoozeMins * 60 * 1000;
      await chrome.storage.local.set({ _rabbitSnooze: snooze });
    }

    // Update stats
    const { _rabbitHole } = await chrome.storage.local.get('_rabbitHole');
    const rh = _rabbitHole || { enabled: true, sensitivity: 'moderate' };
    if (!rh.stats) rh.stats = { shown: 0, closed: 0, continued: 0, snoozed: 0 };
    rh.stats.shown++;
    if (msg.action === 'close') rh.stats.closed++;
    else if (msg.action === 'continue') rh.stats.continued++;
    else if (msg.action === 'later') rh.stats.snoozed++;
    await chrome.storage.local.set({ _rabbitHole: rh });

    sendResponse({ ok: true });
  })();

  return true; // async
});

// ─── Listeners ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await ensureUserId();
  await scheduleMidnightAlarm();
  await scheduleHeartbeat();
  await scheduleStreakCheck();
  await resumeFromActiveTab();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureUserId();
  await scheduleMidnightAlarm();
  await scheduleHeartbeat();
  await scheduleStreakCheck();
  await resumeFromActiveTab();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'heartbeat') {
    await heartbeatFlush();
    return;
  }
  if (alarm.name === 'dailyReset') {
    const { _activeTab, _startTime } = await chrome.storage.local.get(['_activeTab', '_startTime']);
    if (_activeTab && _startTime) await flushTime(_activeTab, _startTime);
    const { _currentDate } = await chrome.storage.local.get('_currentDate');
    if (_currentDate) await performDailyReset(_currentDate);
    if (_activeTab) await startTracking(_activeTab.url, _activeTab.tabId);
  }
  if (alarm.name === 'streakCheck') {
    await checkStreakWarning();
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await transition(tab.url || '', tab.id);
  } catch { /* tab closed */ }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url || !tab.active) return;
  await transition(changeInfo.url, tabId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await pauseTracking();
  } else {
    await resumeFromActiveTab();
  }
});
