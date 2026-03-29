'use strict';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function showTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === `panel-${id}`));
}

// ─── Patterns Tab ─────────────────────────────────────────────────────────────

function renderPatterns() {
  const container = document.getElementById('patterns-content');
  const role = userRole || 'other';
  const data = analyzePatterns(storage, role);

  if (data.daysOfData < data.minDays) {
    renderCollecting(container, '📊', data.daysOfData, data.minDays, 'Mapping Your Patterns...',
      'We need data to build your Danger Zone Heatmap and track your Doom-Scrolling Velocity.');
    return;
  }

  container.innerHTML = '';

  // ── Daily Regulars ──
  if (data.dailyRegulars.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'a-section';

    const head = document.createElement('div');
    head.className = 'a-section-head';
    head.textContent = 'Your Regulars';
    sec.appendChild(head);

    data.dailyRegulars.forEach(r => {
      const row = document.createElement('div');
      row.className = 'p-regular';

      const dot = document.createElement('span');
      dot.className = 'p-type-dot';
      dot.style.background = r.type === 'productive' ? '#56c9a0' :
        r.type === 'distraction' ? '#e84060' : '#505068';

      const domain = document.createElement('span');
      domain.className = 'p-domain';
      domain.textContent = r.domain;

      const meta = document.createElement('span');
      meta.className = 'p-meta';
      meta.textContent = `${r.daysPresent}/${r.totalDays}d · avg ${fmt(r.avgSeconds)}`;

      row.append(dot, domain, meta);
      sec.appendChild(row);
    });

    container.appendChild(sec);
  }

  // ── Category Trends ──
  if (data.categoryTrends.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'a-section';

    const head = document.createElement('div');
    head.className = 'a-section-head';
    head.textContent = 'Category Trends';
    sec.appendChild(head);

    data.categoryTrends.forEach(t => {
      const meta = CATEGORY_META[t.category] || CATEGORY_META['Uncategorized'];

      const row = document.createElement('div');
      row.className = 'trend-row';

      const name = document.createElement('span');
      name.className = 'trend-name';
      name.textContent = `${meta.emoji} ${t.category}`;

      const track = document.createElement('div');
      track.className = 'trend-bar-track';
      const fill = document.createElement('div');
      fill.className = 'trend-bar-fill';
      fill.style.width = `${t.thisWeekPct}%`;
      fill.style.background = meta.color;
      track.appendChild(fill);

      const pct = document.createElement('span');
      pct.className = 'trend-pct';
      if (t.delta > 0) {
        pct.classList.add('trend-up');
        pct.textContent = `${t.thisWeekPct}% ↑${t.delta}`;
      } else if (t.delta < 0) {
        pct.classList.add('trend-down');
        pct.textContent = `${t.thisWeekPct}% ↓${Math.abs(t.delta)}`;
      } else {
        pct.classList.add('trend-flat');
        pct.textContent = `${t.thisWeekPct}%`;
      }

      row.append(name, track, pct);
      sec.appendChild(row);
    });

    container.appendChild(sec);
  }

  // ── Routines ──
  if (data.routines.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'a-section';

    const head = document.createElement('div');
    head.className = 'a-section-head';
    head.textContent = 'Your Rhythm';
    sec.appendChild(head);

    const periodLabels = { morning: '☀️ Morning', afternoon: '🌤️ Afternoon', evening: '🌙 Evening' };

    data.routines.forEach(r => {
      const meta = CATEGORY_META[r.topCategory] || CATEGORY_META['Uncategorized'];
      const row = document.createElement('div');
      row.className = 'routine-row';

      const period = document.createElement('span');
      period.className = 'routine-period';
      period.textContent = periodLabels[r.period] || r.period;

      const cat = document.createElement('span');
      cat.className = 'routine-cat';
      cat.textContent = `${meta.emoji} ${r.topCategory}`;

      row.append(period, cat);
      sec.appendChild(row);
    });

    container.appendChild(sec);
  }

  if (container.children.length === 0) {
    renderCollecting(container, '📊', data.daysOfData, 5, 'Waiting for deeper patterns...',
      'Keep browsing naturally to unlock your Danger Zone Heatmap and Doom-Scrolling Velocity.');
  }
}

// ─── Triggers Tab ─────────────────────────────────────────────────────────────

