'use strict';

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

function dateEntries(allData, offsetDays = 0) {
  if (offsetDays === 0) {
    return Object.entries(allData)
      .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number' && v >= MIN_SECONDS)
      .sort(([,a],[,b]) => b - a);
  } else {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const key = `_day_${d.toISOString().slice(0, 10)}`;
    const archive = allData[key];
    if (!archive) return [];
    return Object.entries(archive)
      .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number' && v >= MIN_SECONDS)
      .sort(([,a],[,b]) => b - a);
  }
}

// Get weekly aggregated entries (last 7 days including today)
function weeklyEntries(allData) {
  const merged = {};
  
  // Get archives for last 6 days
  for (let i = 1; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `_day_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const archive = allData[key];
    if (archive) {
      Object.entries(archive)
        .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number')
        .forEach(([domain, sec]) => {
          merged[domain] = (merged[domain] || 0) + sec;
        });
    }
  }
  
  // Add today's data
  Object.entries(allData)
    .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number')
    .forEach(([domain, sec]) => {
      merged[domain] = (merged[domain] || 0) + sec;
    });
  
  return Object.entries(merged)
    .filter(([, v]) => v >= MIN_SECONDS)
    .sort(([,a],[,b]) => b - a);
}
