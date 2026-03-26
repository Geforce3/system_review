# NUS Libraries — Systematic Review Assistant

A browser-based tool for conducting systematic literature reviews using PubMed. Helps researchers search, screen, export, and synthesise academic papers with AI-assisted decision support.

## Features

- **Stage 1 — Search**: Fetch papers from PubMed using any boolean search query
- **Stage 2 — AI Screening**: Claude auto-screens papers against editable inclusion/exclusion criteria; pause/stop/manual override supported
- **Stage 3 — Export**: PRISMA flow summary; download results as CSV or RIS
- **Stage 4 — Synthesis**: Generate a structured narrative synthesis and evidence table from included papers
- **Session save/restore**: Export and reimport your screening session as JSON (API key excluded)

---

## Quick Start (Local — no server needed)

```bash
# 1. Clone the repository
git clone https://github.com/Geforce3/system_review.git
cd system_review

# 2. Open directly in your browser
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

Then in the app:
1. Enter your PubMed search query
2. Enter your Claude API key (get one at [console.anthropic.com](https://console.anthropic.com))
3. Click **Search PubMed** — criteria are auto-generated
4. Edit criteria if needed, then click **Screen All Papers with AI**
5. Click any badge to manually override a decision
6. Download CSV or RIS in Stage 3
7. Generate an evidence synthesis in Stage 4

---

## Running the Server Locally (mirrors Railway deployment)

```bash
# 1. Clone and install
git clone https://github.com/Geforce3/system_review.git
cd system_review
npm install

# 2. Set credentials
export AUTH_USER=yourUsername
export AUTH_PASS=yourPassword

# 3. Start
npm start
# Open http://localhost:3000
```

---

## Deploying to Railway

### Prerequisites
- A [Railway](https://railway.app) account
- This repository accessible on your GitHub

### Step 1 — Create a Railway project
1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo**
3. Authorise Railway and select **system_review**

### Step 2 — Set environment variables
In your Railway project → **Variables**, add:

| Variable | Value |
|---|---|
| `AUTH_USER` | Your chosen username (e.g. `nuslibteam`) |
| `AUTH_PASS` | A strong password |

Railway restarts the deployment automatically after saving.

### Step 3 — Generate a public domain
Go to **Settings → Networking → Generate Domain**.
You'll get a free `*.up.railway.app` HTTPS URL.

### Step 4 — Share with your team
Send the URL and credentials to team members via a secure channel (e.g. Teams/Slack DM).
Each user enters their own Claude API key in the app — it is never sent to the server.

### Step 5 — Auto-deploy on push
Every push to the `main` branch on GitHub triggers an automatic redeploy on Railway.

---

## Requirements

| Use case | Requirements |
|---|---|
| Local (open file) | Any modern browser (Chrome, Firefox, Safari, Edge) |
| Local (server) | Node.js ≥ 18, npm |
| Railway deployment | Railway account, GitHub repo |
| AI features | Claude API key from [console.anthropic.com](https://console.anthropic.com) |

---

## Technical Details

- **Tech stack**: Plain HTML/CSS/JS — no frontend frameworks
- **PubMed integration**: NCBI E-utilities API (free, no key required)
- **AI integration**: Claude API — direct browser-to-Anthropic calls
  - `claude-haiku-4-5-20251001` — criteria generation and paper screening
  - `claude-sonnet-4-6` — evidence synthesis
- **Server**: Minimal Express.js + HTTP Basic Auth (Railway only; not needed for local use)
- **Privacy**: Claude API key stored in browser memory only; never sent to the server or persisted anywhere

---

## Disclaimer

AI screening is assistive only. All screening decisions should be verified by the researcher. This tool supports the systematic review process and does not replace expert judgement.
