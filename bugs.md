# Bugs & Issues Tracker

This file tracks known bugs, past issues, and lessons learned. Update it whenever a new bug is found or fixed.

---

## Security Issues

### [FIXED] XSS via `esc()` single-quote bypass
- **Symptom**: `esc()` escapes `&`, `<`, `>`, `"` but NOT `'`. Using `attribute='${esc(val)}'` in single-quoted HTML attributes is unsafe.
- **Affected pattern**: Any code using single-quoted attribute values with `esc()`.
- **Fix**: Only use double-quoted attribute values: `attribute="${esc(val)}"`. The existing `onclick="fn('${esc(p.pmid)}')"` pattern is safe *only* because database IDs never contain single quotes — do not extend it to arbitrary user fields.

### [FIXED] XSS via `setStatus()` with unsanitized input
- **Symptom**: `setStatus(id, html)` uses `innerHTML` internally. Passing AI-sourced or user-sourced strings directly allows XSS.
- **Fix**: Always wrap dynamic values: `setStatus('x', \`❌ ${esc(e.message)}\`)`. Static strings (spinners, emojis) are safe.

### [FIXED] XSS via `showModal()` body with data fields
- **Symptom**: `showModal(title, body, buttons)` inserts `body` via `innerHTML`. Passing `p.title`, `p.aiReason`, or any AI/user text as modal body allows XSS.
- **Fix**: Only use static HTML or numeric values in `body`. For data-derived text, set `textContent` on a child element after modal creation.

### [FIXED] AI output inserted via innerHTML
- **Symptom**: PRISMA check, verification results, and narrative text inserted via `innerHTML` enables XSS if AI returns malicious content.
- **Fix**: All AI output inserted via `textContent`. Disagreement table cells use `esc()` in template literals.

### [FIXED] Gemini / OpenAI API key in URL query params (browser history exposure)
- **Symptom**: Passing API keys as query params (e.g., `?api_key=...`) logs them in browser history and server access logs.
- **Fix**: Gemini key sent as `x-goog-api-key` header; S2 key sent as `x-s2-api-key` header; OpenAI key sent as `Authorization: Bearer` header.

### [FIXED] Open redirect via unsanitized DOI links
- **Symptom**: Constructing `https://doi.org/<userValue>` without validation allows redirect to arbitrary URLs.
- **Fix**: DOI values validated against `/^10\.\d{4,}\/\S+$/` before use.

### [FIXED] SSRF via client-controlled Semantic Scholar proxy URL
- **Symptom**: If `server.js` forwarded any client-supplied URL, a malicious client could proxy requests to internal services.
- **Fix**: Hostname hardcoded in `server.js`; never taken from client input.

---

## Async / State Bugs

### [FIXED] Stale async state on re-run (verification/screening)
- **Symptom**: Stopping a verification/screening run and restarting left partial results from the old run mixed with new results.
- **Root cause**: Results were cleared at the *end* of the old run, not at the *start* of the new one.
- **Fix**: Clear `verifyDecision`/`verifyReason` (and equivalent fields) at the very top of `verifyDecisions()` before the loop begins.

### [FIXED] Navigation during async process wipes in-progress state
- **Symptom**: Navigating to Stage 3 while verification was running called `goToStage(3)`, which cleared `#verify-out`, silently discarding progress.
- **Fix**: `state.verifyActive` flag — set `true` on start, `false` on finish. `goToStage(3)` checks flag and shows a toast + returns early if still running.

### [FIXED] `goToStage()` verification guard fires after DOM changes
- **Symptom**: The `state.verifyActive` check was placed *after* the stage classes were already applied and `state.currentStage` updated. If the guard triggered (verification running), it returned early — leaving the UI visually on Stage 3 but with stale content, since `renderPrisma()` and `renderExportTable()` were never called.
- **Root cause**: Guard placed in the middle of the function, after DOM mutations.
- **Fix**: Move the `verifyActive` check to the very top of `goToStage()`, before any DOM changes.

### [FIXED] Removed local variable still referenced at call site (`ncbiKey` bug)
- **Symptom**: Refactored `fetchPubMed()` to use `state.ncbiKey`, deleting the local `const ncbiKey`. Call site still passed the now-undefined local → silent `undefined` passed to function.
- **Fix**: When removing a local variable and migrating to `state.*`, update every call site simultaneously. Pattern: was `fetchPubMed(q, n, ncbiKey)` → now `fetchPubMed(q, n, state.ncbiKey)` (or remove param entirely).

