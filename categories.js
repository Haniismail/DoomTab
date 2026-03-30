'use strict';
/**
 * categories.js — DoomTab domain categorization engine
 * Maps domains → categories, roles → productive categories, computes focus score.
 */

// ─── Domain → Category Database ──────────────────────────────────────────────

const SITE_DB = new Map([
  // Social Media
  ['youtube.com', 'Social Media'], ['m.youtube.com', 'Social Media'],
  ['facebook.com', 'Social Media'], ['m.facebook.com', 'Social Media'],
  ['twitter.com', 'Social Media'], ['x.com', 'Social Media'],
  ['instagram.com', 'Social Media'],
  ['tiktok.com', 'Social Media'],
  ['reddit.com', 'Social Media'], ['old.reddit.com', 'Social Media'],
  ['snapchat.com', 'Social Media'],
  ['linkedin.com', 'Social Media'],
  ['threads.net', 'Social Media'],
  ['pinterest.com', 'Social Media'],
  ['tumblr.com', 'Social Media'],
  ['bsky.app', 'Social Media'],
  ['mastodon.social', 'Social Media'],
  ['quora.com', 'Social Media'],

  // Entertainment
  ['netflix.com', 'Entertainment'],
  ['twitch.tv', 'Entertainment'],
  ['hulu.com', 'Entertainment'],
  ['disneyplus.com', 'Entertainment'],
  ['primevideo.com', 'Entertainment'],
  ['crunchyroll.com', 'Entertainment'],
  ['9gag.com', 'Entertainment'],
  ['imdb.com', 'Entertainment'],
  ['rottentomatoes.com', 'Entertainment'],
  ['max.com', 'Entertainment'],
  ['peacocktv.com', 'Entertainment'],
  ['funimation.com', 'Entertainment'],
  ['vimeo.com', 'Entertainment'],
  ['dailymotion.com', 'Entertainment'],
  ['fandom.com', 'Entertainment'],

  // Shopping
  ['amazon.com', 'Shopping'], ['smile.amazon.com', 'Shopping'],
  ['ebay.com', 'Shopping'],
  ['etsy.com', 'Shopping'],
  ['aliexpress.com', 'Shopping'],
  ['walmart.com', 'Shopping'],
  ['target.com', 'Shopping'],
  ['bestbuy.com', 'Shopping'],
  ['shein.com', 'Shopping'],
  ['wish.com', 'Shopping'],
  ['temu.com', 'Shopping'],
  ['newegg.com', 'Shopping'],
  ['shopify.com', 'Shopping'],
  ['banggood.com', 'Shopping'],

  // Gaming
  ['store.steampowered.com', 'Gaming'],
  ['steampowered.com', 'Gaming'],
  ['epicgames.com', 'Gaming'],
  ['roblox.com', 'Gaming'],
  ['leagueoflegends.com', 'Gaming'],
  ['ea.com', 'Gaming'],
  ['ign.com', 'Gaming'],
  ['gamespot.com', 'Gaming'],
  ['pcgamer.com', 'Gaming'],
  ['chess.com', 'Gaming'],
  ['lichess.org', 'Gaming'],
  ['miniclip.com', 'Gaming'],
  ['poki.com', 'Gaming'],
  ['kongregate.com', 'Gaming'],
  ['coolmathgames.com', 'Gaming'],
  ['crazygames.com', 'Gaming'],

  // Sports & Fantasy (distraction)
  ['espn.com', 'Sports & Fantasy'],
  ['formula1.com', 'Sports & Fantasy'],
  ['nfl.com', 'Sports & Fantasy'],
  ['nba.com', 'Sports & Fantasy'],
  ['mlb.com', 'Sports & Fantasy'],
  ['premierleague.com', 'Sports & Fantasy'],
  ['skysports.com', 'Sports & Fantasy'],
  ['draftkings.com', 'Sports & Fantasy'],
  ['fanduel.com', 'Sports & Fantasy'],
  ['bet365.com', 'Sports & Fantasy'],
  ['flashscore.com', 'Sports & Fantasy'],

  // Dev Tools
  ['github.com', 'Dev Tools'],
  ['gitlab.com', 'Dev Tools'],
  ['stackoverflow.com', 'Dev Tools'],
  ['stackexchange.com', 'Dev Tools'],
  ['npmjs.com', 'Dev Tools'],
  ['codepen.io', 'Dev Tools'],
  ['jsfiddle.net', 'Dev Tools'],
  ['codesandbox.io', 'Dev Tools'],
  ['replit.com', 'Dev Tools'],
  ['vercel.com', 'Dev Tools'],
  ['netlify.com', 'Dev Tools'],
  ['heroku.com', 'Dev Tools'],
  ['bitbucket.org', 'Dev Tools'],
  ['pypi.org', 'Dev Tools'],
  ['crates.io', 'Dev Tools'],
  ['hub.docker.com', 'Dev Tools'],
  ['digitalocean.com', 'Dev Tools'],
  ['aws.amazon.com', 'Dev Tools'],
  ['console.cloud.google.com', 'Dev Tools'],
  ['portal.azure.com', 'Dev Tools'],
  ['developer.mozilla.org', 'Dev Tools'],
  ['postman.com', 'Dev Tools'],
  ['swagger.io', 'Dev Tools'],
  ['railway.app', 'Dev Tools'],
  ['render.com', 'Dev Tools'],
  ['firebase.google.com', 'Dev Tools'],
  ['supabase.com', 'Dev Tools'],

  // AI Tools (productive — always helpful)
  ['chat.openai.com', 'AI Tools'],
  ['chatgpt.com', 'AI Tools'],
  ['claude.ai', 'AI Tools'],
  ['gemini.google.com', 'AI Tools'],
  ['perplexity.ai', 'AI Tools'],
  ['copilot.microsoft.com', 'AI Tools'],
  ['poe.com', 'AI Tools'],
  ['huggingface.co', 'AI Tools'],
  ['midjourney.com', 'AI Tools'],
  ['you.com', 'AI Tools'],
  ['phind.com', 'AI Tools'],
  ['deepseek.com', 'AI Tools'],
  ['anthropic.com', 'AI Tools'],
  ['openai.com', 'AI Tools'],
  ['groq.com', 'AI Tools'],
  ['together.ai', 'AI Tools'],
  ['replicate.com', 'AI Tools'],
  ['stability.ai', 'AI Tools'],
  ['runway.ml', 'AI Tools'],
  ['labs.google.com', 'AI Tools'],
  ['notebooklm.google.com', 'AI Tools'],

  // Research & Blogs (productive — learning & knowledge)
  ['medium.com', 'Research & Blogs'],
  ['dev.to', 'Research & Blogs'],
  ['hashnode.com', 'Research & Blogs'],
  ['substack.com', 'Research & Blogs'],
  ['arxiv.org', 'Research & Blogs'],
  ['scholar.google.com', 'Research & Blogs'],
  ['wikipedia.org', 'Research & Blogs'],
  ['britannica.com', 'Research & Blogs'],
  ['techcrunch.com', 'Research & Blogs'],
  ['theverge.com', 'Research & Blogs'],
  ['arstechnica.com', 'Research & Blogs'],
  ['wired.com', 'Research & Blogs'],
  ['hackernews.com', 'Research & Blogs'],
  ['news.ycombinator.com', 'Research & Blogs'],
  ['towardsdatascience.com', 'Research & Blogs'],
  ['nature.com', 'Research & Blogs'],
  ['sciencedirect.com', 'Research & Blogs'],
  ['researchgate.net', 'Research & Blogs'],

  // Music (neutral)
  ['spotify.com', 'Music'], ['open.spotify.com', 'Music'],
  ['music.apple.com', 'Music'],
  ['soundcloud.com', 'Music'],
  ['music.youtube.com', 'Music'],
  ['deezer.com', 'Music'],
  ['tidal.com', 'Music'],
  ['pandora.com', 'Music'],

  // Medical
  ['pubmed.ncbi.nlm.nih.gov', 'Medical'],
  ['ncbi.nlm.nih.gov', 'Medical'],
  ['medscape.com', 'Medical'],
  ['uptodate.com', 'Medical'],
  ['webmd.com', 'Medical'],
  ['mayoclinic.org', 'Medical'],
  ['nih.gov', 'Medical'],
  ['who.int', 'Medical'],
  ['healthline.com', 'Medical'],
  ['drugs.com', 'Medical'],
  ['medlineplus.gov', 'Medical'],
  ['bmj.com', 'Medical'],
  ['thelancet.com', 'Medical'],
  ['nejm.org', 'Medical'],

  // News (neutral — can be productive or distraction depending on context)
  ['cnn.com', 'News'],
  ['bbc.com', 'News'], ['bbc.co.uk', 'News'],
  ['nytimes.com', 'News'],
  ['reuters.com', 'News'],
  ['aljazeera.com', 'News'],
  ['theguardian.com', 'News'],
  ['washingtonpost.com', 'News'],
  ['apnews.com', 'News'],
  ['forbes.com', 'News'],
  ['bloomberg.com', 'News'],
  ['vice.com', 'News'],
  ['buzzfeed.com', 'News'],
  ['huffpost.com', 'News'],

  // Productivity
  ['notion.so', 'Productivity'],
  ['trello.com', 'Productivity'],
  ['asana.com', 'Productivity'],
  ['slack.com', 'Productivity'],
  ['zoom.us', 'Productivity'],
  ['meet.google.com', 'Productivity'],
  ['calendar.google.com', 'Productivity'],
  ['figma.com', 'Productivity'],
  ['miro.com', 'Productivity'],
  ['clickup.com', 'Productivity'],
  ['monday.com', 'Productivity'],
  ['linear.app', 'Productivity'],
  ['todoist.com', 'Productivity'],
  ['airtable.com', 'Productivity'],
  ['basecamp.com', 'Productivity'],
  ['loom.com', 'Productivity'],
  ['canva.com', 'Productivity'],

  // Communication (neutral)
  ['gmail.com', 'Communication'], ['mail.google.com', 'Communication'],
  ['outlook.com', 'Communication'], ['outlook.live.com', 'Communication'],
  ['outlook.office.com', 'Communication'],
  ['discord.com', 'Communication'],
  ['telegram.org', 'Communication'], ['web.telegram.org', 'Communication'],
  ['whatsapp.com', 'Communication'], ['web.whatsapp.com', 'Communication'],
  ['teams.microsoft.com', 'Communication'],
  ['messenger.com', 'Communication'],

  // Education
  ['coursera.org', 'Education'],
  ['udemy.com', 'Education'],
  ['khanacademy.org', 'Education'],
  ['edx.org', 'Education'],
  ['leetcode.com', 'Education'],
  ['hackerrank.com', 'Education'],
  ['codecademy.com', 'Education'],
  ['freecodecamp.org', 'Education'],
  ['w3schools.com', 'Education'],
  ['brilliant.org', 'Education'],
  ['skillshare.com', 'Education'],
  ['duolingo.com', 'Education'],

  // Search (neutral)
  ['google.com', 'Search'], ['www.google.com', 'Search'],
  ['bing.com', 'Search'],
  ['duckduckgo.com', 'Search'],
  ['yahoo.com', 'Search'],
  ['ecosia.org', 'Search'],

  // Cloud & Docs
  ['docs.google.com', 'Cloud & Docs'],
  ['drive.google.com', 'Cloud & Docs'],
  ['sheets.google.com', 'Cloud & Docs'],
  ['slides.google.com', 'Cloud & Docs'],
  ['dropbox.com', 'Cloud & Docs'],
  ['onedrive.live.com', 'Cloud & Docs'],
  ['icloud.com', 'Cloud & Docs'],
  ['box.com', 'Cloud & Docs'],
  ['overleaf.com', 'Cloud & Docs'],
]);

