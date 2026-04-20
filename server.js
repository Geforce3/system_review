'use strict';
const express   = require('express');
const basicAuth = require('express-basic-auth');
const rateLimit = require('express-rate-limit');
const https     = require('https');
const path      = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Credentials must be set as Railway env vars ──────────────────
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;

if (!AUTH_USER || !AUTH_PASS) {
  console.error('ERROR: AUTH_USER and AUTH_PASS environment variables must be set.');
  process.exit(1);
}

// ── Basic Auth middleware ─────────────────────────────────────────
app.use(basicAuth({
  users: { [AUTH_USER]: AUTH_PASS },
  challenge: true,
  realm: 'Systematic Review Assistant'
}));

// ── Rate limiter: max 10 S2 proxy calls per IP per minute ────────
const s2Limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait before searching again.' }
});

// ── Semantic Scholar proxy ────────────────────────────────────────
// Semantic Scholar blocks direct browser calls (CORS). This route
// forwards the request server-side and returns the JSON response.
// API key is read from the x-s2-api-key request header (not a query
// param) so it is never written to server access logs.

function s2Request(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

app.get('/api/semantic-scholar', s2Limiter, async (req, res) => {
  const query  = req.query.query;
  const limit  = Math.min(parseInt(req.query.limit) || 100, 100);
  // API key comes from a request header, not a query param, to avoid log exposure
  const apiKey = req.headers['x-s2-api-key'] || process.env.SEMANTIC_SCHOLAR_KEY || '';

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query parameter required' });
  }

  const fields = 'title,authors,year,abstract,externalIds,journal,publicationVenue';
  const params = new URLSearchParams({ query, limit: String(limit), fields });
  const options = {
    hostname: 'api.semanticscholar.org',
    path: `/graph/v1/paper/search?${params}`,
    method: 'GET',
    headers: {
      'User-Agent': 'SLR-Assistant/1.0',
      ...(apiKey ? { 'x-api-key': apiKey } : {})
    }
  };

  // Retry up to 3 times with exponential backoff on 429 (rate limit)
  const retryDelays = [1000, 2000, 4000];
  let result;
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      result = await s2Request(options);
    } catch (err) {
      if (err.message === 'timeout') {
        return res.status(504).json({ error: 'Semantic Scholar request timed out' });
      }
      console.error('S2 proxy error:', err.message);
      return res.status(502).json({ error: 'Semantic Scholar proxy error' });
    }

    if (result.statusCode === 429 && attempt < retryDelays.length) {
      const retryAfterMs = (parseInt(result.headers['retry-after']) || retryDelays[attempt] / 1000) * 1000;
      await new Promise(r => setTimeout(r, retryAfterMs));
      continue;
    }
    break;
  }

  if (result.statusCode !== 200) {
    return res.status(result.statusCode).json({ error: `Semantic Scholar returned ${result.statusCode}` });
  }

  res.setHeader('Content-Type', 'application/json');
  res.send(result.body);
});

// ── Serve only index.html — no other files exposed ───────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Block all other paths
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Systematic Review Assistant running on port ${PORT}`);
});
