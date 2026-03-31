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

// Get current entries based on weekly/daily mode
function getCurrentEntries() {
  if (weeklyMode) {
    return weeklyEntries(storage);
  }
  return dateEntries(storage, window.currentDayOffset || 0);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await load();

  initOnboarding();
  initSettings();

  // ─── Date Navigator ───
  window.currentDayOffset = 0;

  function updateNavigator() {
    const label = document.getElementById('date-label');
    const prev = document.getElementById('date-prev');
    const next = document.getElementById('date-next');
    const dailyBtn = document.getElementById('period-daily');
    const weeklyBtn = document.getElementById('period-weekly');
    
    // Update period toggle state
    dailyBtn.classList.toggle('active', !weeklyMode);
    weeklyBtn.classList.toggle('active', weeklyMode);
    
    if (weeklyMode) {
      label.textContent = 'This Week';
      prev.disabled = true;
      next.disabled = true;
    } else if (window.currentDayOffset === 0) {
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
    
    if (!weeklyMode) {
      const dPrev = new Date();
      dPrev.setDate(dPrev.getDate() - (window.currentDayOffset + 1));
      let hasOlder = false;
      for (const key of Object.keys(storage)) {
        if (key.startsWith('_day_')) {
          const dKey = new Date(key.substring(5));
          dKey.setHours(0,0,0,0);
          const check = new Date(dPrev);
          check.setHours(0,0,0,0);
          if (dKey <= check) hasOlder = true;
        }
      }
      prev.disabled = !hasOlder;
    }
  }

  function changeDayOffset(delta) {
    window.currentDayOffset += delta;
    updateNavigator();
    const entries = getCurrentEntries();
    renderAll(entries);
  }

  document.getElementById('date-prev').addEventListener('click', () => {
    if (!weeklyMode) changeDayOffset(1);
  });

  document.getElementById('date-next').addEventListener('click', () => {
    if (!weeklyMode && window.currentDayOffset > 0) {
      changeDayOffset(-1);
    }
  });

  // Period toggle (Daily/Weekly)
  document.getElementById('period-daily').addEventListener('click', () => {
    if (!weeklyMode) return;
    weeklyMode = false;
    updateNavigator();
    renderAll(getCurrentEntries());
  });

  document.getElementById('period-weekly').addEventListener('click', () => {
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'streak' || activeTab === 'rabbit') return;
    if (weeklyMode) return;
    weeklyMode = true;
    updateNavigator();
    renderAll(getCurrentEntries());
  });

  if (userRole) {
    updateNavigator();
    renderAll(getCurrentEntries());
  }

  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      showTab(btn.dataset.tab);
      const periodToggle = document.getElementById('period-toggle');
      if (btn.dataset.tab === 'streak' || btn.dataset.tab === 'rabbit') {
        periodToggle.style.display = 'none';
      } else {
        periodToggle.style.display = '';
      }
    }));

  // Doom / Good toggle
  document.getElementById('toggle-doom').addEventListener('click', () => {
    if (todayView === 'doom') return;
    todayView = 'doom';
    const entries = getCurrentEntries();
    const breakdown = computeFocusBreakdown(entries, userRole || 'other');
    renderToday(entries);
    renderInsight(entries, breakdown.score);
  });

  document.getElementById('toggle-good').addEventListener('click', () => {
    if (todayView === 'good') return;
    todayView = 'good';
    const entries = getCurrentEntries();
    const breakdown = computeFocusBreakdown(entries, userRole || 'other');
    renderToday(entries);
    renderInsight(entries, breakdown.score);
  });

  // Export CSV with prompt
  const exportOverlay = document.getElementById('export-overlay');
  
  document.getElementById('export-btn').addEventListener('click', () => {
    exportOverlay.classList.add('visible');
  });
  
  exportOverlay.addEventListener('click', (e) => {
    if (e.target === exportOverlay) exportOverlay.classList.remove('visible');
  });
  
  document.getElementById('export-daily').addEventListener('click', () => {
    exportOverlay.classList.remove('visible');
    exportCSV('daily');
  });
  
  document.getElementById('export-weekly').addEventListener('click', () => {
    exportOverlay.classList.remove('visible');
    exportCSV('weekly');
  });
});