// ─── Category Metadata ───────────────────────────────────────────────────────

const CATEGORY_META = {
  // Doom (distraction)
  'Social Media':     { emoji: '📱', color: '#e84060' },
  'Entertainment':    { emoji: '🎬', color: '#e87040' },
  'Shopping':         { emoji: '🛒', color: '#e8c040' },
  'Gaming':           { emoji: '🎮', color: '#c040e8' },
  'Sports & Fantasy': { emoji: '⚽', color: '#e87040' },
  // Good (productive)
  'Dev Tools':        { emoji: '💻', color: '#3a8fd1' },
  'AI Tools':         { emoji: '🤖', color: '#7c6af7' },
  'Research & Blogs': { emoji: '📖', color: '#56c9a0' },
  'Medical':          { emoji: '🏥', color: '#56c9a0' },
  'Productivity':     { emoji: '⚡', color: '#56c9a0' },
  'Education':        { emoji: '📚', color: '#3a8fd1' },
  'Cloud & Docs':     { emoji: '☁️',  color: '#3a8fd1' },
  // Neutral
  'News':             { emoji: '📰', color: '#505070' },
  'Music':            { emoji: '🎵', color: '#505070' },
  'Search':           { emoji: '🔍', color: '#505070' },
  'Communication':    { emoji: '💬', color: '#505070' },
  'Uncategorized':    { emoji: '🌐', color: '#505070' },
  'Others':           { emoji: '📦', color: '#505070' },
};

