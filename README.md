🪞 FocusMirror
<p align="center"> A lightweight Chrome extension that reflects your browsing habits back to you. </p> <p align="center"> Track where your attention goes and take control of your focus. </p> <p align="center">








</p>
✨ Overview

FocusMirror helps you understand how you spend your time online.

Instead of guessing where your attention goes, the extension automatically tracks time spent on each website and displays a simple overview directly in the browser.

The goal is simple:

Make your browsing habits visible so you can improve your focus.

🚀 Features
⏱ Website Time Tracking

Tracks the time spent on each domain while browsing.

📊 Ranked Usage Overview

Displays websites ordered by time spent.

⚡ Lightweight

Runs efficiently with minimal resource usage.

🔒 Privacy First

No analytics, no external servers, no data collection.

🧩 Modern Extension Architecture

Built using Chrome Manifest V3.

🏗 Project Structure
focusmirror/
│
├── manifest.json
├── background.js
├── popup.html
└── popup.js
manifest.json

Defines extension configuration, permissions, and entry points.

background.js

Handles:

tab activity detection
time tracking
domain extraction
data storage
popup.html

The extension popup interface.

popup.js

Loads stored browsing data and displays it to the user.

⚙️ How It Works

1️⃣ Detect the active browser tab.

2️⃣ Record the timestamp.

3️⃣ When the tab changes, calculate the time spent.

4️⃣ Extract the domain name.

5️⃣ Store aggregated time per domain using:

chrome.storage.local

6️⃣ Display results inside the extension popup.

🧪 Example Output
youtube.com      1h 23m
twitter.com      48m
github.com       32m
stackoverflow.com 15m
🛠 Tech Stack
JavaScript
Chrome Extensions API
Manifest V3
HTML
CSS
🔐 Privacy

FocusMirror is designed to be privacy-first.

All data:

stays on your device
is stored locally
is never sent to external servers

No accounts required.

🚀 Installation
Clone the repository
git clone https://github.com/YOUR_USERNAME/focusmirror.git
Load the extension
Open Chrome
Navigate to:
chrome://extensions
Enable Developer Mode
Click Load unpacked
Select the project folder

The extension will now appear in your toolbar.

🛣 Roadmap

Future improvements may include:

Daily usage summaries
Weekly productivity reports
Focus score
Visual charts
Export browsing statistics
Optional cloud sync
🤝 Contributing

Contributions are welcome.

Feel free to open:

Issues
Feature requests
Pull requests
📜 License

MIT License

🧠 Philosophy

Awareness creates control.

FocusMirror doesn't block websites.

It simply shows you the mirror.

⭐ If you find this project useful, consider starring the repository.
