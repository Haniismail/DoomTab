<div align="center">

# 💀 DoomTab

**Know where your time actually goes.**

A zero-dependency Chrome extension that tracks your browsing habits, scores your focus, calls out your worst distractions by name — and helps you break free from rabbit holes in real time.

[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-56c9a0)](.)
[![License: MIT](https://img.shields.io/badge/License-MIT-7c6af7)](LICENSE)
[![Privacy](https://img.shields.io/badge/Data-100%25%20Local-e8c040)](.)

</div>

---

## The Problem

You open your browser to "quickly check something." Two hours later, you're deep in a Reddit thread about whether a hotdog is a sandwich. DoomTab makes that invisible time visible — and actually helps you stop.

## What Makes It Different

Most time trackers just show you numbers. DoomTab is an **active behavioral engine** — it reads your data in real time and tells you exactly what's going wrong (or right), who's responsible, and how much time you have left to fix it.

---

## ✨ Features

### 📊 Focus Score & Smart Insights
A real-time focus score (0–100%) based on your productive vs. distraction time. The insight bar calls out specific sites by name:
- **Doom View** — *"🔥 reddit.com and youtube.com are dragging you off track"*
- **Good View** — *"⚡ claude.ai and github.com could pull your score up"*
- Shows how many hours you have left to save the day

### 🔥 Duolingo-Style Streaks
Consecutive days with 60%+ focus score build your streak. A 14-day calendar grid tracks your history. Break the streak? You'll feel it.
- **Streak Alarm** — 2 hours before midnight, if you're below threshold, you get a notification warning

### 🐇 Anti Rabbit Hole — Real-Time Interventions
When you spiral from a productive site into a distraction chain, DoomTab intervenes:
- Fullscreen overlay: *"You've been on reddit.com for 42 minutes"*
- Three choices: **Continue (5 min)** · **Close Tab** · **Snooze**
- Configurable sensitivity: Aggressive / Moderate / Chill
- Powered by the Triggers engine — it knows your patterns

### 🔍 1. Patterns (The "When" & "How")
*Coming soon: Maps out your habits over time to find the rhythm of your distractions.*
- **The Danger Zone Heatmap:** A visual calendar showing exactly what time of day your focus crashes. *(e.g. "Your focus score drops by 40% every day between 2:00 PM and 4:00 PM. This is your Danger Zone.")*
- **The Weekend Bleed:** Tracks if bad habits are spilling over. *(e.g. "You've been bringing your Sunday doom-scrolling habits into Monday mornings.")*
- **Doom-Scrolling Velocity:** Logs how aggressively you jump between sites. *(e.g. "You opened 15 different Reddit tabs in 10 minutes.")*

### ⚡ 2. Triggers (The "Why")
*Coming soon: Maps out the "gateway" sites that cause you to spiral into distraction.*
- **The Gateway Flowchart:** Shows you exactly which website started the distraction chain. *(e.g. "⚠️ Gateway Alert: 80% of the time you visit gmail.com, you end up on youtube.com within 3 minutes.")*
- **Habit Loops:** Identifies repetitive behavior. *(e.g. "You have a habit loop: github.com ➔ news.ycombinator.com ➔ twitter.com. Breaking the link after Hacker News saves you 45 minutes on average.")*
- **Bounce Rate Analysis:** Measures micro-distractions. *(e.g. "You check instagram.com for 30 seconds exactly every 15 minutes.")*

### 🎯 3. Focus (The "What Works")
*Coming soon: Analyzes your peak productivity states to tell you how to replicate your best days.*
- **Productivity Anchors:** Discovers the starting points for your best days. *(e.g. "✨ Anchor Found: On days when your first visit is notion.so, your average daily focus score is 88. Starting here sets you up for success.")*
- **Deep Work Blocks:** Tracks uninterrupted flow states. *(e.g. "You achieved 2.5 hours of completely uninterrupted deep work today while inside vscode.dev.")*
- **Streak Analysis:** Correlates your best streaks with specific behaviors. *(e.g. "Your longest streak is 14 days, and all your best streaks happen when you avoid Social Media entirely before 10 AM.")*

### 🌗 Adaptive Theming
Automatically switches between dark and light mode based on your browser/OS preference. Every component — from canvas charts to streak calendars — responds to `prefers-color-scheme`.

### 🍩 Interactive Today View
- **Doom/Good toggle** — split your browsing into productive vs. distraction categories
- **Collapsible categories** — expand any category to see individual site breakdowns
- **Top Sites** — the 4 domains consuming the most time in each view
- **Donut chart** — visual doom-vs-good split at a glance

---

## 🖥️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   background.js                      │
│  Service Worker — always-on tracking engine           │
│  • Tab/window focus detection                        │
│  • Midnight data archival (chrome.alarms)            │
│  • Streak check alarm (2h before midnight)           │
│  • Intervention trigger evaluation                   │
└──────────┬──────────────────────────────┬────────────┘
           │                              │
           ▼                              ▼
┌──────────────────┐          ┌─────────────────────┐
│    popup.html    │          │    intervene.js      │
│  popup.js        │          │  Content script      │
│  categories.js   │          │  Injected on-demand  │
│  analytics.js    │          │  via chrome.scripting │
│                  │          │                       │
│  • Score Ring    │          │  • Fullscreen overlay │
│  • Insight Bar   │          │  • Continue / Close   │
│  • Today View    │          │  • Snooze per-domain  │
│  • Streak Grid   │          └─────────────────────┘
│  • Patterns      │
│  • Triggers      │
│  • Focus Heatmap │
│  • Rabbit Hole   │
└──────────────────┘
```

### Data Flow

| Layer | Storage Key | Purpose |
|---|---|---|
| Live tracking | `domain.com` | Seconds spent today per domain |
| Daily archive | `_day_2026-03-28` | Full snapshot archived at midnight |
| Streak data | `_streak`, `_streakBest` | Current + best streak counts |
| Settings | `_userRole`, `_focusSites` | User preferences |
| Interventions | `_rabbitHole`, `_rabbitSnooze` | Intervention config + snooze state |
| Analytics | `_interventionLog` | Recent intervention events |

---

## 🚀 Install

### From Source (Developer Mode)

```bash
git clone https://github.com/YOUR_USERNAME/DoomTab.git
```

1. Open `chrome://extensions` in Chrome
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load Unpacked** → select the cloned folder
4. Pin 💀 **DoomTab** from the extensions puzzle icon

### First Launch
On first open, you'll pick your role (Developer, Student, Designer, etc.) — this tells DoomTab how to categorize sites as productive vs. distracting for your specific workflow.

---

## 🛠️ Tech Stack

| | |
|---|---|
| **Runtime** | Chrome Extension Manifest V3 |
| **Tracking** | Service Worker + `chrome.tabs` / `chrome.windows` events |
| **Storage** | `chrome.storage.local` (100% on-device) |
| **Interventions** | `chrome.scripting.executeScript` (on-demand injection) |
| **Notifications** | `chrome.notifications` (streak warnings) |
| **Alarms** | `chrome.alarms` (midnight reset, streak check) |
| **UI** | Vanilla JS + HTML Canvas (score ring, donut chart) |
| **Styling** | CSS custom properties with `prefers-color-scheme` |
| **Dependencies** | **Zero.** No frameworks, no bundlers, no build step. |

---

## 🔒 Privacy

**All data stays on your device. Period.**

- No analytics, no telemetry, no external requests
- No accounts, no sign-ups, no cloud sync
- No tracking pixels, no fingerprinting
- `host_permissions` is used exclusively for the intervention overlay injection
- You can verify this: the extension makes zero network calls

---

## 📁 File Map

```
DoomTab/
├── manifest.json      # Extension config (MV3)
├── background.js      # Service worker — tracking, alarms, interventions
├── popup.html         # UI markup + full CSS (incl. light/dark themes)
├── popup.js           # All rendering logic — score, today, charts, streaks
├── categories.js      # Site categorization engine + focus scoring
├── analytics.js       # Pattern detection, trigger analysis, focus heatmap
├── intervene.js       # Content script — rabbit hole overlay
└── icons/             # Extension icons (16, 48, 128)
```

---

## 🗺️ Roadmap

- [ ] Chrome Web Store publication
- [ ] Weekly/monthly summary reports
- [ ] Custom category overrides (move a site between doom/good)
- [ ] Focus mode scheduling (auto-block doom sites during set hours)
- [ ] Data export (full history JSON/CSV)
- [ ] Firefox & Edge support

See [Issues](../../issues) for feature requests and bugs.

---

## 🤝 Contributing

Contributions welcome. The codebase is intentionally framework-free — please keep it that way.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-thing`)
3. Commit your changes (`git commit -m 'Add your-thing'`)
4. Push to the branch (`git push origin feature/your-thing`)
5. Open a Pull Request

---

## 📄 License

[MIT](LICENSE) — do whatever you want with it.

---

<div align="center">

**Built with spite for doomscrolling and love for deep work.**

💀

</div>
