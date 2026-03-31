'use strict';

// ─── Greeting ─────────────────────────────────────────────────────────────────

let greetingInterval;

function renderGreeting(animate = false) {
  const el = document.getElementById('header-greeting');
  if (!el) return;
  const name = userName ? userName.split(' ')[0] : null;
  const hour = new Date().getHours();

  const greetings = {
    dawn:    ['Rise and shine', 'Early bird mode', 'Morning locked in', 'Up before the world'],
    morning: ['Good morning', 'Let\'s make it count', 'Fresh start', 'Morning grind activated'],
    noon:    ['Stay locked in', 'Keep the momentum', 'Midday focus', 'Don\'t lose the streak'],
    evening: ['Evening grind', 'Final stretch', 'Make tonight count', 'Late push activated'],
    night:   ['Night owl mode', 'Burning midnight oil', 'Late night locked in', 'Dark mode, dark grind'],
  };

  let bank;
  if (hour >= 5 && hour < 8)   bank = greetings.dawn;
  else if (hour >= 8 && hour < 12)  bank = greetings.morning;
  else if (hour >= 12 && hour < 17) bank = greetings.noon;
  else if (hour >= 17 && hour < 21) bank = greetings.evening;
  else                               bank = greetings.night;

  const phrase = bank[Math.floor(Math.random() * bank.length)];
  const fullText = name ? `${phrase}, ${name}.` : `${phrase}.`;

  if (greetingInterval) clearInterval(greetingInterval);
  el.textContent = '';
  
  if (animate) {
    let i = 0;
    greetingInterval = setInterval(() => {
      if (i < fullText.length) {
        el.textContent += fullText.charAt(i);
        i++;
      } else {
        clearInterval(greetingInterval);
        greetingInterval = null;
      }
    }, 40);
  } else {
    el.textContent = fullText;
  }
}

// ─── Tracking Dot ─────────────────────────────────────────────────────────────
// Pulses the header dot with a vivid glow when the extension is actively tracking

async function updateTrackingDot() {
  const dot = document.getElementById('header-dot');
  if (!dot) return;
  const { _activeTab, _paused } = await chrome.storage.local.get(['_activeTab', '_paused']);
  dot.classList.toggle('tracking', !!_activeTab && !_paused);
  dot.classList.toggle('paused', !!_paused);
}

// ─── Pause Button ─────────────────────────────────────────────────────────────

async function initPauseButton() {
  const btn = document.getElementById('pause-btn');
  if (!btn) return;

  // Set initial state
  const { _paused } = await chrome.storage.local.get('_paused');
  btn.textContent = _paused ? '▶' : '⏸';
  btn.title = _paused ? 'Resume tracking' : 'Pause tracking';
  btn.classList.toggle('paused', !!_paused);

  btn.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ type: 'DOOMTAB_TOGGLE_PAUSE' });
    btn.textContent = response.paused ? '▶' : '⏸';
    btn.title = response.paused ? 'Resume tracking' : 'Pause tracking';
    btn.classList.toggle('paused', response.paused);
    await updateTrackingDot();
  });
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function initOnboarding() {
  const onb  = document.getElementById('onboarding');
  const main = document.getElementById('main-ui');

  // Already set up — go straight to main UI
  if (userRole) {
    onb.classList.add('hidden');
    main.classList.add('visible');
    renderGreeting();
    updateTrackingDot();
    initPauseButton();
    return;
  }

  // ── Name step ──
  const nameInput = document.getElementById('onb-name-input');
  const nameBtn   = document.getElementById('onb-name-btn');

  nameInput.addEventListener('input', () => {
    nameBtn.disabled = nameInput.value.trim().length === 0;
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && nameInput.value.trim().length > 0) nameBtn.click();
  });

  nameBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return;

    userName = name;
    userRole = 'other'; // default role — user can change via settings

    await chrome.storage.local.set({ _userRole: 'other', _userName: name });

    onb.classList.add('hidden');
    main.classList.add('visible', 'fade-in');
    renderGreeting(true);
    updateTrackingDot();
    initPauseButton();

    const entries = dateEntries(storage, window.currentDayOffset || 0);
    renderAll(entries);
  });
}

// ─── Settings Modal ────────────────────────────────────────────────────────────

function initSettings() {
  const overlay = document.getElementById('settings-overlay');
  const nameInput = document.getElementById('settings-name');
  const saveBtn = document.getElementById('settings-save');
  const closeBtn = document.getElementById('settings-close');

  // Open settings
  document.getElementById('settings-btn').addEventListener('click', () => {
    nameInput.value = userName || '';
    overlay.classList.add('visible');
    nameInput.focus();
  });

  // Close settings
  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('visible');
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('visible');
    }
  });

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const newName = nameInput.value.trim();
    if (!newName) return;

    userName = newName;
    await chrome.storage.local.set({ _userName: newName });
    
    renderGreeting();
    overlay.classList.remove('visible');
  });

  // Enter to save
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
    if (e.key === 'Escape') closeBtn.click();
  });
}