// ─── Role → Productive Categories ─────────────────────────────────────────────
// AI Tools, Research & Blogs, Education, Productivity, Cloud & Docs are productive for ALL roles.

const ROLE_PRODUCTIVE = {
  developer:  ['Dev Tools', 'AI Tools', 'Research & Blogs', 'Education', 'Productivity', 'Cloud & Docs'],
  medical:    ['Medical', 'AI Tools', 'Research & Blogs', 'Education', 'Productivity', 'Cloud & Docs'],
  journalist: ['News', 'AI Tools', 'Research & Blogs', 'Education', 'Productivity', 'Cloud & Docs'],
  other:      ['AI Tools', 'Research & Blogs', 'Productivity', 'Education', 'Cloud & Docs'],
};

// Shortcut used by analytics.js
const PRODUCTIVE_FOR_ROLE = ROLE_PRODUCTIVE;

// Always neutral — excluded from focus score calculation
const NEUTRAL_CATEGORIES = new Set(['Music', 'Search', 'Communication']);

// Always distraction regardless of role
const DISTRACTION_CATEGORIES = ['Social Media', 'Entertainment', 'Shopping', 'Gaming', 'Sports & Fantasy'];

// ─── Categorization Function ──────────────────────────────────────────────────

function categorize(domain) {
  if (!domain) return 'Uncategorized';

  // Handle YouTube genres specially
  if (domain.startsWith('youtube.com (')) {
    const genre = domain.slice(13, -1);
    
    // Map YouTube API genres to DoomTab categories
    // Full list: https://developers.google.com/youtube/v3/docs/videoCategories
    const genreMap = {
      // Productive → Education
      'Education': 'Education',
      'Science & Technology': 'Education',
      'Howto & Style': 'Education',
      'Nonprofits & Activism': 'Education',
      
      // Neutral
      'Music': 'Music',
      'News & Politics': 'News',
      'Travel & Events': 'News',
      
      // Doom → Entertainment/Social/Gaming/Sports
      'Entertainment': 'Entertainment',
      'Comedy': 'Entertainment',
      'Film & Animation': 'Entertainment',
      'Shows': 'Entertainment',
      'Trailers': 'Entertainment',
      'Gaming': 'Gaming',
      'Sports': 'Sports & Fantasy',
      'People & Blogs': 'Social Media',
      'Pets & Animals': 'Entertainment',
      'Autos & Vehicles': 'Entertainment',
    };
    
    if (genreMap[genre]) return genreMap[genre];
    return 'Entertainment'; // Fallback for unknown youtube genres
  }

  // 1. Exact match
  if (SITE_DB.has(domain)) return SITE_DB.get(domain);

  // 2. Strip www. and retry
  const stripped = domain.replace(/^www\./, '');
  if (stripped !== domain && SITE_DB.has(stripped)) return SITE_DB.get(stripped);

  // 3. Walk up subdomain chain: a.b.c.com → b.c.com → c.com
  let d = stripped;
  while (d.includes('.')) {
    const dot = d.indexOf('.');
    d = d.slice(dot + 1);
    if (SITE_DB.has(d)) return SITE_DB.get(d);
  }

  return 'Uncategorized';
}

