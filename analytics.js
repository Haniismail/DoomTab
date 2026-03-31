'use strict';
/**
 * analytics.js — DoomTab behavioral analysis engine
 *
 * Provides three analysis functions:
 *   analyzePatterns()   — recurring browsing habits over time
 *   analyzeTriggers()   — distraction triggers & doom spirals
 *   analyzeFocusWindows() — peak/slump productivity hours
 *
 * All functions receive raw storage data and the user's role,
 * then use categorize() from categories.js to classify domains.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _classifyDomain(domain, role) {
  const cat = categorize(domain);
  const prodCats = PRODUCTIVE_FOR_ROLE[role] || PRODUCTIVE_FOR_ROLE['other'];
  if (DISTRACTION_CATEGORIES.includes(cat)) return 'distraction';
  if (prodCats.includes(cat)) return 'productive';
  return 'neutral';
}

function _getArchives(allData, maxDays) {
  const dayKeys = Object.keys(allData)
    .filter(k => k.startsWith('_day_'))
    .sort()
    .slice(-maxDays);

  return dayKeys.map(k => ({
    date: k.replace('_day_', ''),
    domains: Object.entries(allData[k])
      .filter(([dk, dv]) => !dk.startsWith('_') && typeof dv === 'number'),
    transitions: allData[k]._transitions || [],
    hourly: allData[k]._hourly || {},
  }));
}

function _getTodayDomains(allData) {
  return Object.entries(allData)
    .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number' && v > 0);
}

// ─── 1. Pattern Detection ─────────────────────────────────────────────────────

function analyzePatterns(allData, role) {
  const archives = _getArchives(allData, 14);
  const todayDomains = _getTodayDomains(allData);
  const daysOfData = archives.length + 1; // Always count today

  const result = {
    daysOfData,
    minDays: 2, // 2 instead of 3 to show data sooner
    weeklyStats: null,
    dailyRegulars: [],
    categoryTrends: [],
    youtubeGenres: [],
    routines: [],
  };

  if (daysOfData < 2) return result;

  // ── Weekly Stats ──
  const thisWeek = archives.slice(-7);
  let doomSec = 0, flowSec = 0, neutralSec = 0;
  const dayScores = [];

  // Calculate this week's totals
  thisWeek.forEach(day => {
    let dayDoom = 0, dayFlow = 0, dayNeutral = 0;
    day.domains.forEach(([d, s]) => {
      const type = _classifyDomain(d, role);
      if (type === 'distraction') { doomSec += s; dayDoom += s; }
      else if (type === 'productive') { flowSec += s; dayFlow += s; }
      else { neutralSec += s; dayNeutral += s; }
    });
    const dayTotal = dayDoom + dayFlow + dayNeutral;
    if (dayTotal > 0) {
      dayScores.push({
        date: day.date,
        score: Math.round((dayFlow / dayTotal) * 100),
        doom: dayDoom,
        flow: dayFlow,
      });
    }
  });

  // Add today
  let todayDoom = 0, todayFlow = 0, todayNeutral = 0;
  todayDomains.forEach(([d, s]) => {
    const type = _classifyDomain(d, role);
    if (type === 'distraction') { doomSec += s; todayDoom += s; }
    else if (type === 'productive') { flowSec += s; todayFlow += s; }
    else { neutralSec += s; todayNeutral += s; }
  });
  const todayTotal = todayDoom + todayFlow + todayNeutral;
  if (todayTotal > 0) {
    dayScores.push({
      date: 'Today',
      score: Math.round((todayFlow / todayTotal) * 100),
      doom: todayDoom,
      flow: todayFlow,
    });
  }

  // Find best/worst days
  const bestDay = dayScores.reduce((a, b) => (b.score > a.score ? b : a), dayScores[0]);
  const worstDay = dayScores.reduce((a, b) => (b.score < a.score ? b : a), dayScores[0]);

  const totalWeek = doomSec + flowSec + neutralSec;
  const avgScore = totalWeek > 0 ? Math.round((flowSec / totalWeek) * 100) : 0;

  result.weeklyStats = {
    doomTime: doomSec,
    flowTime: flowSec,
    neutralTime: neutralSec,
    avgScore,
    bestDay: bestDay ? { date: bestDay.date, score: bestDay.score } : null,
    worstDay: worstDay ? { date: worstDay.date, score: worstDay.score } : null,
    daysTracked: dayScores.length,
  };

  // ── YouTube Genres (doom genres only) ──
  const genreSeconds = {};
  const doomGenres = new Set(['Gaming', 'Entertainment', 'Comedy', 'Film & Animation', 
    'Sports', 'People & Blogs', 'Pets & Animals', 'Autos & Vehicles']);
  
  // Collect from archives
  archives.forEach(day => {
    day.domains.forEach(([d, s]) => {
      if (d.startsWith('youtube.com (')) {
        const genre = d.slice(13, -1);
        if (doomGenres.has(genre)) {
          genreSeconds[genre] = (genreSeconds[genre] || 0) + s;
        }
      }
    });
  });
  
  // Collect from today
  todayDomains.forEach(([d, s]) => {
    if (d.startsWith('youtube.com (')) {
      const genre = d.slice(13, -1);
      if (doomGenres.has(genre)) {
        genreSeconds[genre] = (genreSeconds[genre] || 0) + s;
      }
    }
  });
  
  const totalGenreSec = Object.values(genreSeconds).reduce((a, b) => a + b, 0);
  result.youtubeGenres = Object.entries(genreSeconds)
    .map(([genre, sec]) => ({
      genre,
      seconds: sec,
      pct: totalGenreSec > 0 ? Math.round((sec / totalGenreSec) * 100) : 0,
    }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5);

  // ── Daily Regulars ──
  // Count how many days each domain appears (last 7 days)
  const last7 = archives.slice(-7);
  const domainDayCount = {};
  const domainTotalSec = {};

  last7.forEach(day => {
    const seen = new Set();
    day.domains.forEach(([d, s]) => {
      if (s >= 60) { // Only count meaningful visits (1+ min)
        seen.add(d);
        domainTotalSec[d] = (domainTotalSec[d] || 0) + s;
      }
    });
    seen.forEach(d => { domainDayCount[d] = (domainDayCount[d] || 0) + 1; });
  });

  // Include today
  const todaySeen = new Set();
  todayDomains.forEach(([d, s]) => {
    if (s >= 60) {
      todaySeen.add(d);
      domainTotalSec[d] = (domainTotalSec[d] || 0) + s;
    }
  });
  todaySeen.forEach(d => { domainDayCount[d] = (domainDayCount[d] || 0) + 1; });

  const totalDaysConsidered = Math.min(last7.length + 1, 7);

  const allRegulars = Object.entries(domainDayCount)
    .filter(([, count]) => count >= 3)
    .map(([domain, count]) => ({
      domain: domain.replace(/^www\./, ''), // Strip www. for display
      daysPresent: count,
      totalDays: totalDaysConsidered,
      avgSeconds: Math.round(domainTotalSec[domain] / count),
      category: categorize(domain),
      type: _classifyDomain(domain, role),
    }))
    .sort((a, b) => b.daysPresent - a.daysPresent || b.avgSeconds - a.avgSeconds);

  // Separate doom and flow, limit to top 5 each
  const doomRegulars = allRegulars.filter(r => r.type === 'distraction').slice(0, 5);
  const flowRegulars = allRegulars.filter(r => r.type === 'productive').slice(0, 5);
  result.dailyRegulars = [...doomRegulars, ...flowRegulars];

  // ── Category Trends (this week vs last week) ──
  // Note: thisWeek already defined above for weekly stats
  const lastWeek = archives.slice(-14, -7);

  function catSeconds(days) {
    const totals = {};
    days.forEach(day => {
      day.domains.forEach(([d, s]) => {
        const cat = categorize(d);
        totals[cat] = (totals[cat] || 0) + s;
      });
    });
    return totals;
  }

  const twCats = catSeconds(thisWeek);
  const lwCats = catSeconds(lastWeek);
  const twTotal = Object.values(twCats).reduce((s, v) => s + v, 0) || 1;
  const lwTotal = Object.values(lwCats).reduce((s, v) => s + v, 0) || 1;

  const allCats = new Set([...Object.keys(twCats), ...Object.keys(lwCats)]);
  result.categoryTrends = [...allCats]
    .map(cat => {
      const twPct = Math.round(((twCats[cat] || 0) / twTotal) * 100);
      const lwPct = Math.round(((lwCats[cat] || 0) / lwTotal) * 100);
      return { category: cat, thisWeekPct: twPct, lastWeekPct: lwPct, delta: twPct - lwPct };
    })
    .filter(t => t.thisWeekPct >= 5 || t.lastWeekPct >= 5)
    .sort((a, b) => b.thisWeekPct - a.thisWeekPct)
    .slice(0, 6);

  // ── Routines (time-of-day patterns) ──
  const periodBuckets = { morning: {}, afternoon: {}, evening: {} };
  const allDays = [...archives, {
    domains: todayDomains,
    hourly: allData._hourly || {},
    transitions: allData._transitions || [],
  }];

  allDays.forEach(day => {
    if (!day.hourly) return;
    Object.entries(day.hourly).forEach(([hr, domains]) => {
      const h = parseInt(hr, 10);
      const period = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
      Object.entries(domains).forEach(([d, s]) => {
        if (typeof s !== 'number') return;
        const cat = categorize(d);
        periodBuckets[period][cat] = (periodBuckets[period][cat] || 0) + s;
      });
    });
  });

  result.routines = Object.entries(periodBuckets)
    .map(([period, cats]) => {
      const sorted = Object.entries(cats).sort(([,a],[,b]) => b - a);
      const top = sorted[0];
      if (!top || top[1] < 60) return null;
      return { period, topCategory: top[0], seconds: top[1] };
    })
    .filter(Boolean);

  return result;
}

// ─── 2. Distraction Triggers ──────────────────────────────────────────────────

function analyzeTriggers(allData, role) {
  const archives = _getArchives(allData, 7);
  const todayTransitions = allData._transitions || [];
  const daysOfData = archives.length + 1; // Always count today

  const result = {
    daysOfData,
    exitTriggers: [],     // productive site → distraction (grouped by source)
    doomSpirals: [],      // chains: distraction → distraction → distraction
    todaySwitchCount: 0,  // productive→distraction switches today
    rapidSwitching: [],   // bursts of fast switches
  };

  // Gather all transitions (last 7 days + today)
  const allTransitions = [];
  archives.forEach(day => {
    if (day.transitions) allTransitions.push(...day.transitions);
  });
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayTs = todayStart.getTime();

  allTransitions.push(...todayTransitions);

  if (allTransitions.length < 2) return result;

  // ── Exit Triggers ──
  // "You left [productive site] for a distraction N times"
  const exitCounts = {};  // { "github.com": { total: N, targets: { "youtube.com": N } } }

  allTransitions.forEach(({ from, to }) => {
    const fromType = _classifyDomain(from, role);
    const toType = _classifyDomain(to, role);
    if (fromType === 'productive' && toType === 'distraction') {
      if (!exitCounts[from]) exitCounts[from] = { total: 0, targets: {} };
      exitCounts[from].total++;
      exitCounts[from].targets[to] = (exitCounts[from].targets[to] || 0) + 1;
    }
  });

  result.exitTriggers = Object.entries(exitCounts)
    .filter(([, v]) => v.total >= 1) // threshold: 1+ times
    .map(([domain, data]) => {
      const topTarget = Object.entries(data.targets)
        .sort(([,a],[,b]) => b - a)[0];
      return {
        source: domain,
        count: data.total,
        topTarget: topTarget ? topTarget[0] : null,
        topTargetCount: topTarget ? topTarget[1] : 0,
        category: categorize(domain),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Doom Spirals ──
  // Detect chains where distraction → distraction (2+ in a row)
  const spirals = [];
  let currentChain = [];

  allTransitions.forEach(({ from, to, ts }) => {
    const toType = _classifyDomain(to, role);
    const fromType = _classifyDomain(from, role);

    if (fromType === 'distraction' && toType === 'distraction') {
      if (currentChain.length === 0) currentChain.push(from);
      currentChain.push(to);
    } else {
      // End of chain
      if (currentChain.length >= 2) {
        // Deduplicate the chain for display
        const unique = [...new Set(currentChain)];
        spirals.push({ chain: unique, length: currentChain.length, ts });
      }
      currentChain = toType === 'distraction' ? [to] : [];
    }
  });
  // Flush last chain
  if (currentChain.length >= 2) {
    spirals.push({ chain: [...new Set(currentChain)], length: currentChain.length });
  }

  // Group similar spirals
  const spiralMap = {};
  spirals.forEach(s => {
    const key = s.chain.slice(0, 3).join('→');
    if (!spiralMap[key]) spiralMap[key] = { chain: s.chain.slice(0, 4), count: 0, maxLength: 0 };
    spiralMap[key].count++;
    spiralMap[key].maxLength = Math.max(spiralMap[key].maxLength, s.length);
  });

  result.doomSpirals = Object.values(spiralMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // ── Today's switch count ──
  todayTransitions.forEach(({ from, to }) => {
    if (_classifyDomain(from, role) === 'productive' &&
        _classifyDomain(to, role) === 'distraction') {
      result.todaySwitchCount++;
    }
  });

  // ── Rapid Switching ──
  // Detect bursts: 3+ transitions within 3 minutes
  if (todayTransitions.length >= 3) {
    for (let i = 0; i < todayTransitions.length - 2; i++) {
      const window = todayTransitions.slice(i, i + 3);
      const span = window[2].ts - window[0].ts;
      if (span <= 180000) { // 3 minutes
        const startTime = new Date(window[0].ts);
        // Avoid duplicates (overlapping windows)
        const last = result.rapidSwitching[result.rapidSwitching.length - 1];
        if (!last || (startTime.getTime() - last.startTs) > 300000) {
          result.rapidSwitching.push({
            startTs: startTime.getTime(),
            time: startTime.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }),
            count: 3,
          });
        }
      }
    }
  }

  return result;
}

// ─── 3. Focus Windows ────────────────────────────────────────────────────────

function analyzeFocusWindows(allData, role) {
  const archives = _getArchives(allData, 14);
  const todayHourly = allData._hourly || {};
  const hasAnyHourly = Object.keys(todayHourly).length > 0 ||
    archives.some(d => Object.keys(d.hourly).length > 0);

  const result = {
    hasData: hasAnyHourly,
    daysOfData: archives.length + 1, // always count today
    hourlyScores: [],  // 24 entries: { hour, productive, distraction, neutral, score, total }
    peakHours: [],
    slumpHours: [],
  };

  if (!hasAnyHourly) return result;

  // Aggregate hourly data across all days
  const hourlyAgg = {}; // "HH" → { productive, distraction, neutral }
  for (let h = 0; h < 24; h++) {
    hourlyAgg[String(h).padStart(2, '0')] = { productive: 0, distraction: 0, neutral: 0 };
  }

  function processHourly(hourlyData) {
    Object.entries(hourlyData).forEach(([hr, domains]) => {
      if (!hourlyAgg[hr]) hourlyAgg[hr] = { productive: 0, distraction: 0, neutral: 0 };
      Object.entries(domains).forEach(([domain, sec]) => {
        if (typeof sec !== 'number') return;
        const type = _classifyDomain(domain, role);
        hourlyAgg[hr][type] += sec;
      });
    });
  }

  // Process archives
  archives.forEach(day => processHourly(day.hourly));
  // Process today
  processHourly(todayHourly);

  // Build hourly scores
  result.hourlyScores = Object.entries(hourlyAgg)
    .map(([hr, data]) => {
      const total = data.productive + data.distraction + data.neutral;
      const scored = data.productive + data.distraction;
      const score = scored > 0 ? Math.round((data.productive / scored) * 100) : -1;
      return {
        hour: parseInt(hr, 10),
        label: `${parseInt(hr, 10) % 12 || 12}${parseInt(hr, 10) < 12 ? 'am' : 'pm'}`,
        ...data,
        total,
        score,
      };
    })
    .sort((a, b) => a.hour - b.hour);

  // Peak & slump (only hours with meaningful data: 5+ min total)
  const meaningful = result.hourlyScores.filter(h => h.total >= 300 && h.score >= 0);

  if (meaningful.length >= 2) {
    const sorted = [...meaningful].sort((a, b) => b.score - a.score);
    result.peakHours = sorted.slice(0, 3);
    result.slumpHours = sorted.slice(-3).reverse();
  }

  return result;
}
