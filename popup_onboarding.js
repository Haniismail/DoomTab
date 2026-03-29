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
  const dot = document.querySelector('.header-dot');
  if (!dot) return;
  const { _activeTab } = await chrome.storage.local.get('_activeTab');
  dot.classList.toggle('tracking', !!_activeTab);
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

    const entries = dateEntries(storage, window.currentDayOffset || 0);
    renderAll(entries);
  });
}

// ─── Settings (reset name) ────────────────────────────────────────────────────

function initSettings() {
  document.getElementById('settings-btn').addEventListener('click', async () => {
    await chrome.storage.local.remove(['_userRole', '_userName']);
    userRole = null;
    userName = null;

    const onb  = document.getElementById('onboarding');
    const main = document.getElementById('main-ui');
    const nameInput = document.getElementById('onb-name-input');

    nameInput.value = '';
    document.getElementById('onb-name-btn').disabled = true;

    main.classList.remove('visible');
    onb.classList.remove('hidden');
  });
}
