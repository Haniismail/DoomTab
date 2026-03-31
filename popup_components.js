'use strict';

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
    ctx.fillStyle = cssVar('--text-primary') || '#ecedf0';
    ctx.font = `bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${score}%`, cx, cy - 3);

    // Label
    ctx.fillStyle = cssVar('--text-muted') || '#505068';
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

    const top = document.createElement('div');
    top.className = 'score-stat-top';

    const dot = document.createElement('span');
    dot.className = 'score-stat-dot';
    dot.style.background = color;

    const lbl = document.createElement('span');
    lbl.className = 'score-stat-label';
    lbl.textContent = label;

    top.append(dot, lbl);

    const val = document.createElement('span');
    val.className = 'score-stat-value';
    val.textContent = fmt(value);

    stat.append(top, val);
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
      : 'No flow time yet.\nTime to lock in!';
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

    domains.forEach(({ domain, sec, genres }) => {
      const row = document.createElement('div');
      row.className = 'domain-row';

      const dName = document.createElement('span');
      dName.className = 'domain-name';
      
      // Show YouTube genres inline
      if (domain === 'youtube.com' && genres && Object.keys(genres).length > 0) {
        const genreList = Object.entries(genres)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3) // Top 3 genres
          .map(([g, s]) => {
            const pct = Math.round((s / sec) * 100);
            return `${g} ${pct}%`;
          })
          .join(', ');
        dName.textContent = `${domain}`;
        dName.title = `${domain} — ${genreList}`;
        
        // Add genre breakdown as subtitle
        const genreSpan = document.createElement('span');
        genreSpan.className = 'domain-genres';
        genreSpan.textContent = genreList;
        dName.appendChild(document.createElement('br'));
        dName.appendChild(genreSpan);
      } else {
        dName.textContent = domain;
        dName.title = domain;
      }

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
  const mergedDomains = {};
  displayGroups.flatMap(g => g.domains).forEach(d => {
    if (!mergedDomains[d.domain]) {
      mergedDomains[d.domain] = { domain: d.domain, sec: 0 };
    }
    mergedDomains[d.domain].sec += d.sec;
  });
  
  const allDomains = Object.values(mergedDomains);
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
      name.textContent = domain.replace(/^www\./, '');

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

  const mergeToSortedArray = (groups) => {
    const map = {};
    groups.flatMap(g => g.domains).forEach(d => {
      if (!map[d.domain]) map[d.domain] = { domain: d.domain, sec: 0 };
      map[d.domain].sec += d.sec;
    });
    return Object.values(map).sort((a, b) => b.sec - a.sec);
  };

  const doomDomains = mergeToSortedArray(doom);
  const goodDomains = mergeToSortedArray(good);

  // Hours left until midnight
  const now = new Date();
  const hoursLeft = Math.max(0, 23 - now.getHours());
  const timeLeftText = hoursLeft > 1
    ? `${hoursLeft}h left to save the day`
    : hoursLeft === 1 ? '1h left' : 'Day is almost over';

  const ptsNeeded = Math.max(0, 51 - Math.round(score));

  let msg = '';
  let sub = '';
  let tone = '';

  if (todayView === 'good') {
    // ── Good View: highlight productive potential ──
    if (score >= 51) {
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
      tone = 'ok'; // Keep the container green since we are recommending good sites
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
    } else if (score < 51) {
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
  bar.classList.add(todayView === 'good' ? 'view-good' : 'view-doom');

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

function exportCSV(mode = 'daily') {
  const allData = storage;
  const role = userRole || 'other';
  const today = todayKey();
  
  // Helper to format time nicely
  const fmtTime = (s) => {
    if (s < 60) return `${s}s`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };
  
  // Helper to get type label
  const getType = (domain) => {
    const cat = categorize(domain);
    const prodCats = PRODUCTIVE_FOR_ROLE[role] || PRODUCTIVE_FOR_ROLE['other'];
    if (DISTRACTION_CATEGORIES.includes(cat)) return 'Doom';
    if (prodCats.includes(cat)) return 'Flow';
    return 'Neutral';
  };
  
  // Determine date range based on mode
  let dateRange = [];
  if (mode === 'weekly') {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateRange.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }
  } else {
    // Just today
    dateRange = [today];
  }
  
  // Collect rows
  const allRows = [];
  
  // Add archived days that fall in range
  const dayKeys = Object.keys(allData)
    .filter(k => k.startsWith('_day_'))
    .sort();
  
  dayKeys.forEach(dayKey => {
    const dateStr = dayKey.replace('_day_', '');
    if (!dateRange.includes(dateStr)) return;
    
    const dayData = allData[dayKey];
    Object.entries(dayData)
      .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number' && v >= 5)
      .forEach(([domain, seconds]) => {
        allRows.push({
          date: dateStr,
          domain,
          category: categorize(domain),
          type: getType(domain),
          seconds,
          time: fmtTime(seconds),
        });
      });
  });
  
  // Add today's data if in range
  if (dateRange.includes(today)) {
    Object.entries(allData)
      .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number' && v >= 5)
      .forEach(([domain, seconds]) => {
        allRows.push({
          date: today,
          domain,
          category: categorize(domain),
          type: getType(domain),
          seconds,
          time: fmtTime(seconds),
        });
      });
  }
  
  // Sort by date desc, then by seconds desc
  allRows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.seconds - a.seconds;
  });
  
  // Build CSV with headers
  const headers = ['Date', 'Domain', 'Category', 'Type', 'Time Spent'];
  const csvRows = [headers.join(',')];
  
  allRows.forEach(row => {
    csvRows.push([
      row.date,
      `"${row.domain}"`,
      `"${row.category}"`,
      row.type,
      `"${row.time}"`,
    ].join(','));
  });
  
  // Add summary section
  csvRows.push('');
  csvRows.push(`=== ${mode.toUpperCase()} SUMMARY ===`);
  csvRows.push('');
  
  // Calculate totals by type
  const totalByType = { Doom: 0, Flow: 0, Neutral: 0 };
  const totalByCategory = {};
  const totalByDomain = {};
  
  allRows.forEach(row => {
    totalByType[row.type] = (totalByType[row.type] || 0) + row.seconds;
    totalByCategory[row.category] = (totalByCategory[row.category] || 0) + row.seconds;
    totalByDomain[row.domain] = (totalByDomain[row.domain] || 0) + row.seconds;
  });
  
  csvRows.push('Type,Total Time');
  csvRows.push(`Doom,"${fmtTime(totalByType.Doom)}"`);
  csvRows.push(`Flow,"${fmtTime(totalByType.Flow)}"`);
  csvRows.push(`Neutral,"${fmtTime(totalByType.Neutral)}"`);
  csvRows.push('');
  
  // Top categories
  csvRows.push('Top Categories');
  csvRows.push('Category,Total Time');
  Object.entries(totalByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([cat, sec]) => {
      csvRows.push(`"${cat}","${fmtTime(sec)}"`);
    });
  csvRows.push('');
  
  // Top sites
  csvRows.push('Top Sites');
  csvRows.push('Domain,Total Time,Category,Type');
  Object.entries(totalByDomain)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .forEach(([domain, sec]) => {
      csvRows.push(`"${domain}","${fmtTime(sec)}","${categorize(domain)}",${getType(domain)}`);
    });
  
  // Download
  const filename = mode === 'weekly' 
    ? `doomtab-weekly-${today}.csv`
    : `doomtab-${today}.csv`;
  
  const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

