# CLAUDE.md

## Project Context
This is a systematic literature review assistant that works entirely in the browser. It integrates with PubMed E-utilities API (free, no key required) and Claude API (key required) to help researchers screen, export, and synthesise academic papers.

## Critical Rules

### API Configuration
- **Model tiering** — select the most capable model appropriate for each task to conserve tokens:
  - `claude-haiku-4-5-20251001` — criteria generation and per-paper screening (fast, cheap, repeated calls)
  - `claude-sonnet-4-6` — evidence synthesis only (complex reasoning, quality matters)
  - Update model IDs when newer versions are released; always prefer the latest available
- Claude API calls must include headers:
  ```
  x-api-key: <userApiKey>
  anthropic-version: 2023-06-01
  content-type: application/json
  anthropic-dangerous-direct-browser-access: true
  ```

### Error Handling
- PubMed API errors: Show user-friendly message, allow retry
- Claude API errors: Display error, continue with remaining papers, allow manual override
- XML parsing errors: Handle missing fields gracefully (e.g., "No abstract available")
- Rate limiting: Always add 500ms delay between Claude API calls

### Data Handling
- API key stored in memory only — NEVER persist to localStorage, sessionStorage, or cookies
- Paper data persists in JavaScript memory during session
- App logic is entirely client-side; `server.js` is a thin static file server only

## Deployment (Railway)

### Server
- `server.js` — minimal Express server, serves only `index.html` at `/`, blocks all other paths
- `package.json` — declares `express` and `express-basic-auth` as the only dependencies
- `railway.json` — Railway build/deploy config (nixpacks builder, `npm start`)

### Password Protection
- HTTP Basic Auth is enforced at the server level before any content is served
- Credentials are stored **only** as Railway environment variables — never in code
- Required env vars (set in Railway dashboard):
  - `AUTH_USER` — the login username
  - `AUTH_PASS` — the login password
- Server exits immediately on startup if either env var is missing

### Security Notes
- Only `index.html` is served; CLAUDE.md, README.md, and all other files return 404
- Railway enforces HTTPS — Basic Auth credentials are always encrypted in transit
- No user data is ever stored server-side; all processing is client-side in the browser

### Common Bugs to Avoid

1. **XML Parsing Failures**
   - PubMed XML may have empty `<AbstractText>` tags
   - Authors may be missing or formatted inconsistently
   - Always use defensive checks: `element?.textContent || "N/A"`

2. **Async/Await Issues**
   - Always await fetch calls before proceeding
   - Use Promise.all with caution — for parallel API calls, add delays to avoid rate limiting
   - Show progress feedback during async operations

3. **State Management**
   - Keep results array in sync with displayed table
   - Update UI immediately when decisions change
   - Store original AI decision separately from manual overrides

4. **CSV Export**
   - Properly escape fields containing commas or quotes
   - Use double-quotes around fields and escape internal double-quotes

5. **Missing Abstracts**
   - Papers without abstracts should be marked "No abstract available"
   - Automatically exclude from AI screening
   - Still allow export but note the limitation

## Implementation Notes

### PubMed E-utilities
- Search: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=<query>&retmax=<count>&retmode=xml`
- Fetch: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=<ids>&retmode=xml`

### Claude API Format
- Direct browser fetch to: `https://api.anthropic.com/v1/messages`
- Messages format with system prompt and user content
- Parse JSON response from Claude

### UI Requirements
- 4 clear stages with step indicator at top
- Progress bar and counter during screening
- Color-coded decision badges (green/red/yellow)
- Expandable abstract rows
- Clean, professional light color scheme