// ─── Focus Score Calculation ──────────────────────────────────────────────────

function computeFocusBreakdown(entries, role) {
  const productive = { label: 'Productive', seconds: 0, domains: [] };
  const distraction = { label: 'Distraction', seconds: 0, domains: [] };
  const neutral = { label: 'Neutral', seconds: 0, domains: [] };

  const productiveCats = new Set(ROLE_PRODUCTIVE[role] || ROLE_PRODUCTIVE.other);

  for (const [rawDomain, sec] of entries) {
    const cat = categorize(rawDomain);
    const domain = rawDomain.split(' (')[0]; // Simplify for the arrays

    if (NEUTRAL_CATEGORIES.has(cat)) {
      neutral.seconds += sec;
      if (!neutral.domains.includes(domain)) neutral.domains.push(domain);
    } else if (DISTRACTION_CATEGORIES.includes(cat)) {
      distraction.seconds += sec;
      if (!distraction.domains.includes(domain)) distraction.domains.push(domain);
    } else if (productiveCats.has(cat)) {
      productive.seconds += sec;
      if (!productive.domains.includes(domain)) productive.domains.push(domain);
    } else if (cat === 'Uncategorized') {
      neutral.seconds += sec;
      if (!neutral.domains.includes(domain)) neutral.domains.push(domain);
    } else {
      neutral.seconds += sec;
      if (!neutral.domains.includes(domain)) neutral.domains.push(domain);
    }
  }

  const scored = productive.seconds + distraction.seconds;
  const score = scored > 0 ? Math.round((productive.seconds / scored) * 100) : -1;

  return { productive, distraction, neutral, score };
}