---

## Parsing Bugs

### [KNOWN RISK] PubMed XML empty `<AbstractText>` tags
- **Symptom**: Some PubMed records have empty or multi-section `<AbstractText>` elements, causing abstract to be blank or malformed.
- **Fix**: Use `element?.textContent || "No abstract available"` and join multiple `AbstractText` sections.

### [KNOWN RISK] Missing or inconsistently formatted author fields
- **Symptom**: Some records from any database omit author fields or format them differently.
- **Fix**: Defensive checks throughout — always fall back to `"N/A"` or empty string.

### [FIXED] OpenAlex abstract reconstruction
- **Symptom**: `abstract_inverted_index` is a `{word: [positions]}` map, not a plain string. Reading it directly yields `[object Object]`.
- **Fix**: `reconstructOAAbstract()` builds a position-indexed array, fills words, joins with spaces. Returns `""` if field is null.

---

## UI / UX Bugs

### [FIXED] Semantic Scholar unavailable in `file://` context
- **Symptom**: S2 requires the server proxy (`/api/semantic-scholar`). When app opened as a local file, fetch fails with a network error.
- **Fix**: Detect `window.location.protocol === 'file:'` on load; disable S2 checkbox and show a clear warning.

### [FIXED] `BADGE_LABELS` / `BADGE_CLASSES` re-declared inline
- **Symptom**: Decision badge logic was inlined in multiple functions, causing inconsistency when decision keys changed.
- **Fix**: Module-level constants `BADGE_LABELS` and `BADGE_CLASSES` near top of `<script>`; all badge rendering goes through `badgeHtml()`.

### [FIXED] `getDisagreements()` logic inlined in multiple places
- **Symptom**: The filter `verifyDecision !== finalDecision(p)` was duplicated in `renderVerifyReport()` and `acceptAllVerify()`, risking drift.
- **Fix**: Extracted to shared `getDisagreements()` helper; both call sites use it.

### [FIXED] `assemblePrismaData()` logic inlined in multiple places
- **Symptom**: The four lines reading PRISMA state were duplicated across `renderPrismaFlowchart()`, `generatePrismaNarrative()`, and `checkPrismaFlow()`.
- **Fix**: Extracted to `assemblePrismaData()` helper; all three call sites use it.

---

## Deployment / Configuration

### [KNOWN RISK] Railway CSP header vs. meta tag conflict
- **Symptom**: If Railway injects a `Content-Security-Policy` response header, it overrides the `<meta http-equiv="Content-Security-Policy">` tag in `index.html`. Google Fonts would break (`style-src` / `font-src` directives missing).
- **Fix**: If this occurs, add the CSP directives to `server.js` response headers to match the meta tag.

### [FIXED] Server startup without required env vars
- **Symptom**: App could start without `AUTH_USER` / `AUTH_PASS`, exposing the app without auth.
- **Fix**: `server.js` exits immediately on startup if either env var is missing.

### [FIXED] Semantic Scholar rate limiting on Railway shared IP
- **Symptom**: All Railway-deployed users share one IP → unauthenticated S2 tier hits 429 quickly.
- **Fix**: Server proxy retries up to 3× with exponential backoff (1 s → 2 s → 4 s), respects `Retry-After`. S2 errors are wrapped in a per-DB try/catch so a 429 doesn't abort other databases.

---

## API / Data Bugs

### [FIXED] CSV export — commas and quotes in fields
- **Symptom**: Fields containing commas or double-quotes broke CSV column alignment.
- **Fix**: Wrap all fields in double-quotes; escape internal double-quotes by doubling them (`""`).

### [FIXED] Papers without abstracts included in AI screening
- **Symptom**: Sending "No abstract available" to the AI wasted tokens and produced unreliable decisions.
- **Fix**: Papers without abstracts are auto-marked "skipped" and excluded from AI screening. They still appear in exports with a note.

### [FIXED] `readModelsFromUI()` not called before standalone AI functions
- **Symptom**: Functions that could be triggered independently (e.g., after page reload) used stale/default model values because `readModelsFromUI()` was only called inside `searchAll()`.
- **Fix**: Call `readModelsFromUI()` at the start of any AI function that may run without first going through `searchAll()`.

### [FIXED] OpenAlex DOI stored with `https://doi.org/` prefix
- **Symptom**: Deduplication by DOI failed when one source stored the raw DOI and another stored the full URL.
- **Fix**: Strip `https://doi.org/` prefix when storing DOI from OpenAlex; normalize on ingest.
