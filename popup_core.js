'use strict';

// ─── Render All ───────────────────────────────────────────────────────────────

function renderAll(entries) {
  const role = userRole || 'other';
  const breakdown = computeFocusBreakdown(entries, role);

  renderScoreRing(breakdown.score);
  renderScoreBreakdown(breakdown);
  renderToday(entries);
  renderInsight(entries, breakdown.score);
  renderChart(entries);
  renderStreak(entries);
  renderPatterns();
  renderTriggers();
  renderFocus();
  renderRabbitHole();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await load();

  initOnboarding();   // also calls updateTrackingDot() internally
  initSettings();

  // ─── Date Navigator ───
  window.currentDayOffset = 0;

  function updateNavigator() {
    const label = document.getElementById('date-label');
    const prev = document.getElementById('date-prev');
    const next = document.getElementById('date-next');
    
    if (window.currentDayOffset === 0) {
      label.textContent = 'Today';
      next.disabled = true;
    } else if (window.currentDayOffset === 1) {
      label.textContent = 'Yesterday';
      next.disabled = false;
    } else {
      const d = new Date();
      d.setDate(d.getDate() - window.currentDayOffset);
      label.textContent = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      next.disabled = false;
    }
    
    // Disable prev if no older data
    const dPrev = new Date();
    dPrev.setDate(dPrev.getDate() - (window.currentDayOffset + 1));
    const nextKey = `_day_${dPrev.toISOString().slice(0, 10)}`;
    let hasOlder = false;
    for (const key of Object.keys(storage)) {
      if (key.startsWith('_day_')) {
        const dKey = new Date(key.substring(5));
        // Reset hours just in case timezones exist
        dKey.setHours(0,0,0,0);
        const check = new Date(dPrev);
        check.setHours(0,0,0,0);
        if (dKey <= check) hasOlder = true;
      }
    }
    prev.disabled = !hasOlder;
  }

  function changeDayOffset(delta) {
    window.currentDayOffset += delta;
    updateNavigator();
    const entries = dateEntries(storage, window.currentDayOffset);
    renderAll(entries);
  }

  document.getElementById('date-prev').addEventListener('click', () => {
    changeDayOffset(1);
  });

  document.getElementById('date-next').addEventListener('click', () => {
    if (window.currentDayOffset > 0) {
      changeDayOffset(-1);
    }
  });

  if (userRole) {
    updateNavigator();
    const entries = dateEntries(storage, window.currentDayOffset || 0);
    renderAll(entries);
  }

  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  // Doom / Good toggle
  document.getElementById('toggle-doom').addEventListener('click', () => {
    if (todayView === 'doom') return;
    todayView = 'doom';
    const entries = dateEntries(storage, window.currentDayOffset || 0);
    const role = userRole || 'other';
    const breakdown = computeFocusBreakdown(entries, role);
    renderToday(entries);
    renderInsight(entries, breakdown.score);
    const groups = document.getElementById('today-groups');
    groups.classList.add('fade-in');
    groups.addEventListener('animationend', () => groups.classList.remove('fade-in'), { once: true });
  });

  document.getElementById('toggle-good').addEventListener('click', () => {
    if (todayView === 'good') return;
    todayView = 'good';
    const entries = dateEntries(storage, window.currentDayOffset || 0);
    const role = userRole || 'other';
    const breakdown = computeFocusBreakdown(entries, role);
    renderToday(entries);
    renderInsight(entries, breakdown.score);
    const groups = document.getElementById('today-groups');
    groups.classList.add('fade-in');
    groups.addEventListener('animationend', () => groups.classList.remove('fade-in'), { once: true });
  });

  document.getElementById('export-btn').addEventListener('click', () =>
    exportCSV(dateEntries(storage, window.currentDayOffset || 0)));
});

