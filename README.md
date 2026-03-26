# Systematic Review Assistant

A browser-based tool for conducting systematic literature reviews across multiple academic databases. Helps researchers search, screen, export, and synthesise academic papers with AI-assisted decision support.

## Features

- **Stage 1 — Search**: Fetch papers from PubMed, Europe PMC, OpenAlex, and Semantic Scholar — choose any combination
- **Stage 2 — AI Screening**: Claude auto-screens papers against editable inclusion/exclusion criteria; pause/stop/manual override supported
- **Stage 3 — Export**: PRISMA flow summary with per-database breakdown; download results as CSV or RIS
- **Stage 4 — Synthesis**: Generate a structured narrative synthesis and evidence table from included papers
- **Deduplication**: Papers appearing in multiple databases are automatically merged
- **Session save/restore**: Export and reimport your screening session as JSON (API keys excluded)
- **Navigation**: Clickable step indicators let you jump back to any stage you've visited; "← Back to Search" on Stage 2 lets you run an additional query (merge or clear); "🔄 New Search" in the header restarts from scratch at any point (API keys preserved)

---

## Supported Databases

| Database | Key Required | Notes |
|---|---|---|
| PubMed | No (NCBI key optional) | Biomedical literature |
| Europe PMC | No | Life sciences, open access focus |
| OpenAlex | Yes (free) | Broad academic coverage |
| Semantic Scholar | No (optional for higher limits) | Requires server deployment |

> **Semantic Scholar** uses a server-side proxy to bypass browser CORS restrictions. It is not available when opening the app as a local file — use the Railway deployment instead.

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
1. Select the databases to search (PubMed, Europe PMC, OpenAlex — Semantic Scholar requires server)
2. Enter your search query
3. Enter your Claude API key (get one at [console.anthropic.com](https://console.anthropic.com))
4. Click **Search** — criteria are auto-generated
5. Edit criteria if needed, then click **Screen All Papers with AI**
6. Click any badge to manually override a decision
7. Download CSV or RIS in Stage 3
8. Generate an evidence synthesis in Stage 4

---

## API Keys

### Claude API Key (required for AI features)
Register at [console.anthropic.com](https://console.anthropic.com). Enter your key in the app — it is stored in browser memory only and never sent to the server.

### OpenAlex API Key (required for OpenAlex searches)
Since February 2026, OpenAlex requires a free registered key:
1. Go to [openalex.org/getting-started](https://openalex.org/getting-started)
2. Register your email address
3. Enter the email/key in the OpenAlex API Key field in the app

### NCBI API Key (optional — PubMed only)
Increases PubMed rate limit from 3 to 10 requests/second. Register at [ncbi.nlm.nih.gov/account](https://www.ncbi.nlm.nih.gov/account/).

### Semantic Scholar API Key (optional)
No key needed for basic use. A key increases rate limits. Register at [semanticscholar.org](https://www.semanticscholar.org/product/api). Semantic Scholar is only available via the server deployment.

---

## Running the Server Locally (enables Semantic Scholar)

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
| `AUTH_USER` | Your chosen username (e.g. `myteam`) |
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
| OpenAlex searches | Free OpenAlex key from [openalex.org](https://openalex.org/getting-started) |
| Semantic Scholar | Server deployment (local file not supported) |

---

## Technical Details

- **Tech stack**: Plain HTML/CSS/JS — no frontend frameworks
- **PubMed integration**: NCBI E-utilities API (free, no key required)
- **Europe PMC integration**: EBI REST API (free, no key required)
- **OpenAlex integration**: OpenAlex API (free key required since Feb 2026)
- **Semantic Scholar integration**: Server-side proxy via Express.js (CORS bypass)
- **AI integration**: Claude API — direct browser-to-Anthropic calls
  - `claude-haiku-4-5-20251001` — criteria generation and paper screening
  - `claude-sonnet-4-6` — evidence synthesis
- **Server**: Minimal Express.js + HTTP Basic Auth (Railway only; not needed for local use)
- **Privacy**: Claude API key stored in browser memory only; never sent to the server or persisted anywhere
- **Deduplication**: Papers matched by DOI, then by normalized title across databases

---

## Disclaimer

AI screening is assistive only. All screening decisions should be verified by the researcher. This tool supports the systematic review process and does not replace expert judgement.
