/**
 * intervene.js — DoomTab Content Script
 * Injects a full-screen intervention overlay when the user enters a rabbit hole.
 * Receives messages from background.js with distraction context.
 */

(() => {
  // Prevent double injection
  if (window.__doomtab_intervene__) return;
  window.__doomtab_intervene__ = true;

  const OVERLAY_ID = 'doomtab-intervention-overlay';

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== 'DOOMTAB_INTERVENE') return;
    showIntervention(msg);
    sendResponse({ ok: true });
  });

  function showIntervention(data) {
    // Don't stack overlays
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;

    // Build the card
    const card = document.createElement('div');
    card.className = 'doomtab-card';

    // Skull icon
    const icon = document.createElement('div');
    icon.className = 'doomtab-icon';
    icon.textContent = '💀';

    // Title
    const title = document.createElement('div');
    title.className = 'doomtab-title';
    title.textContent = 'Rabbit Hole Detected';

    // Message
    const message = document.createElement('div');
    message.className = 'doomtab-message';

    if (data.trigger) {
      message.innerHTML = `You came from <strong>${data.fromDomain}</strong> and just entered <strong>${data.domain}</strong>.<br>This pattern has happened <strong>${data.triggerCount}× before</strong>.`;
    } else {
      message.innerHTML = `You've already spent <strong>${data.timeSpent}</strong> on ${data.category} today.<br>Still worth it?`;
    }

    // Time badge
    const badge = document.createElement('div');
    badge.className = 'doomtab-badge';
    badge.textContent = `${data.category} · ${data.timeSpent} today`;

    // Buttons
    const buttons = document.createElement('div');
    buttons.className = 'doomtab-buttons';

    const btnContinue = document.createElement('button');
    btnContinue.className = 'doomtab-btn doomtab-btn-continue';
    btnContinue.textContent = '⏱ 5 min';
    btnContinue.title = 'Continue for 5 minutes, then remind again';

    const btnClose = document.createElement('button');
    btnClose.className = 'doomtab-btn doomtab-btn-close';
    btnClose.textContent = '✖ Close Tab';
    btnClose.title = 'Close this tab and get back to work';

    const btnLater = document.createElement('button');
    btnLater.className = 'doomtab-btn doomtab-btn-later';
    btnLater.textContent = '⏰ Later';
    btnLater.title = 'Snooze for 30 minutes';

    buttons.append(btnContinue, btnClose, btnLater);

    // Assemble
    card.append(icon, title, message, badge, buttons);
    overlay.appendChild(card);

    document.documentElement.appendChild(overlay);

    // Button handlers
    btnContinue.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'DOOMTAB_RESPONSE',
        action: 'continue',
        domain: data.domain,
        snoozeMins: 5, 
      });
      dismiss();
    });

    btnClose.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'DOOMTAB_RESPONSE',
        action: 'close',
        domain: data.domain,
      });
      dismiss();
    });

    btnLater.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'DOOMTAB_RESPONSE',
        action: 'later',
        domain: data.domain,
        snoozeMins: 30,
      });
      dismiss();
    });

    // ESC to dismiss (same as "later")
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        btnLater.click();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    function dismiss() {
      overlay.style.animation = 'doomtab-fadein .2s ease reverse';
      setTimeout(() => {
        overlay.remove();
      }, 200);
    }
  }
})();
