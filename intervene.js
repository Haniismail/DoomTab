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

    // Style injection
    const style = document.createElement('style');
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed; inset: 0; z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: doomtab-fadein .3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      @keyframes doomtab-fadein {
        from { opacity: 0; } to { opacity: 1; }
      }
      .doomtab-card {
        background: #0d0d12;
        border: 1px solid rgba(232,64,96,.3);
        border-radius: 16px;
        padding: 32px 28px;
        max-width: 380px; width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,.5), 0 0 40px rgba(232,64,96,.1);
        animation: doomtab-slidein .3s ease;
      }
      @keyframes doomtab-slidein {
        from { transform: scale(.9) translateY(20px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
      .doomtab-icon {
        font-size: 48px; margin-bottom: 12px;
        animation: doomtab-pulse 2s infinite;
      }
      @keyframes doomtab-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      .doomtab-title {
        font-size: 20px; font-weight: 800; color: #e84060;
        margin-bottom: 12px; letter-spacing: -.02em;
      }
      .doomtab-message {
        font-size: 14px; color: #b0b0cc; line-height: 1.6;
        margin-bottom: 16px;
      }
      .doomtab-message strong {
        color: #ecedf0; font-weight: 700;
      }
      .doomtab-badge {
        display: inline-block;
        background: rgba(232,64,96,.1);
        border: 1px solid rgba(232,64,96,.2);
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 12px; font-weight: 700; color: #e84060;
        margin-bottom: 20px;
      }
      .doomtab-buttons {
        display: flex; gap: 8px;
      }
      .doomtab-btn {
        flex: 1; padding: 10px 8px;
        border-radius: 8px; border: 1px solid #2a2a42;
        font-size: 13px; font-weight: 700;
        cursor: pointer; transition: all .15s;
        font-family: inherit;
      }
      .doomtab-btn-continue {
        background: rgba(232,192,64,.08); color: #e8c040;
        border-color: rgba(232,192,64,.3);
      }
      .doomtab-btn-continue:hover {
        background: rgba(232,192,64,.15);
      }
      .doomtab-btn-close {
        background: rgba(232,64,96,.1); color: #e84060;
        border-color: rgba(232,64,96,.3);
      }
      .doomtab-btn-close:hover {
        background: rgba(232,64,96,.2);
      }
      .doomtab-btn-later {
        background: rgba(80,80,104,.15); color: #8888a0;
        border-color: rgba(80,80,104,.3);
      }
      .doomtab-btn-later:hover {
        background: rgba(80,80,104,.25);
      }
    `;

    document.documentElement.appendChild(style);
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
        style.remove();
      }, 200);
    }
  }
})();
