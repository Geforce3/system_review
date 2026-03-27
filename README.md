# Systematic Review Assistant

A browser-based tool for conducting systematic literature reviews across multiple academic databases. Helps researchers search, screen, export, and synthesise academic papers with AI-assisted decision support.

## Features

- **Stage 1 — Search**: Fetch papers from PubMed, Europe PMC, OpenAlex, Semantic Scholar, and ClinicalTrials.gov — choose any combination
- **Multi-provider AI models**: Choose from Claude (Haiku, Sonnet, Opus), OpenAI (GPT-4o, GPT-4o Mini), or Gemini (2.5 Pro, 2.0 Flash). Select a single model for all tasks, or separate models for screening vs. analysis.
- **Search Strategy Builder**: Before searching, click "Build Search Strategy" to have the AI generate an optimised PubMed query (with MeSH terms and field tags) and a general keyword query for other databases. Edit either query before running the search. Includes a "Learn about search strategies" panel covering boolean operators, MeSH terms, field tags, and truncation.
- **Stage 2 — AI Screening**: AI auto-screens papers against editable inclusion/exclusion criteria; pause/stop/manual override supported
- **Stage 3 — Export**: PRISMA 2020 visual flowchart (Identification → Screening → Included) with per-database breakdown; exclusion reason analysis with percentage bars; download results as CSV or RIS
- **PRISMA Narrative**: Generate a template narrative (no AI tokens) or an AI-written formal PRISMA methods paragraph ready to copy into your paper. Includes a "Learn about PRISMA" guide.
- **PRISMA Flow Check**: AI reviews your PRISMA statistics for mathematical consistency and methodology soundness — flags issues with numbers, database coverage, exclusion rates, and criteria quality.
- **Decision Verification**: Run a second AI pass on all screened papers using your chosen analysis model. View a disagreement report showing where the two passes differ, and selectively or bulk-accept the verification suggestions.
- **Stage 4 — Synthesis**: Generate a structured narrative synthesis and evidence table from included papers; download as Markdown, Plain text, HTML, Word (.doc), or PDF
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
| ClinicalTrials.gov | No | Clinical trials registry; works as local file too |

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

### Claude API Key (required for Claude models)
Register at [console.anthropic.com](https://console.anthropic.com). Enter your key in the app — it is stored in browser memory only and never sent to the server.

### OpenAI API Key (required for GPT models)
Register at [platform.openai.com](https://platform.openai.com). Enter your key in the **Database API Keys** section. Only needed if you select a GPT model.

### Google AI API Key (required for Gemini models)
Get a free key at [aistudio.google.com](https://aistudio.google.com). Enter your key in the **Database API Keys** section. Only needed if you select a Gemini model.

### OpenAlex API Key (required for OpenAlex searches)
Since February 2026, OpenAlex requires a free registered key:
1. Go to [openalex.org/getting-started](https://openalex.org/getting-started)
2. Register your email address
3. Enter the email/key in the OpenAlex API Key field in the app

### NCBI API Key (optional — PubMed only)
Increases PubMed rate limit from 3 to 10 requests/second. Register at [ncbi.nlm.nih.gov/account](https://www.ncbi.nlm.nih.gov/account/).

### Semantic Scholar API Key (optional — recommended for Railway deployments)
No key needed for basic use. However, the unauthenticated tier allows only ~1 request/second from a single IP. Because all users share the Railway server's IP, the rate limit is hit quickly under concurrent use — resulting in a 429 error. The server retries automatically (up to 3×), but a free API key raises the limit significantly. Register at [semanticscholar.org](https://www.semanticscholar.org/product/api). Semantic Scholar is only available via the server deployment.

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
| Claude AI features | Claude API key from [console.anthropic.com](https://console.anthropic.com) |
| GPT AI features | OpenAI API key from [platform.openai.com](https://platform.openai.com) |
| Gemini AI features | Google AI API key from [aistudio.google.com](https://aistudio.google.com) |
| OpenAlex searches | Free OpenAlex key from [openalex.org](https://openalex.org/getting-started) |
| Semantic Scholar | Server deployment (local file not supported) |

---

## Technical Details

- **Tech stack**: Plain HTML/CSS/JS — no frontend frameworks
- **PubMed integration**: NCBI E-utilities API (free, no key required)
- **Europe PMC integration**: EBI REST API (free, no key required)
- **OpenAlex integration**: OpenAlex API (free key required since Feb 2026)
- **Semantic Scholar integration**: Server-side proxy via Express.js (CORS bypass)
- **AI integration**: Multi-provider — direct browser calls to each provider's API
  - Claude: `claude-haiku-4-5-20251001`, `claude-sonnet-4-6`, `claude-opus-4-6`
  - OpenAI: `gpt-4o`, `gpt-4o-mini`
  - Gemini: `gemini-2.5-pro-preview-05-06`, `gemini-2.0-flash`
- **Server**: Minimal Express.js + HTTP Basic Auth (Railway only; not needed for local use)
- **Privacy**: All API keys stored in browser memory only; never sent to the server or persisted anywhere
- **Deduplication**: Papers matched by DOI, then by normalized title across databases

---

## Disclaimer

AI screening is assistive only. All screening decisions should be verified by the researcher. This tool supports the systematic review process and does not replace expert judgement.