function renderTriggers() {
  const container = document.getElementById('triggers-content');
  const role = userRole || 'other';
  const data = analyzeTriggers(storage, role);

  container.innerHTML = '';

  if (data.daysOfData === 0 || (data.exitTriggers.length === 0 && data.doomSpirals.length === 0 && data.todaySwitchCount === 0)) {
    renderCollecting(container, '⚡', data.daysOfData, 1, 'Analyzing Triggers...',
      "We're mapping out the Habit Loops and 'gateway' sites that cause you to spiral into distraction.");
    return;
  }

  // ── Today Stat ──
  const stat = document.createElement('div');
  stat.className = 'trigger-stat';
  stat.style.borderColor = data.todaySwitchCount > 5 ? '#e84060' :
    data.todaySwitchCount > 2 ? '#e8c040' : '#56c9a0';

  const num = document.createElement('span');
  num.className = 'trigger-stat-num';
  num.style.color = data.todaySwitchCount > 5 ? '#e84060' :
    data.todaySwitchCount > 2 ? '#e8c040' : '#56c9a0';
  num.textContent = data.todaySwitchCount;

  const label = document.createElement('span');
  label.className = 'trigger-stat-label';
  label.textContent = `work → distraction\nswitch${data.todaySwitchCount !== 1 ? 'es' : ''} today`;
  label.style.whiteSpace = 'pre-line';

  stat.append(num, label);
  container.appendChild(stat);

  // ── Exit Triggers ──
  if (data.exitTriggers.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'a-section';

    const head = document.createElement('div');
    head.className = 'a-section-head';
    head.textContent = 'Exit Triggers';
    sec.appendChild(head);

    data.exitTriggers.forEach(t => {
      const row = document.createElement('div');
      row.className = 'exit-row';

      const from = document.createElement('span');
      from.className = 'exit-from';
      from.textContent = t.source;
      from.title = t.source;

      const arrow = document.createElement('span');
      arrow.className = 'exit-arrow';
      arrow.textContent = '→';

      const to = document.createElement('span');
      to.className = 'exit-to';
      to.textContent = t.topTarget || 'distraction';
      to.title = t.topTarget || '';

      const count = document.createElement('span');
      count.className = 'exit-count';
      count.textContent = `${t.count}×`;

      row.append(from, arrow, to, count);
      sec.appendChild(row);
    });

    container.appendChild(sec);
  }

  // ── Doom Spirals ──
  if (data.doomSpirals.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'a-section';

    const head = document.createElement('div');
    head.className = 'a-section-head';
    head.textContent = '💀 Doom Spirals';
    sec.appendChild(head);

    data.doomSpirals.forEach(s => {
      const card = document.createElement('div');
      card.className = 'spiral-card';

      const chain = document.createElement('div');
      chain.className = 'spiral-chain';
      chain.textContent = s.chain.join(' → ');

      const meta = document.createElement('div');
      meta.className = 'spiral-meta';
      meta.textContent = `${s.count} time${s.count !== 1 ? 's' : ''} · up to ${s.maxLength} sites deep`;

      card.append(chain, meta);
      sec.appendChild(card);
    });

    container.appendChild(sec);
  }

  // ── Rapid Switching ──
  if (data.rapidSwitching.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'a-section';

    const head = document.createElement('div');
    head.className = 'a-section-head';
    head.textContent = 'Rapid Switching';
    sec.appendChild(head);

    data.rapidSwitching.forEach(r => {
      const row = document.createElement('div');
      row.className = 'rapid-row';

      const icon = document.createElement('span');
      icon.className = 'rapid-icon';
      icon.textContent = '⚠️';

      const time = document.createElement('span');
      time.className = 'rapid-time';
      time.textContent = r.time;

      const detail = document.createElement('span');
      detail.className = 'rapid-detail';
      detail.textContent = `${r.count}+ switches in 3 min`;

      row.append(icon, time, detail);
      sec.appendChild(row);
    });

    container.appendChild(sec);
  }
}

// ─── Focus Tab ────────────────────────────────────────────────────────────────

