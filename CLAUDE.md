# CLAUDE.md

## Project Context
This is a systematic literature review assistant that works entirely in the browser. It integrates with multiple academic databases and Claude API (key required) to help researchers search, screen, export, and synthesise academic papers.

## Critical Rules

### API Configuration
- **Multi-provider model support** — users can select any of these models in the UI:
  - Claude: `claude-haiku-4-5-20251001`, `claude-sonnet-4-6`, `claude-opus-4-6`
  - OpenAI: `gpt-4o`, `gpt-4o-mini`
  - Gemini: `gemini-2.5-pro-preview-05-06`, `gemini-2.0-flash`
- **Default model tiering** (when user hasn't changed selections):
  - Screening model default: `claude-haiku-4-5-20251001` — criteria generation and per-paper screening
  - Analysis model default: `claude-sonnet-4-6` — synthesis, PRISMA narrative, verification
- **Model selection modes** (toggle in Stage 1):
  - Single mode: one model for all tasks
  - Per-task mode: separate screening model and analysis model
- All model selections stored in `state.screeningModel` and `state.analysisModel`
- `readModelsFromUI()` reads all keys and model selections from the DOM into state — call this at the start of any AI function that may run without going through `searchAll()`
- Claude API calls must include headers:
  ```
  x-api-key: <userApiKey>
  anthropic-version: 2023-06-01
  content-type: application/json
  anthropic-dangerous-direct-browser-access: true
  ```
- OpenAI API endpoint: `https://api.openai.com/v1/chat/completions` — auth via `Authorization: Bearer <key>` header
- Gemini API endpoint: `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent` — auth via `x-goog-api-key` header (NOT query param, to keep key out of browser history)
- Universal wrapper: `callAI(messages, system, model, maxTokens=1024)` routes to correct provider based on `getProvider(modelId)`

### Error Handling
- PubMed API errors: Show user-friendly message, allow retry
- AI API errors: Display error, continue with remaining papers, allow manual override
- XML parsing errors: Handle missing fields gracefully (e.g., "No abstract available")
- Rate limiting: Always add 500ms delay between AI API calls

### Data Handling
- All API keys stored in memory only — NEVER persist to localStorage, sessionStorage, or cookies
- This applies to: Claude key, OpenAI key, Gemini key, NCBI key, OpenAlex key
- Paper data persists in JavaScript memory during session
- `verifyDecision` and `verifyReason` fields on papers persist in session exports (keys excluded)
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
- Server proxy route: `GET /api/semantic-scholar?query=<q>&limit=<n>`
- API key passed as `x-s2-api-key` request header (NOT a query param — avoids server log exposure)
- Proxy forwards to: `https://api.semanticscholar.org/graph/v1/paper/search`
- Fields requested: `title,authors,year,abstract,externalIds,journal,publicationVenue`
- No key required for basic use; optional S2 API key increases rate limits
- **Rate limiting**: unauthenticated tier ~1 req/s from a single IP; all Railway users share one IP
- **Retry logic**: proxy retries up to 3 times with exponential backoff (1 s → 2 s → 4 s) on 429; respects `Retry-After` header if present
- After all retries exhausted, 429 is returned to the client with a user-friendly message
- S2 fetch is wrapped in a per-DB try/catch — a 429 failure does not abort other databases
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
- **Google Fonts CSP**: `style-src` includes `https://fonts.googleapis.com`; `font-src` includes `https://fonts.gstatic.com` — both added intentionally for font loading. If Railway injects CSP as a response header instead of reading the meta tag, these directives must also be added in `server.js` response headers.
- DOI links validated against `/^10\.\d{4,}\/\S+$/` before constructing `https://doi.org/` URLs (open redirect prevention)
- Error messages escaped with `esc()` before DOM insertion (XSS prevention)
- All AI response text (PRISMA check, verification, narrative) inserted via `textContent` or `esc()` — never raw `innerHTML`
- Semantic Scholar proxy: limit clamped server-side to max 100; API key sent as `x-s2-api-key` request header (not query param) so it never appears in server access logs
- Gemini API key sent as `x-goog-api-key` header (not URL query param) for same reason
- CSP `connect-src` includes `https://api.openai.com` and `https://generativelanguage.googleapis.com`

### Deduplication
- Papers from multiple databases are deduplicated in two passes:
  1. By normalized DOI (lowercased, `https://doi.org/` prefix stripped)
  2. By normalized title (lowercased, punctuation stripped, min 10 chars)
- First database to return a paper wins; subsequent duplicates are discarded
- Source badges show original database(s) on each paper row

### Security Patterns

These patterns must be followed to maintain XSS safety. Violations are subtle and hard to spot in review.

**`esc()` only escapes `&`, `<`, `>`, `"`  — it does NOT escape single quotes `'`**
- Safe for `innerHTML` contexts (all four characters needed for HTML injection are escaped)
- Safe for HTML attribute values delimited by double quotes: `attribute="${esc(val)}"`
- **Not safe** in single-quoted attribute contexts: `attribute='${esc(val)}'` — do not use this pattern
- Existing code uses `onclick="fn('${esc(p.pmid)}')"` — this is safe **only because** all database IDs (PubMed numeric, NCT########, OpenAlex URL-style, Europe PMC IDs) never contain single quotes. Do not extend this pattern to fields that could contain arbitrary user text.

**`setStatus(id, html)` uses `innerHTML` — treat it like innerHTML**
- Never pass AI-sourced strings directly: use `esc()` around any dynamic value
- Static spinner/emoji strings are fine
- Pattern to follow: `setStatus('x', `❌ ${esc(e.message)}`)` ✅ | `setStatus('x', aiText)` ❌

**`showModal(title, body, buttons)` — `body` is inserted via `innerHTML`**
- Only use static HTML strings or numeric values (e.g., `state.papers.length`) in body
- Never pass AI response text, user-typed input, or `p.title`/`p.aiReason` as modal body
- For user-visible text that comes from data, use `textContent` on a child element instead

**New AI outputs (PRISMA check, verification, narrative)**
- Always insert via `textContent` (not `innerHTML`) — e.g., `out.textContent = txt`
- Disagreement table cells: use `esc()` before embedding in template literals

### Common Bugs to Avoid

1. **Stale async state on re-run**
   - When an async process (verification, screening) can be stopped and restarted, always clear the previous run's results at the *start* of the new run — not at the end of the old one.
   - Pattern: `state.papers.forEach(p => { p.verifyDecision=''; p.verifyReason=''; });` at the top of `verifyDecisions()` before the loop.
   - Failing to do this leaves partial results from a stopped run mixed with new results.

2. **Navigation during async process wipes in-progress state**
   - `goToStage(3)` clears verification output on entry. Without a guard, navigating away and back while verification is running silently discards progress.
   - Use an `state.verifyActive` flag: set `true` on start, `false` on finish. Guard the clear block: if `state.verifyActive`, show toast and return early.

3. **Removed local variable still referenced at call site**
   - When refactoring a function to use `state.*` fields (removing local `const x = ...`), every call site that passes `x` as an argument must be updated simultaneously. Missing a call site passes `undefined` silently — no error until the feature is exercised.
   - Pattern that caused the ncbiKey bug: `fetchPubMed(q, n, ncbiKey)` after `ncbiKey` local was deleted → now `state.ncbiKey`.

4. **XML Parsing Failures**
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

### Synthesis Export
- `state.rawSynthesis` holds the raw markdown string; `#synth-rendered` holds the HTML-rendered version
- `downloadSynthesis(fmt)` handles `'md'`, `'txt'`, `'html'`, `'doc'` — all reuse the existing `dlFile()` helper
- `printSynthesisPdf()` injects synthesis HTML into a hidden `<iframe>` and calls `iframe.contentWindow.print()` — no library; user saves via browser print dialog
- `synthRenderedHtml()` reads `innerHTML` from `#synth-rendered`; this is safe because `renderMarkdown()` HTML-escapes all content before insertion (no unescaped user/AI strings reach the DOM)
- `synthExportStyles(forWord)` returns appropriate inline CSS for screen (HTML/PDF) or Word (`.doc`) targets
- Word export uses the Word HTML trick: HTML with `xmlns:w` namespace + `application/msword` MIME → `.doc` extension — opens and edits in Word, LibreOffice, Google Docs; no JS library needed
- Plain text export strips markdown syntax (headings, bold/italic, table pipes) via regex before download
- Filename slug is derived from `state.query` (max 40 chars, alphanumeric + hyphens) — never from AI output

### AI API Routing
- `callAI(messages, system, model, maxTokens=1024)` — universal wrapper, routes by provider
- `callClaude(messages, system, model, maxTokens)` — Claude provider
- `callOpenAI(messages, system, model, maxTokens)` — OpenAI provider
- `callGemini(messages, system, model, maxTokens)` — Gemini provider
- `getProvider(modelId)` — returns `'claude'`, `'openai'`, or `'gemini'` from the `MODELS` registry
- For synthesis use `maxTokens=2048`; for PRISMA narrative use `maxTokens=600`; for PRISMA check use `maxTokens=1500`; default elsewhere is `1024`

### PRISMA Flow Check (new)
- `checkPrismaFlow()` — AI reviews the PRISMA statistics for mathematical consistency and methodology soundness
- Uses `state.analysisModel`; output via `textContent` into `#prisma-check-out` (never raw `innerHTML`)
- Checks: number arithmetic, database coverage, deduplication rate, exclusion rates, reason specificity, criteria quality
- Button: "🔍 Check PRISMA Flow" in the PRISMA Narrative card header

### Decision Verification (new)
- `verifyDecisions()` — second AI pass re-screens all papers using `state.analysisModel`
- Stores results in `paper.verifyDecision` and `paper.verifyReason` (neither replaces `aiDecision`)
- `getDisagreements()` — shared helper returning papers where `verifyDecision !== finalDecision(p)`; used by `renderVerifyReport()` and `acceptAllVerify()` — do not inline this filter again
- `renderVerifyReport()` — shows disagreement table (papers where `verifyDecision !== current decision`)
- `acceptVerify(pmid)` — sets `paper.manualDecision = paper.verifyDecision` for one paper
- `acceptAllVerify()` — accepts all verification suggestions at once; re-renders PRISMA and export table
- Output in `#verify-out`; progress bar in `#verify-progress-wrap`
- `state.verifyActive` — set `true` on start of `verifyDecisions()`, `false` on finish; `goToStage(3)` checks this flag and blocks navigation with a toast if verification is still running
- At the start of each `verifyDecisions()` run, all `verifyDecision`/`verifyReason` fields are cleared first to prevent stale partial results from a previous stopped run
- XSS: all table cells use `esc()`, reason text uses `esc()`

### UI Requirements
- `BADGE_LABELS` and `BADGE_CLASSES` — module-level constants (near top of `<script>`) mapping decision keys (`include`, `exclude`, `uncertain`, `skipped`) to display strings and CSS class names; used by `badgeHtml()`, `renderExportTable()`, and `renderVerifyReport()` — do not re-declare inline
- 4 clear stages with step indicator at top
- Database selector in Stage 1 with per-DB status indicators
- Progress bar and counter during screening
- Color-coded decision badges (green/red/yellow/grey)
- Source badges on paper rows showing originating database
- Expandable abstract rows
- Clean, professional light color scheme
- Per-database breakdown in PRISMA flow section

### Search Strategy Builder
- **Opt-in** — user clicks "Build Search Strategy" before running the search
- Calls `readModelsFromUI()` first, then uses `callAI(..., state.screeningModel)` — works with any provider
- Calls the screening model with a single prompt asking for structured JSON containing: `pubmedQuery`, `generalQuery`, `explanation`, `tips`
- JSON is extracted via regex (`/\{[\s\S]*\}/`) to handle model wrapping in code fences
- `explanation` inserted via `textContent` (safe); `tips` escaped with `esc()` before `innerHTML`
- Strategy queries stored in editable textareas (`pubmed-query-field`, `general-query-field`)
- `searchAll()` reads these fields: `pubmedQ = pubmed-query-field.value || rawQuery`; `generalQ = general-query-field.value || rawQuery`
- PubMed uses `pubmedQ`; all other databases use `generalQ`
- "Clear Strategy" resets fields and hides the card; raw query is then used
- Query is user-supplied and embedded in the Claude prompt — all response values are parsed as JSON and escaped before DOM insertion

### PRISMA Transparency
- `renderPrismaFlowchart()` builds a 3-phase visual HTML flowchart (Identification → Screening → Included) from `state.identifiedCount`, `state.dupesRemoved`, `state.dbCounts`, and `computePrisma()`
- `renderPrismaReasons()` renders exclusion reasons with percentage bars
- `assemblePrismaData()` — shared helper that returns `{d, identified, dupes, dbCounts}` from state; called by `renderPrismaFlowchart()`, `generatePrismaNarrative()`, and `checkPrismaFlow()` — do not inline these four lines again
- `state.identifiedCount` = total papers before deduplication (set in `searchAll()`)
- `state.dupesRemoved` = number of duplicates removed (set in `searchAll()`)
- `state.dbCounts` = per-database result counts `{pubmed:n, europepmc:n, ...}` (initialized in state, set in `searchAll()`)
- `generatePrismaNarrative(false)` — template-based, no AI tokens, sets output via `textContent`
- `generatePrismaNarrative(true)` — calls `callAI(..., state.analysisModel, 600)` for a publishable methods paragraph; output via `textContent`
- `checkPrismaFlow()` — AI methodology review; output via `textContent` into `#prisma-check-out`
- PRISMA learn panel is a static educational section (no AI); toggled by `togglePrismaLearn()`
- XSS: all AI-sourced strings (exclusion reasons, narrative, check output) inserted via `textContent` or `esc()` before innerHTML

### Navigation
- **Step indicators** (header) are clickable for any stage the user has already reached (`state.maxStageReached` tracks the highest stage visited)
- Clicking step 1 when papers exist triggers `confirmBackToSearch()` — user chooses keep or clear
- **🔄 New Search** button in header is always visible and calls `confirmRestart()` — clears all papers, criteria, synthesis; preserves API keys; resets `maxStageReached` to 1
- **← Back to Search** button on Stage 2 bottom also calls `confirmBackToSearch()`
- All destructive navigation goes through a confirmation modal (`showModal()`)
- Modal closes on Escape key or backdrop click; `aria-labelledby` and `aria-describedby` for accessibility
- `showModal(title, body, buttons)` — `body` accepts safe HTML strings only; never pass unsanitized user input
