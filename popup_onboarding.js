'use strict';

// ─── Greeting ─────────────────────────────────────────────────────────────────

function renderGreeting() {
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
  el.textContent = name ? `${phrase}, ${name}.` : `${phrase}.`;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function initOnboarding() {
  const onb  = document.getElementById('onboarding');
  const main = document.getElementById('main-ui');

  if (userRole) {
    onb.classList.add('hidden');
    main.classList.add('visible');
    renderGreeting();
    return;
  }

  // ── Step 1: Name ──
  const nameInput = document.getElementById('onb-name-input');
  const nameBtn   = document.getElementById('onb-name-btn');
  const stepName  = document.getElementById('onb-step-name');
  const stepRole  = document.getElementById('onb-step-role');

  nameInput.addEventListener('input', () => {
    nameBtn.disabled = nameInput.value.trim().length === 0;
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && nameInput.value.trim().length > 0) nameBtn.click();
  });

  nameBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    userName = name;
    // Animate transition between steps
    stepName.classList.remove('active');
    stepRole.classList.add('active');
  });

  // ── Step 2: Role ──
  document.getElementById('role-grid').addEventListener('click', async (e) => {
    const btn = e.target.closest('.role-btn');
    if (!btn) return;

    const role = btn.dataset.role;
    await chrome.storage.local.set({ _userRole: role, _userName: userName || '' });
    userRole = role;

    onb.classList.add('hidden');
    main.classList.add('visible', 'fade-in');
    renderGreeting();

    const entries = todayEntries(storage);
    renderAll(entries);
  });
}

// ─── Settings (change role) ───────────────────────────────────────────────────

function initSettings() {
  document.getElementById('settings-btn').addEventListener('click', async () => {
    await chrome.storage.local.remove(['_userRole', '_userName']);
    userRole = null;
    userName = null;

    const onb  = document.getElementById('onboarding');
    const main = document.getElementById('main-ui');
    const stepName = document.getElementById('onb-step-name');
    const stepRole = document.getElementById('onb-step-role');

    // Reset onboarding to step 1
    stepRole.classList.remove('active');
    stepName.classList.add('active');
    document.getElementById('onb-name-input').value = '';
    document.getElementById('onb-name-btn').disabled = true;

    main.classList.remove('visible');
    onb.classList.remove('hidden');
  });
}