function renderFocus() {
  const container = document.getElementById('focus-content');
  const role = userRole || 'other';
  const data = analyzeFocusWindows(storage, role);

  container.innerHTML = '';

  if (!data.hasData) {
    renderCollecting(container, '🎯', 0, 1, 'Finding Your Focus...',
      "We're looking for your Productivity Anchors and Deep Work Blocks to show you how to replicate your best days.");
    return;
  }

  // ── Hourly Heatmap ──
  const sec1 = document.createElement('div');
  sec1.className = 'a-section';

  const head1 = document.createElement('div');
  head1.className = 'a-section-head';
  head1.textContent = 'Hourly Activity';
  sec1.appendChild(head1);

  const grid = document.createElement('div');
  grid.className = 'heat-grid';

  const labels = document.createElement('div');
  labels.className = 'heat-labels';

  // Show 6 AM to 11 PM (18 hours)
  const displayHours = data.hourlyScores.filter(h => h.hour >= 6 && h.hour <= 23);
  const maxTotal = Math.max(...displayHours.map(h => h.total), 1);

  displayHours.forEach(h => {
    const col = document.createElement('div');
    col.className = 'heat-col';
    const pct = Math.max(Math.round((h.total / maxTotal) * 100), 4);
    col.style.height = `${pct}%`;

    if (h.score >= 70) col.style.background = '#56c9a0';
    else if (h.score >= 40) col.style.background = '#e8c040';
    else if (h.score >= 0) col.style.background = '#e84060';
    else col.style.background = '#1e1e30';

    col.title = `${h.label}: ${fmt(h.total)} (${h.score >= 0 ? h.score + '% focus' : 'no data'})`;
    grid.appendChild(col);

    const lbl = document.createElement('div');
    lbl.className = 'heat-lbl';
    lbl.textContent = h.hour % 3 === 0 ? h.label : '';
    labels.appendChild(lbl);
  });

  sec1.append(grid, labels);
  container.appendChild(sec1);

  // ── Peak Hours ──
  if (data.peakHours.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'a-section';

    const head = document.createElement('div');
    head.className = 'a-section-head';
    head.textContent = '🟢 Peak Focus';
    sec.appendChild(head);

    data.peakHours.forEach(h => {
      const card = document.createElement('div');
      card.className = 'peak-card';

      const hour = document.createElement('span');
      hour.className = 'peak-hour';
      hour.textContent = h.label;

      const track = document.createElement('div');
      track.className = 'peak-bar-track';
      const fill = document.createElement('div');
      fill.className = 'peak-bar-fill';
      fill.style.width = `${h.score}%`;
      fill.style.background = '#56c9a0';
      track.appendChild(fill);

      const score = document.createElement('span');
      score.className = 'peak-score';
      score.style.color = '#56c9a0';
      score.textContent = `${h.score}%`;

      card.append(hour, track, score);
      sec.appendChild(card);
    });

    container.appendChild(sec);
  }

  // ── Slump Hours ──
  if (data.slumpHours.length > 0 && data.slumpHours[0].score < 50) {
    const sec = document.createElement('div');
    sec.className = 'a-section';

    const head = document.createElement('div');
    head.className = 'a-section-head';
    head.textContent = '🔴 Watch Out';
    sec.appendChild(head);

    data.slumpHours.filter(h => h.score < 50).forEach(h => {
      const card = document.createElement('div');
      card.className = 'peak-card';

      const hour = document.createElement('span');
      hour.className = 'peak-hour';
      hour.textContent = h.label;

      const track = document.createElement('div');
      track.className = 'peak-bar-track';
      const fill = document.createElement('div');
      fill.className = 'peak-bar-fill';
      fill.style.width = `${h.score}%`;
      fill.style.background = '#e84060';
      track.appendChild(fill);

      const score = document.createElement('span');
      score.className = 'peak-score';
      score.style.color = '#e84060';
      score.textContent = `${h.score}%`;

      card.append(hour, track, score);
      sec.appendChild(card);
    });

    container.appendChild(sec);
  }

  // ── Summary ──
  if (data.daysOfData > 0) {
    const note = document.createElement('div');
    note.className = 'collecting-sub';
    note.style.textAlign = 'center';
    note.style.marginTop = '10px';
    note.textContent = `Based on ${data.daysOfData} day${data.daysOfData !== 1 ? 's' : ''} of data`;
    container.appendChild(note);
  }
}

// ─── Rabbit Hole Tab ─────────────────────────────────────────────────────────

async function renderRabbitHole() {
  const { _rabbitHole, _interventionLog } = await chrome.storage.local.get(['_rabbitHole', '_interventionLog']);
  const rh = _rabbitHole || { enabled: true, sensitivity: 'moderate', stats: { shown: 0, closed: 0, continued: 0, snoozed: 0 } };
  const log = Array.isArray(_interventionLog) ? _interventionLog : [];

  // Toggle
  const toggle = document.getElementById('rh-toggle');
  toggle.classList.toggle('on', rh.enabled);
  toggle.onclick = async () => {
    rh.enabled = !rh.enabled;
    toggle.classList.toggle('on', rh.enabled);
    await chrome.storage.local.set({ _rabbitHole: rh });
  };

  // Sensitivity
  const sensContainer = document.getElementById('rh-sensitivity');
  sensContainer.querySelectorAll('.rh-sens-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sens === rh.sensitivity);
    btn.onclick = async () => {
      rh.sensitivity = btn.dataset.sens;
      sensContainer.querySelectorAll('.rh-sens-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await chrome.storage.local.set({ _rabbitHole: rh });
    };
  });

  // Stats
  const statsEl = document.getElementById('rh-stats');
  statsEl.innerHTML = '';
  const stats = rh.stats || { shown: 0, closed: 0, continued: 0, snoozed: 0 };
  const statCards = [
    { num: stats.shown,     label: 'Interventions', color: '#7c6af7' },
    { num: stats.closed,    label: 'Tabs Closed',  color: '#56c9a0' },
    { num: stats.continued, label: 'Continued',     color: '#e8c040' },
    { num: stats.snoozed,   label: 'Snoozed',       color: '#e84060' },
  ];
  statCards.forEach(({ num, label, color }) => {
    const card = document.createElement('div');
    card.className = 'rh-stat-card';
    const n = document.createElement('div');
    n.className = 'rh-stat-num';
    n.style.color = color;
    n.textContent = num;
    const l = document.createElement('div');
    l.className = 'rh-stat-label';
    l.textContent = label;
    card.append(n, l);
    statsEl.appendChild(card);
  });

  // Recent log
  const recentEl = document.getElementById('rh-recent');
  recentEl.innerHTML = '';
  const recent = log.slice(-8).reverse();
  if (recent.length > 0) {
    const head = document.createElement('div');
    head.className = 'rh-recent-head';
    head.textContent = 'Recent Interventions';
    recentEl.appendChild(head);

    const actionIcons = { shown: '👁', close: '✖', continue: '⏱', later: '⏰' };
    recent.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'rh-recent-row';

      const action = document.createElement('span');
      action.className = 'rh-recent-action';
      action.textContent = actionIcons[entry.action] || '•';
      action.title = entry.action;

      const domain = document.createElement('span');
      domain.className = 'rh-recent-domain';
      domain.textContent = entry.domain;

      const time = document.createElement('span');
      time.className = 'rh-recent-time';
      const d = new Date(entry.ts);
      time.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      row.append(action, domain, time);
      recentEl.appendChild(row);
    });
  }
}

