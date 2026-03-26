'use strict';
const express   = require('express');
const basicAuth = require('express-basic-auth');
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

// ── Semantic Scholar proxy ────────────────────────────────────────
// Semantic Scholar blocks direct browser calls (CORS). This route
// forwards the request server-side and returns the JSON response.
app.get('/api/semantic-scholar', (req, res) => {
  const query  = req.query.query;
  const limit  = Math.min(parseInt(req.query.limit) || 100, 100);
  const apiKey = req.query.apiKey || process.env.SEMANTIC_SCHOLAR_KEY || '';

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

  const proxyReq = https.request(options, (proxyRes) => {
    // Only allow JSON success responses through
    if (proxyRes.statusCode !== 200) {
      res.status(proxyRes.statusCode).json({ error: `Semantic Scholar returned ${proxyRes.statusCode}` });
      proxyRes.resume();
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('S2 proxy error:', err.message);
    res.status(502).json({ error: 'Semantic Scholar proxy error' });
  });

  proxyReq.setTimeout(15000, () => {
    proxyReq.destroy();
    res.status(504).json({ error: 'Semantic Scholar request timed out' });
  });

  proxyReq.end();
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
