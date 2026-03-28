'use strict';
/**
 * popup.js — DoomTab v2.0
 * Auto-categorization, role-based focus scoring, category-grouped view.
 * No manual star selection — everything is automatic.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIVATE_KEYS = new Set(['_activeTab', '_startTime', '_currentDate', '_focusSites', '_userRole', '_userId']);
const CHART_COLORS = ['#7c6af7','#3a8fd1','#56c9a0','#e87040','#e8c040','#c040e8','#e84060','#3ad1b5'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Read CSS custom property value
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
const MAX_SLICES = 7;
const MAX_CATEGORIES = 4;
const MIN_SECONDS = 60; // only show sites with >= 1 minute

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s) {
  if (s <= 0) return '0m';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '<1m';
}

function todayKey() { return new Date().toISOString().slice(0, 10); }
function dateKey(d) { return d.toISOString().slice(0, 10); }

function getMondayUTC(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function todayEntries(allData) {
  return Object.entries(allData)
    .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number' && v >= MIN_SECONDS)
    .sort(([,a],[,b]) => b - a);
}

// ─── State ────────────────────────────────────────────────────────────────────

let storage = {};
let userRole = null;

async function load() {
  storage = await chrome.storage.local.get(null);
  userRole = storage._userRole || null;

  // Calculate pending time for the currently active tab
  // so the popup always shows real-time accurate data
  if (storage._activeTab && storage._startTime) {
    const pendingSec = Math.floor((Date.now() - storage._startTime) / 1000);
    if (pendingSec > 0 && pendingSec < 86400) {
      const domain = storage._activeTab.url
        ? (() => { try { return new URL(storage._activeTab.url).hostname; } catch { return null; } })()
        : null;
      if (domain) {
        const current = (typeof storage[domain] === 'number') ? storage[domain] : 0;
        storage[domain] = current + pendingSec;
      }
    }
  }
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function initOnboarding() {
  const onb = document.getElementById('onboarding');
  const main = document.getElementById('main-ui');
  const grid = document.getElementById('role-grid');

  if (userRole) {
    onb.classList.add('hidden');
    main.classList.add('visible');
    return;
  }

  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.role-btn');
    if (!btn) return;

    const role = btn.dataset.role;
    await chrome.storage.local.set({ _userRole: role });
    userRole = role;

    onb.classList.add('hidden');
    main.classList.add('visible', 'fade-in');

    const entries = todayEntries(storage);
    renderAll(entries);
  });
}

// ─── Settings (change role) ───────────────────────────────────────────────────

function initSettings() {
  document.getElementById('settings-btn').addEventListener('click', async () => {
    await chrome.storage.local.remove('_userRole');
    userRole = null;

    const onb = document.getElementById('onboarding');
    const main = document.getElementById('main-ui');
    main.classList.remove('visible');
    onb.classList.remove('hidden');
  });
}

// ─── Focus Score Ring (Canvas) ────────────────────────────────────────────────

function renderScoreRing(score) {
  const canvas = document.getElementById('score-canvas');
  const dpr = window.devicePixelRatio || 1;
  const size = 130;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const radius = 52;
  const lineWidth = 7;

  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = cssVar('--ring-track');
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Score arc
  if (score >= 0) {
    const start = -Math.PI / 2;
    const end = start + (score / 100) * Math.PI * 2;
    const color = score >= 70 ? '#56c9a0' : score >= 40 ? '#e8c040' : '#e84060';

    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Score number
    ctx.fillStyle = '#ecedf0';
    ctx.font = `bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${score}%`, cx, cy - 3);

    // Label
    ctx.fillStyle = '#505068';
    ctx.font = `700 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.letterSpacing = '1px';
    ctx.fillText('FOCUS', cx, cy + 18);
  } else {
    // No data state
    ctx.fillStyle = '#505068';
    ctx.font = `bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('—', cx, cy - 2);

    ctx.fillStyle = '#353550';
    ctx.font = `700 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText('FOCUS', cx, cy + 18);
  }
}

// ─── Score Breakdown (below ring) ─────────────────────────────────────────────

function renderScoreBreakdown(breakdown) {
  const el = document.getElementById('score-breakdown');
  el.textContent = '';

  const items = [
    { label: 'Productive', value: breakdown.productive.seconds, color: '#56c9a0' },
    { label: 'Distraction', value: breakdown.distraction.seconds, color: '#e84060' },
    { label: 'Neutral', value: breakdown.neutral.seconds, color: '#505068' },
  ];

  items.forEach(({ label, value, color }) => {
    const stat = document.createElement('div');
    stat.className = 'score-stat';

    const dot = document.createElement('span');
    dot.className = 'score-stat-dot';
    dot.style.background = color;

    const lbl = document.createElement('span');
    lbl.className = 'score-stat-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'score-stat-value';
    val.textContent = fmt(value);

    stat.append(dot, lbl, val);
    el.appendChild(stat);
  });
}

// ─── Today View (Category Groups) ────────────────────────────────────────────

let todayView = 'doom'; // 'doom' or 'good'

function renderToday(entries) {
  const container = document.getElementById('today-groups');
  const topSitesEl = document.getElementById('top-sites');
  const stat = document.getElementById('footer-stat');
  const toggleWrap = document.getElementById('today-toggle');
  container.textContent = '';
  topSitesEl.textContent = '';

  if (!entries.length) {
    toggleWrap.style.display = 'none';
    const div = document.createElement('div');
    div.className = 'empty';
    const icon = document.createElement('span');
    icon.className = 'empty-icon';
    icon.textContent = '💀';
    const txt = document.createElement('p');
    txt.className = 'empty-text';
    txt.textContent = 'No browsing data yet.\nStart browsing and check back!';
    div.append(icon, txt);
    container.appendChild(div);
    stat.textContent = '—';
    return;
  }

  toggleWrap.style.display = 'flex';
  const allGroups = groupByCategory(entries);
  const role = userRole || 'other';
  const { doom, good } = splitGroups(allGroups, role);

  const doomTotal = doom.reduce((s, g) => s + g.total, 0);
  const goodTotal = good.reduce((s, g) => s + g.total, 0);
  const grandTotal = doomTotal + goodTotal;

  // Update toggle buttons
  const doomBtn = document.getElementById('toggle-doom');
  const goodBtn = document.getElementById('toggle-good');
  doomBtn.querySelector('.toggle-time').textContent = fmt(doomTotal);
  goodBtn.querySelector('.toggle-time').textContent = fmt(goodTotal);
  doomBtn.classList.toggle('active', todayView === 'doom');
  goodBtn.classList.toggle('active', todayView === 'good');

  const displayGroups = todayView === 'doom' ? doom : good;
  const viewTotal = todayView === 'doom' ? doomTotal : goodTotal;

  if (displayGroups.length === 0) {
    const div = document.createElement('div');
    div.className = 'empty';
    const icon = document.createElement('span');
    icon.className = 'empty-icon';
    icon.textContent = todayView === 'doom' ? '🎉' : '😴';
    const txt = document.createElement('p');
    txt.className = 'empty-text';
    txt.textContent = todayView === 'doom'
      ? 'No distractions detected yet.\nKeep it up!'
      : 'No productive browsing yet.\nTime to get to work!';
    div.append(icon, txt);
    container.appendChild(div);
    stat.textContent = `Total: ${fmt(grandTotal)}`;
    return;
  }

  // ── Category Groups (collapsed by default) ──
  displayGroups.forEach(({ category, total: catTotal, domains }) => {
    const meta = CATEGORY_META[category] || CATEGORY_META['Uncategorized'];
    const pct = viewTotal > 0 ? Math.round((catTotal / viewTotal) * 100) : 0;

    const group = document.createElement('div');
    group.className = 'cat-group collapsed';

    const header = document.createElement('div');
    header.className = 'cat-header';

    const emoji = document.createElement('span');
    emoji.className = 'cat-emoji';
    emoji.textContent = meta.emoji;

    const name = document.createElement('span');
    name.className = 'cat-name';
    name.textContent = category;

    const time = document.createElement('span');
    time.className = 'cat-time';
    time.style.color = meta.color;
    time.textContent = `${fmt(catTotal)} · ${pct}%`;

    const chevron = document.createElement('span');
    chevron.className = 'cat-chevron';
    chevron.textContent = '▾';

    header.append(emoji, name, time, chevron);
    header.addEventListener('click', () => {
      group.classList.toggle('collapsed');
    });

    const domainsEl = document.createElement('div');
    domainsEl.className = 'cat-domains';

    const maxDomain = domains.length > 0 ? Math.max(...domains.map(d => d.sec)) : 1;

    domains.forEach(({ domain, sec }) => {
      const row = document.createElement('div');
      row.className = 'domain-row';

      const dName = document.createElement('span');
      dName.className = 'domain-name';
      dName.textContent = domain;
      dName.title = domain;

      const dTime = document.createElement('span');
      dTime.className = 'domain-time';
      dTime.textContent = fmt(sec);

      row.append(dName, dTime);

      const bar = document.createElement('div');
      bar.className = 'domain-bar';
      const fill = document.createElement('div');
      fill.className = 'domain-bar-fill';
      fill.style.width = `${Math.max(Math.round((sec / maxDomain) * 100), 2)}%`;
      fill.style.background = meta.color;
      bar.appendChild(fill);

      domainsEl.append(row, bar);
    });

    group.append(header, domainsEl);
    container.appendChild(group);
  });

  // ── Top 4 Sites ──
  const allDomains = displayGroups.flatMap(g => g.domains);
  allDomains.sort((a, b) => b.sec - a.sec);
  const top = allDomains.slice(0, 4);

  if (top.length > 0) {
    const head = document.createElement('div');
    head.className = 'top-sites-head';
    head.textContent = `Top ${top.length} Sites`;
    topSitesEl.appendChild(head);

    top.forEach(({ domain, sec }, i) => {
      const row = document.createElement('div');
      row.className = 'top-site-row';

      const rank = document.createElement('span');
      rank.className = 'top-site-rank';
      rank.textContent = i + 1;

      const name = document.createElement('span');
      name.className = 'top-site-name';
      name.textContent = domain;

      const time = document.createElement('span');
      time.className = 'top-site-time';
      time.textContent = fmt(sec);

      row.append(rank, name, time);
      topSitesEl.appendChild(row);
    });
  }

  stat.textContent = `Total: ${fmt(grandTotal)}`;
}

// ─── Insight Bar ──────────────────────────────────────────────────────────────

function renderInsight(entries, score) {
  const bar = document.getElementById('insight-bar');
  if (!entries.length) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  bar.className = 'insight-bar';
  bar.innerHTML = '';

  const role = userRole || 'other';
  const allGroups = groupByCategory(entries);
  const { doom, good } = splitGroups(allGroups, role);

  const doomDomains = doom.flatMap(g => g.domains).sort((a, b) => b.sec - a.sec);
  const goodDomains = good.flatMap(g => g.domains).sort((a, b) => b.sec - a.sec);

  // Hours left until midnight
  const now = new Date();
  const hoursLeft = Math.max(0, 23 - now.getHours());
  const timeLeftText = hoursLeft > 1
    ? `${hoursLeft}h left to save the day`
    : hoursLeft === 1 ? '1h left' : 'Day is almost over';

  const ptsNeeded = Math.max(0, 60 - Math.round(score));

  let msg = '';
  let sub = '';
  let tone = '';

  if (todayView === 'good') {
    // ── Good View: highlight productive potential ──
    if (score >= 60) {
      tone = 'ok';
      if (goodDomains.length >= 2) {
        msg = `\u2728 ${goodDomains[0].domain} and ${goodDomains[1].domain} are carrying your focus today`;
      } else if (goodDomains.length === 1) {
        msg = `\u2728 ${goodDomains[0].domain} is your productivity anchor`;
      } else {
        msg = '\u2728 Great focus balance today';
      }
      sub = score >= 80
        ? 'Elite focus day \u2014 keep this energy going'
        : 'Streak is safe \u2014 more productive time locks it in';
    } else {
      tone = 'warn';
      if (goodDomains.length >= 2) {
        msg = `\u26a1 ${goodDomains[0].domain} and ${goodDomains[1].domain} could pull your score up`;
      } else if (goodDomains.length === 1) {
        msg = `\u26a1 ${goodDomains[0].domain} is your best shot at saving the day`;
      } else {
        msg = '\u26a1 No productive sites yet \u2014 time to start';
      }
      sub = hoursLeft > 0
        ? `${ptsNeeded}% more productive time to save your streak \u00b7 ${timeLeftText}`
        : `${ptsNeeded}% gap \u2014 streak at risk`;
    }
  } else {
    // ── Doom View: call out distractions ──
    if (score < 40) {
      tone = 'warn';
      if (doomDomains.length >= 2) {
        msg = `\ud83d\udd25 ${doomDomains[0].domain} and ${doomDomains[1].domain} are dragging you off track`;
      } else if (doomDomains.length === 1) {
        msg = `\ud83d\udd25 ${doomDomains[0].domain} is eating into your focus`;
      } else {
        msg = '\ud83d\udd25 You\'re drifting \u2014 time to lock in';
      }
      sub = hoursLeft > 0
        ? `${ptsNeeded}% more productive time needed \u00b7 ${timeLeftText}`
        : `Streak at risk \u2014 ${ptsNeeded}% gap`;
    } else if (score < 60) {
      tone = 'warn';
      if (doomDomains.length >= 1) {
        msg = `\u26a1 ${doomDomains[0].domain} is pulling your score down`;
      } else {
        msg = '\u26a1 You\'re on the edge \u2014 one push could flip it';
      }
      sub = hoursLeft > 0
        ? `${ptsNeeded}% away from keeping your streak \u00b7 ${timeLeftText}`
        : 'Almost there \u2014 cut the distractions';
    } else if (score < 80) {
      tone = 'ok';
      if (doomDomains.length >= 1) {
        msg = `\u2705 ${doomDomains[0].domain} didn't win today \u2014 nice work`;
      } else {
        msg = '\u2705 Clean slate \u2014 no major distractions';
      }
      sub = 'Your streak is safe \u2014 stay the course';
    } else {
      tone = 'great';
      if (doomDomains.length >= 1) {
        msg = `\ud83d\udee1\ufe0f Doom sites barely got any attention today`;
      } else {
        msg = '\ud83d\udee1\ufe0f Zero distractions \u2014 absolute focus mode';
      }
      sub = 'Crushing it \u2014 your streak is locked in \ud83d\udd25';
    }
  }

  bar.classList.add(tone);

  const msgEl = document.createElement('div');
  msgEl.className = 'insight-msg';
  msgEl.textContent = msg;

  const subEl = document.createElement('div');
  subEl.className = 'insight-sub';
  subEl.textContent = sub;

  bar.append(msgEl, subEl);
}

// ─── Donut Chart (static, no interaction) ─────────────────────────────────────

function renderChart(entries) {
  const canvas = document.getElementById('donut-canvas');
  const dpr = window.devicePixelRatio || 1;
  const W = 190, H = 190;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = W/2, cy = H/2, outerR = 78, innerR = 44;

  if (!entries.length) {
    ctx.fillStyle = cssVar('--ring-track');
    ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = cssVar('--hole');
    ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = cssVar('--text-muted');
    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('No data', cx, cy);
    return;
  }

  const role = userRole || 'other';
  const allGroups = groupByCategory(entries);
  const { doom, good } = splitGroups(allGroups, role);

  const doomSec = doom.reduce((s, g) => s + g.total, 0);
  const goodSec = good.reduce((s, g) => s + g.total, 0);
  const total = doomSec + goodSec;

  if (total === 0) return;

  const segments = [];
  if (doomSec > 0) segments.push({ sec: doomSec, color: '#e84060' });
  if (goodSec > 0) segments.push({ sec: goodSec, color: '#56c9a0' });

  // Draw donut
  let angle = -Math.PI / 2;
  const GAP = segments.length > 1 ? 0.03 : 0;

  segments.forEach(seg => {
    const slice = (seg.sec / total) * Math.PI * 2;
    const startAngle = angle + GAP;
    const endAngle = angle + slice - GAP;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();

    angle += slice;
  });

  // Hole
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI*2);
  ctx.fillStyle = cssVar('--hole'); ctx.fill();

  // Center label
  ctx.fillStyle = cssVar('--text-primary');
  ctx.font = 'bold 14px -apple-system, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(fmt(total), cx, cy);
}

// ─── Week View ────────────────────────────────────────────────────────────────

async function renderWeek() {
  const barsEl = document.getElementById('week-bars');
  const labelsEl = document.getElementById('week-labels');
  const summaryEl = document.getElementById('week-summary');
  const titleEl = document.getElementById('week-title');
  barsEl.textContent = ''; labelsEl.textContent = ''; summaryEl.textContent = '';

  const today = new Date();
  const todayStr = todayKey();
  const monday = getMondayUTC(today);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const mFmt = d => `${d.toLocaleString('en',{month:'short'})} ${d.getUTCDate()}`;
  titleEl.textContent = `${mFmt(monday)} – ${mFmt(sunday)}`;

  const allData = await chrome.storage.local.get(null);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const key = dateKey(d);
    const isToday = key === todayStr;
    let sec = 0;
    if (isToday) {
      sec = Object.entries(allData)
        .filter(([k,v]) => !k.startsWith('_') && typeof v === 'number')
        .reduce((s,[,v]) => s+v, 0);
    } else {
      const hist = allData[`_day_${key}`];
      if (hist && typeof hist === 'object') {
        sec = Object.values(hist).reduce((s,v) => s + (typeof v==='number'?v:0), 0);
      }
    }
    return { day: DAY_NAMES[d.getUTCDay()], sec, isToday };
  });

  const maxSec = Math.max(...days.map(d => d.sec), 1);
  const weekTotal = days.reduce((s,d) => s+d.sec, 0);
  const activeDays = days.filter(d => d.sec > 0).length;

  days.forEach(({ day, sec, isToday }) => {
    const pct = Math.round((sec / maxSec) * 100);
    const bar = document.createElement('div');
    bar.className = `wbar${isToday ? ' today' : ''}`;
    bar.style.height = `${Math.max(pct, 4)}%`;
    bar.title = sec > 0 ? fmt(sec) : 'No data';
    barsEl.appendChild(bar);

    const label = document.createElement('div');
    label.className = `wlabel${isToday ? ' today' : ''}`;
    label.textContent = day;
    labelsEl.appendChild(label);
  });

  const left = document.createElement('span');
  left.textContent = `${activeDays} active day${activeDays !== 1 ? 's' : ''}`;
  const right = document.createElement('span');
  right.textContent = `Week: ${fmt(weekTotal)}`;
  summaryEl.append(left, right);
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(entries) {
  const rows = ['Domain,Category,Seconds,Time'];
  entries.forEach(([d, s]) => {
    const cat = categorize(d);
    rows.push(`"${d}","${cat}",${s},"${fmt(s)}"`);
  });
  const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `doomtab-${todayKey()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function showTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === `panel-${id}`));
}

// ─── Collecting State ─────────────────────────────────────────────────────────

function renderCollecting(container, icon, days, minDays, message) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'collecting';

  const ic = document.createElement('div');
  ic.className = 'collecting-icon';
  ic.textContent = icon;

  const title = document.createElement('div');
  title.className = 'collecting-title';
  title.textContent = 'Collecting data…';

  const sub = document.createElement('div');
  sub.className = 'collecting-sub';
  sub.textContent = message;

  const bar = document.createElement('div');
  bar.className = 'collecting-bar';
  const fill = document.createElement('div');
  fill.className = 'collecting-fill';
  fill.style.width = `${Math.min(Math.round((days / minDays) * 100), 100)}%`;
  bar.appendChild(fill);

  const progress = document.createElement('div');
  progress.className = 'collecting-sub';
  progress.textContent = `${days} of ${minDays} days collected`;

  wrap.append(ic, title, sub, bar, progress);
  container.appendChild(wrap);
}

// ─── Patterns Tab ─────────────────────────────────────────────────────────────

function renderPatterns() {
  const container = document.getElementById('patterns-content');
  const role = userRole || 'other';
  const data = analyzePatterns(storage, role);

  if (data.daysOfData < data.minDays) {
    renderCollecting(container, '📊', data.daysOfData, data.minDays,
      'DoomTab needs 3+ days of history\nto detect your browsing patterns.');
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
    renderCollecting(container, '📊', data.daysOfData, 5,
      'Not enough varied data yet.\nKeep browsing naturally!');
  }
}

// ─── Triggers Tab ─────────────────────────────────────────────────────────────

function renderTriggers() {
  const container = document.getElementById('triggers-content');
  const role = userRole || 'other';
  const data = analyzeTriggers(storage, role);

  container.innerHTML = '';

  if (data.daysOfData === 0 || (data.exitTriggers.length === 0 && data.doomSpirals.length === 0 && data.todaySwitchCount === 0)) {
    renderCollecting(container, '⚡', data.daysOfData, 1,
      'No distraction triggers detected yet.\nBrowse normally — DoomTab is watching.');
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
    renderCollecting(container, '🎯', 0, 1,
      'No hourly data yet.\nBrowse for a while — DoomTab tracks by the hour.');
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
  const rh = _rabbitHole || { enabled: false, sensitivity: 'moderate', stats: { shown: 0, closed: 0, continued: 0, snoozed: 0 } };
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

