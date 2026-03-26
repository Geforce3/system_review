# CLAUDE.md

## Project Context
This is a systematic literature review assistant that works entirely in the browser. It integrates with multiple academic databases and Claude API (key required) to help researchers search, screen, export, and synthesise academic papers.

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
- App logic is entirely client-side; `server.js` is a thin static file server + Semantic Scholar proxy only

## Databases

### PubMed (NCBI E-utilities)
- No key required; NCBI API key optional (increases rate limit from 3→10 req/s)
- Search: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=<query>&retmax=<count>&retmode=xml`
- Fetch: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=<ids>&retmode=xml`
- Fetch in chunks of 200 PMIDs at a time
- Response format: XML — parse with DOMParser, handle missing/multiple AbstractText sections

### Europe PMC
- No key required
- Search + fields in one call: `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=<q>&format=json&pageSize=<n>&resultType=core&cursorMark=<cursor>`
- Use cursor-based pagination; initial cursorMark is `*`
- Response format: JSON — `response.resultList.result[]`
- Abstract field: `result.abstractText` (may be absent)
- Authors: `result.authorList.author[]` each with `lastName`, `initials`
- DOI: `result.doi`

### OpenAlex
- Free API key required since Feb 2026 — users must register at https://openalex.org/getting-started
- Provide email as API key (polite pool) or registered key via `api_key` param
- Search endpoint: `https://api.openalex.org/works?search=<q>&per-page=<n>&page=<p>&select=id,title,authorships,publication_year,primary_location,abstract_inverted_index,ids&mailto=<email>`
- Response format: JSON — `data.results[]`
- Abstract: stored as inverted index `{word: [positions]}` — must reconstruct with `reconstructOAAbstract()`
- DOI: `result.ids.doi` (full URL like `https://doi.org/10.xxx`) — strip prefix when storing
- Journal: `result.primary_location.source.display_name`
- Authors: `result.authorships[].author.display_name`

### ClinicalTrials.gov (NLM/NIH)
- No key required; **CORS-enabled** — can be called directly from the browser (no proxy needed)
- Search endpoint: `https://clinicaltrials.gov/api/v2/studies?query.term=<q>&pageSize=<n>&format=json&fields=<fields>`
- Fields requested: `NCTId,BriefTitle,OfficialTitle,BriefSummary,DetailedDescription,LeadSponsorName,StartDate,CompletionDate,OverallStatus,Condition,InterventionType,InterventionName`
- Response format: JSON — `data.studies[]`, each with nested `protocolSection` modules
- Abstract: `protocolSection.descriptionModule.briefSummary` or `detailedDescription`; enriched with conditions and interventions joined as plain text
- Authors: `protocolSection.sponsorCollaboratorsModule.leadSponsor.name`
- ID: `protocolSection.identificationModule.nctId` (stored in `pmid` field; format `NCT########`)
- No DOI field — leave blank
- Source tag: `ct`; badge class: `src-ct`

### Semantic Scholar
- **CORS-blocked for direct browser calls** — requires server-side proxy
- Cannot be used when app is opened as a local file (`file://` protocol)
- Server proxy route: `GET /api/semantic-scholar?query=<q>&limit=<n>&apiKey=<k>`
- Proxy forwards to: `https://api.semanticscholar.org/graph/v1/paper/search`
- Fields requested: `title,authors,year,abstract,externalIds,journal,publicationVenue`
- No key required for basic use; optional S2 API key increases rate limits
- SSRF prevention: hostname hardcoded in server.js, never taken from client input
- Timeout: 15 seconds

## Deployment (Railway)

### Server
- `server.js` — minimal Express server, serves only `index.html` at `/`, blocks all other paths, proxies Semantic Scholar
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
- DOI links validated against `/^10\.\d{4,}\/\S+$/` before constructing `https://doi.org/` URLs (open redirect prevention)
- Error messages escaped with `esc()` before DOM insertion (XSS prevention)
- Semantic Scholar proxy: limit clamped server-side to max 100, API keys not logged

### Deduplication
- Papers from multiple databases are deduplicated in two passes:
  1. By normalized DOI (lowercased, `https://doi.org/` prefix stripped)
  2. By normalized title (lowercased, punctuation stripped, min 10 chars)
- First database to return a paper wins; subsequent duplicates are discarded
- Source badges show original database(s) on each paper row

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

6. **OpenAlex Abstract Reconstruction**
   - `abstract_inverted_index` maps words to arrays of positions
   - Reconstruct by creating an array indexed by position, filling in words, then joining
   - May be null for some records — handle gracefully

7. **Semantic Scholar Local File**
   - Detect `window.location.protocol === 'file:'` and disable S2 checkbox
   - Show clear warning that S2 requires server deployment

## Implementation Notes

### Claude API Format
- Direct browser fetch to: `https://api.anthropic.com/v1/messages`
- Messages format with system prompt and user content
- Parse JSON response from Claude

### UI Requirements
- 4 clear stages with step indicator at top
- Database selector in Stage 1 with per-DB status indicators
- Progress bar and counter during screening
- Color-coded decision badges (green/red/yellow/grey)
- Source badges on paper rows showing originating database
- Expandable abstract rows
- Clean, professional light color scheme
- Per-database breakdown in PRISMA flow section

### Navigation
- **Step indicators** (header) are clickable for any stage the user has already reached (`state.maxStageReached` tracks the highest stage visited)
- Clicking step 1 when papers exist triggers `confirmBackToSearch()` — user chooses keep or clear
- **🔄 New Search** button in header is always visible and calls `confirmRestart()` — clears all papers, criteria, synthesis; preserves API keys; resets `maxStageReached` to 1
- **← Back to Search** button on Stage 2 bottom also calls `confirmBackToSearch()`
- All destructive navigation goes through a confirmation modal (`showModal()`)
- Modal closes on Escape key or backdrop click; `aria-labelledby` and `aria-describedby` for accessibility
- `showModal(title, body, buttons)` — `body` accepts safe HTML strings only; never pass unsanitized user input