// ─── Streak Tab ──────────────────────────────────────────────────────────────

const STREAK_THRESHOLD = 60; // focus score % needed for a "good" day

async function renderStreak(currentEntries) {
  const allData = await chrome.storage.local.get(null);
  const role = userRole || 'other';

  // Collect daily scores for the last 14 days
  const days = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'narrow' });
    const dayNum = d.getDate();
    const isToday = key === todayStr;

    let score = -1; // no data

    if (isToday && currentEntries.length > 0) {
      const b = computeFocusBreakdown(currentEntries, role);
      score = b.score;
    } else {
      const archive = allData[`_day_${key}`];
      if (archive) {
        const entries = Object.entries(archive).filter(
          ([k, v]) => !k.startsWith('_') && typeof v === 'number'
        );
        if (entries.length > 0) {
          const b = computeFocusBreakdown(entries, role);
          score = b.score;
        }
      }
    }

    days.push({ key, dayLabel, dayNum, isToday, score });
  }

  // Calculate current streak (consecutive good days ending at today or yesterday)
  let streak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  // For streak: go backwards from today
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    if (day.score >= STREAK_THRESHOLD) {
      streak++;
    } else if (day.isToday && day.score === -1) {
      // Today with no data yet — don't break streak, just skip
      continue;
    } else {
      break;
    }
  }

  // Best streak calculation
  for (const day of days) {
    if (day.score >= STREAK_THRESHOLD) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Render fire + count
  const fireEl = document.getElementById('streak-fire');
  const countEl = document.getElementById('streak-count');
  const subEl = document.getElementById('streak-sub');

  countEl.textContent = streak;

  if (streak === 0) {
    fireEl.classList.add('dead');
    subEl.textContent = 'Start browsing productively to build your streak!';
  } else if (streak === 1) {
    fireEl.classList.remove('dead');
    subEl.textContent = '1 day down — keep going!';
  } else if (streak < 7) {
    fireEl.classList.remove('dead');
    subEl.textContent = `${streak} days strong — don't break it!`;
  } else {
    fireEl.classList.remove('dead');
    subEl.textContent = `🏆 ${streak} day streak — you're on fire!`;
  }

  // Calendar
  const calEl = document.getElementById('streak-calendar');
  calEl.innerHTML = '';
  days.forEach(day => {
    const el = document.createElement('div');
    let cls = 'streak-day';
    if (day.isToday) cls += ' today';
    if (day.score >= STREAK_THRESHOLD) cls += ' good';
    else if (day.score >= 0) cls += ' bad';
    else cls += ' empty';
    el.className = cls;
    el.textContent = day.dayNum;
    el.title = `${day.key}: ${day.score >= 0 ? day.score + '% focus' : 'No data'}`;
    calEl.appendChild(el);
  });

  // Threshold info
  const threshEl = document.getElementById('streak-threshold');
  threshEl.innerHTML = `Score <strong>≥ ${STREAK_THRESHOLD}%</strong> focus to keep your streak alive`;

  // Best streak
  const bestEl = document.getElementById('streak-best');
  bestEl.innerHTML = '';
  const bestNum = document.createElement('div');
  bestNum.className = 'streak-best-num';
  bestNum.textContent = bestStreak;
  const bestLabel = document.createElement('div');
  bestLabel.className = 'streak-best-label';
  bestLabel.textContent = 'Best Streak (14 days)';
  bestEl.append(bestNum, bestLabel);
}

