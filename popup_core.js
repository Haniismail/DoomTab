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

  initOnboarding();
  initSettings();

  if (userRole) {
    const entries = todayEntries(storage);
    renderAll(entries);
  }

  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  // Doom / Good toggle
  document.getElementById('toggle-doom').addEventListener('click', () => {
    if (todayView === 'doom') return;
    todayView = 'doom';
    const entries = todayEntries(storage);
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
    const entries = todayEntries(storage);
    const role = userRole || 'other';
    const breakdown = computeFocusBreakdown(entries, role);
    renderToday(entries);
    renderInsight(entries, breakdown.score);
    const groups = document.getElementById('today-groups');
    groups.classList.add('fade-in');
    groups.addEventListener('animationend', () => groups.classList.remove('fade-in'), { once: true });
  });

  document.getElementById('export-btn').addEventListener('click', () =>
    exportCSV(todayEntries(storage)));
});