// ─── Group entries by category ────────────────────────────────────────────────

function groupByCategory(entries) {
  const groups = {};
  for (const [rawDomain, sec] of entries) {
    const cat = categorize(rawDomain);
    const domain = rawDomain.split(' (')[0]; // Strip the genre for display

    if (!groups[cat]) groups[cat] = { total: 0, domains: [] };
    groups[cat].total += sec;
    
    // Merge repetitive domains in the same category
    const existing = groups[cat].domains.find(d => d.domain === domain);
    if (existing) {
      existing.sec += sec;
    } else {
      groups[cat].domains.push({ domain, sec });
    }
  }

  for (const g of Object.values(groups)) {
    g.domains.sort((a, b) => b.sec - a.sec);
  }

  return Object.entries(groups)
    .sort(([,a], [,b]) => b.total - a.total)
    .map(([cat, data]) => ({ category: cat, ...data }));
}

// ─── Split groups into Doom / Good ────────────────────────────────────────────

function splitGroups(groups, role) {
  const productiveCats = new Set(ROLE_PRODUCTIVE[role] || ROLE_PRODUCTIVE.other);
  const distractionSet = new Set(DISTRACTION_CATEGORIES);

  const doom = [];
  const good = [];

  for (const g of groups) {
    if (distractionSet.has(g.category)) {
      doom.push(g);
    } else if (productiveCats.has(g.category)) {
      good.push(g);
    } else {
      // Neutral categories (Music, Search, Communication, Uncategorized) → Good side
      good.push(g);
    }
  }

  return { doom, good };
}
