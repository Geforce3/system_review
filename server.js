'use strict';
const express   = require('express');
const basicAuth = require('express-basic-auth');
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
  realm: 'NUS Libraries SLR Assistant'
}));

// ── Serve only index.html — no other files exposed ───────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Block all other paths
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`SLR Assistant running on port ${PORT}`);
});
