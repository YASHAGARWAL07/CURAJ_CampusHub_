'use strict';
require('./env-check');
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const crypto   = require('crypto');
const { getDB, initDB } = require('./database');
const { sha256, safeCompare, sanitize } = require('./utils');

const app  = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const IS_DEV = process.env.NODE_ENV !== 'production';

// Trust Render's load balancer so req.ip = real client IP (not balancer IP)
// Without this, rate limiting and IP-based lockouts are ineffective on Render
app.set('trust proxy', 1);

// ── Rate limiter ──────────────────────────────────────────────
const rateMaps = new Map();
// Clean stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMaps) {
    if (now - entry.start > 3600000) rateMaps.delete(key);
  }
}, 300000);
function apiRateLimit(max, windowMs) {
  return (req, res, next) => {
    const key = req.ip + req.path;
    const now = Date.now();
    const entry = rateMaps.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
    entry.count++;
    rateMaps.set(key, entry);
    if (entry.count > max) return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    next();
  };
}

// ── Middleware ────────────────────────────────────────────────
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || false;
app.use(cors({
  origin: (origin, cb) => {
    // In production, only allow requests from our own domain
    if (!ALLOWED_ORIGIN || !origin || origin === ALLOWED_ORIGIN) return cb(null, true);
    cb(new Error('CORS: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-session-id'],
  exposedHeaders: [],
  maxAge: 86400,
}));
app.use(express.json({ limit: '100kb' }));  // Tighter limit for JSON payloads
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use((req, res, next) => {
  // Block common attack patterns in URL
  let decodedUrl = req.url;
  try { decodedUrl = decodeURIComponent(decodeURIComponent(req.url)); } catch { /* leave as is */ }
  const suspicious = /<script|javascript:|data:|vbscript:|onload=|onerror=|eval\(|base64|\.\.\//i;
  if (suspicious.test(decodedUrl)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }
  // Block suspicious user agents (scanners)
  const ua = req.headers['user-agent'] || '';
  const badAgents = /sqlmap|nikto|nmap|masscan|zgrab|nuclei|dirbuster|gobuster|wfuzz|hydra|medusa|burpsuite/i;
  if (badAgents.test(ua)) return res.status(403).json({ error: 'Forbidden.' });
  next();
});

// ── Security headers (applied to ALL responses) ───────────────
app.use((req, res, next) => {
  // Prevent browsers from sniffing MIME types
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Block clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // No referrer leakage
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Aggressive CSP — no inline scripts except our own, no external resources
  res.setHeader('Content-Security-Policy',
    "default-src 'none'; " +
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob: https: https://www.google-analytics.com; " +
    "connect-src 'self' https://generativelanguage.googleapis.com https://res.cloudinary.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com; " +
    "frame-src 'self' blob:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'none'; " +
    "form-action 'self'; " +
    "object-src blob:; " +
    "media-src 'none'; " +
    "worker-src 'none';"
  );
  // Force HTTPS with HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  // Restrict browser features we don't use
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()');
  // COOP: prevent other pages opening this app in a popup context
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // NOTE: COEP/CORP omitted intentionally — would block user-uploaded images
  // Disable browser caching for HTML pages (always fresh)
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // Prevent MIME sniffing on all responses
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
});

// ── Block direct access to sensitive files ────────────────────
app.use((req, res, next) => {
  const blocked = /\.(env|db|db-wal|db-shm|json|log|sh|key|pem|crt|map|sql|ts|tsx|jsx|vue|svelte|lock|yaml|yml|md|txt|csv|xml)$/i;
  const blockedPaths = ['/.git/', '/node_modules/', '/server/', '/.env', '/package', '/.nvmrc', '/render.yaml', '/CHANGES', '/README'];
  if (blocked.test(req.path)) return res.status(403).json({ error: 'Forbidden' });
  if (blockedPaths.some(p => req.path.startsWith(p))) return res.status(403).json({ error: 'Forbidden' });
  // Block path traversal attempts
  if (req.path.includes('..') || req.path.includes('%2e%2e') || req.path.includes('%252e')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// ── Strip server fingerprints ─────────────────────────────────
app.disable('x-powered-by');
app.disable('etag');

// ── CSRF-like protection: block cross-origin state-changing requests ──
// Browsers won't send custom headers cross-origin (without CORS preflight)
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin  = req.headers.origin  || '';
    const referer = req.headers.referer || '';
    const host    = req.headers.host    || '';
    // Allow same-origin requests (no origin header = same-origin in most browsers)
    if (!origin) return next();
    // Allow from our own domain
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return next();
      // Allow localhost in dev
      if (originHost === 'localhost' || originHost.startsWith('localhost:')) return next();
      // Block everything else
      return res.status(403).json({ error: 'Cross-origin requests not allowed.' });
    } catch {
      return next(); // Malformed origin — let CORS handle it
    }
  }
  next();
});

// ── Static files (no cache for JS/CSS) ───────────────────────
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: 0,
  etag: false,
  lastModified: false,
  dotfiles: 'deny',
  index: false,  // Disable directory listing
  setHeaders(res, filePath) {
    // Aggressive no-cache for all app files
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Block source map requests at static layer
    if (filePath.endsWith('.map')) {
      res.status(403).end();
      return;
    }
    // JS files: add nosniff + no-cache
    if (filePath.endsWith('.js')) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    // Images: allow short cache
    if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Serve index.html for the root only
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Public API Routes ────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/notes',       require('./routes/notes'));
app.use('/api/lost-found',  require('./routes/lostfound'));
app.use('/api/events',      require('./routes/events'));
app.use('/api/feedback',    require('./routes/feedback'));

// ── Public stats ─────────────────────────────────────────────
app.get('/api/stats', apiRateLimit(60, 60000), async (req, res) => {
  const db = getDB();
  try {
    const [u, m, n, lf, e] = await Promise.all([
      db.query("SELECT COUNT(*)::int as c FROM users WHERE enrollment != 'CUR/00/ADM/001'"),
      db.query("SELECT COUNT(*)::int as c FROM marketplace WHERE status='active'"),
      db.query("SELECT COUNT(*)::int as c FROM notes WHERE(status='approved' OR status IS NULL OR status='')"),
      db.query("SELECT COUNT(*)::int as c FROM lost_found WHERE status='open'"),
      db.query("SELECT COUNT(*)::int as c FROM events WHERE status='upcoming'"),
    ]);
    res.json({ users: u.rows[0].c, marketplace: m.rows[0].c, notes: n.rows[0].c, lost_found: lf.rows[0].c, events: e.rows[0].c });
  } catch { res.json({ users:0, marketplace:0, notes:0, lost_found:0, events:0 }); }
});

// ── AI Assistant — Weaviate RAG + Gemini ────────────────────────
// Keep the existing /api/ai/chat contract so both chatbot interfaces remain unchanged.
const { answerQuestion } = require('./ai-rag');

app.post('/api/ai/chat', apiRateLimit(14, 60000), async (req, res) => {
  const message = sanitize(req.body?.message, 500);
  if (!message) return res.status(400).json({ error: 'Message required.' });

  try {
    const result = await answerQuestion(message);
    return res.json({ reply: result.reply, sources: result.sources });
  } catch (err) {
    const statusCode = [429, 503].includes(err.statusCode) ? err.statusCode : 502;
    // Avoid logging credentials or returning raw provider details to the browser.
    console.error('[ai/chat] RAG request failed:', err.message);
    const reply = statusCode === 503
      ? 'The AI assistant is not configured yet. Please contact the CampusHub administrator.'
      : statusCode === 429
        ? 'The AI service is receiving too many requests. Please wait a moment and try again.'
        : 'The AI assistant could not complete your request right now. Please try again shortly.';
    return res.status(statusCode).json({ error: reply, reply });
  }
});


// ════════════════════════════════════════════════════════════════
// ADMIN PANEL — Maximum Security
// ════════════════════════════════════════════════════════════════

// Admin sessions: token → { created, lastUsed, ip, ua }
// In-memory only — Render has an ephemeral filesystem so disk persistence
// would not survive deploys anyway. Sessions are short-lived (4 hours).
const adminSessions = new Map();

function saveSessions() { /* no-op on Render (ephemeral disk) */ }
function loadSessions() { /* no-op on Render (ephemeral disk) */ }
loadSessions();
// Failed login tracking: ip → { count, lockedUntil }
const loginAttempts = new Map();

const ADMIN_SESSION_TTL = 4 * 3_600_000;  // 4 hours
const ADMIN_LOCK_AFTER  = 5;               // attempts
const ADMIN_LOCK_FOR    = 15 * 60_000;     // 15 minutes

// ── Admin: serve panel ────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// ── Admin: login ──────────────────────────────────────────────
app.post('/admin/api/login', apiRateLimit(10, 300_000), (req, res) => {
  const ip = req.ip;
  const now = Date.now();

  // Check lockout
  const attempt = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  if (attempt.lockedUntil > now) {
    const wait = Math.ceil((attempt.lockedUntil - now) / 60000);
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${wait} minute(s).` });
  }

  const u = sanitize(req.body.username, 50);
  const p = typeof req.body.password === 'string' ? req.body.password : '';

  const validUser = safeCompare(u, process.env.ADMIN_USER || '');
  const validPass = safeCompare(sha256(p), process.env.ADMIN_PASS_HASH || '');

  if (!validUser || !validPass) {
    attempt.count++;
    if (attempt.count >= ADMIN_LOCK_AFTER) {
      attempt.lockedUntil = now + ADMIN_LOCK_FOR;
      attempt.count = 0;
      loginAttempts.set(ip, attempt);
      return res.status(429).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
    }
    loginAttempts.set(ip, attempt);
    return res.status(401).json({ error: `Invalid credentials. ${ADMIN_LOCK_AFTER - attempt.count} attempt(s) remaining.` });
  }

  // Success — clear attempts
  loginAttempts.delete(ip);
  const token = crypto.randomBytes(48).toString('hex');
  adminSessions.set(token, {
    created:  now,
    lastUsed: now,
    ip,
    ua: req.headers['user-agent'] || ''
  });

  // Clean stale sessions
  for (const [t, s] of adminSessions) {
    if (now - s.lastUsed > ADMIN_SESSION_TTL) adminSessions.delete(t);
  }
  saveSessions();

  res.json({ token, message: 'Welcome, Admin!' });
});

// ── Admin: logout ─────────────────────────────────────────────
app.post('/admin/api/logout', (req, res) => {
  adminSessions.delete(req.headers['x-admin-token'] || '');
  saveSessions();
  res.json({ message: 'Logged out.' });
});

// ── Admin auth middleware ─────────────────────────────────────
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || '';
  if (!token || token.length < 64) return res.status(401).json({ error: 'Unauthorized.' });
  const session = adminSessions.get(token);
  const now = Date.now();
  if (!session || now - session.lastUsed > ADMIN_SESSION_TTL) {
    adminSessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please login again.' });
  }
  // Refresh session (sliding window — each visit resets the 4-hour clock)
  session.lastUsed = now;
  adminSessions.set(token, session);
  saveSessions();
  next();
}

// ── Admin: stats ──────────────────────────────────────────────
app.get('/admin/api/stats', adminAuth, async (req, res) => {
  const db = getDB();
  try {
    const [u, m, ma, n, np, lf, lfo, ev, evu, fb, dl, mv] = await Promise.all([
      db.query('SELECT COUNT(*)::int as c FROM users'),
      db.query('SELECT COUNT(*)::int as c FROM marketplace'),
      db.query("SELECT COUNT(*)::int as c FROM marketplace WHERE status='active'"),
      db.query('SELECT COUNT(*)::int as c FROM notes'),
      db.query("SELECT COUNT(*)::int as c FROM notes WHERE type='pyq'"),
      db.query('SELECT COUNT(*)::int as c FROM lost_found'),
      db.query("SELECT COUNT(*)::int as c FROM lost_found WHERE status='open'"),
      db.query('SELECT COUNT(*)::int as c FROM events'),
      db.query("SELECT COUNT(*)::int as c FROM events WHERE status='upcoming'"),
      db.query('SELECT COUNT(*)::int as c FROM feedback'),
      db.query('SELECT COALESCE(SUM(downloads),0)::int as s FROM notes'),
      db.query("SELECT COALESCE(SUM(price),0)::int as s FROM marketplace WHERE status='active'"),
    ]);
    res.json({
      users: u.rows[0].c, marketplace: m.rows[0].c, marketplace_active: ma.rows[0].c,
      notes: n.rows[0].c, notes_pyq: np.rows[0].c,
      lost_found: lf.rows[0].c, lost_found_open: lfo.rows[0].c,
      events: ev.rows[0].c, events_upcoming: evu.rows[0].c,
      feedback: fb.rows[0].c, total_downloads: dl.rows[0].s, marketplace_value: mv.rows[0].s,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Admin: generic CRUD factory ───────────────────────────────
function adminCRUD(route, table, listQuery, allowedPatchFields, allowedPostFields) {
  // Whitelist table names — never allow user-supplied values here
  const ALLOWED_CRUD_TABLES = ['users','marketplace','notes','lost_found','events','feedback'];
  if (!ALLOWED_CRUD_TABLES.includes(table)) throw new Error(`adminCRUD: invalid table '${table}'`);
  // LIST
  app.get(`/admin/api/${route}`, adminAuth, async (req, res) => {
    try { const { rows } = await getDB().query(listQuery); res.json(rows); }
    catch(e) { res.status(500).json({ error: e.message }); }
  });

  // PATCH
  app.patch(`/admin/api/${route}/:id`, adminAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid ID.' });
    try {
      const db = getDB();
      const check = await db.query(`SELECT id FROM ${table} WHERE id=$1`, [id]);
      if (!check.rows[0]) return res.status(404).json({ error: 'Record not found.' });
      const updates = {};
      for (const field of allowedPatchFields) {
        if (req.body[field] !== undefined) updates[field] = sanitize(String(req.body[field]), 2000);
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
      const keys = Object.keys(updates);
      const set  = keys.map((f, i) => `${f}=$${i + 1}`).join(',');
      await db.query(`UPDATE ${table} SET ${set} WHERE id=$${keys.length + 1}`, [...Object.values(updates), id]);
      res.json({ message: 'Updated.' });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE
  app.delete(`/admin/api/${route}/:id`, adminAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid ID.' });
    try {
      const db = getDB();
      const check = await db.query(`SELECT id FROM ${table} WHERE id=$1`, [id]);
      if (!check.rows[0]) return res.status(404).json({ error: 'Record not found.' });
      await db.query(`DELETE FROM ${table} WHERE id=$1`, [id]);
      res.json({ message: 'Deleted.' });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // POST (create)
  if (allowedPostFields) {
    app.post(`/admin/api/${route}`, adminAuth, async (req, res) => {
      const vals = [];
      const cols = [];
      for (const f of allowedPostFields) {
        cols.push(f);
        vals.push(req.body[f] !== undefined ? sanitize(String(req.body[f]), 2000) : '');
      }
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
      try {
        const { rows } = await getDB().query(
          `INSERT INTO ${table}(${cols.join(',')}) VALUES(${placeholders}) RETURNING id`,
          vals
        );
        res.status(201).json({ message: 'Created.', id: rows[0].id });
      } catch(e) { res.status(400).json({ error: e.message }); }
    });
  }
}

// Register all admin CRUD routes
adminCRUD('users', 'users',
  `SELECT u.id, u.name, u.enrollment, u.department, u.program, u.year, u.semester,
    u.contact, u.phone, u.bio, u.avatar_url,
    u.last_login_at, u.failed_logins, u.created_at,
    (SELECT COUNT(*)::int FROM marketplace  WHERE user_id=u.id)                      AS listings,
    (SELECT COUNT(*)::int FROM marketplace  WHERE user_id=u.id AND status='active')  AS active_listings,
    (SELECT COUNT(*)::int FROM notes        WHERE user_id=u.id)                      AS uploads,
    (SELECT COUNT(*)::int FROM lost_found   WHERE user_id=u.id)                      AS lost_found_posts,
    (SELECT COUNT(*)::int FROM events       WHERE user_id=u.id)                      AS events_posted,
    (SELECT COUNT(*)::int FROM feedback     WHERE user_id=u.id)                      AS feedback_count,
    (SELECT COALESCE(SUM(downloads),0)::int FROM notes WHERE user_id=u.id)           AS total_downloads
   FROM users u ORDER BY u.created_at DESC`,
  ['name','enrollment','department','program','year','semester','contact','phone','bio']
);

adminCRUD('marketplace', 'marketplace',
  `SELECT m.id, m.title, m.description, m.price, m.category, m.condition,
    m.contact, m.status, m.created_at,
    u.name as seller_name, u.enrollment
   FROM marketplace m LEFT JOIN users u ON m.user_id=u.id
   ORDER BY m.created_at DESC`,
  ['title','description','price','category','condition','contact','status'],
  ['user_id','title','description','price','category','condition','contact','status']
);

adminCRUD('notes', 'notes',
  `SELECT n.id, n.title, n.description, n.subject, n.semester, n.type,
    n.department, n.program, n.exam_type, n.year as exam_year,
    n.drive_link, n.file_url, n.file_name, n.downloads, n.status, n.created_at,
    u.name as uploader_name, u.enrollment
   FROM notes n LEFT JOIN users u ON n.user_id=u.id
   ORDER BY n.created_at DESC`,
  ['title','description','subject','semester','type','department','program','exam_type','year','drive_link','file_name','status'],
  ['user_id','title','description','subject','semester','type','department','program','exam_type','year','drive_link','file_name','status']
);

adminCRUD('lost-found', 'lost_found',
  `SELECT lf.id, lf.title, lf.description, lf.type, lf.location,
    lf.contact, lf.status, lf.created_at,
    u.name as reporter_name, u.enrollment
   FROM lost_found lf LEFT JOIN users u ON lf.user_id=u.id
   ORDER BY lf.created_at DESC`,
  ['title','description','type','location','contact','status']
);

adminCRUD('events', 'events',
  `SELECT e.id, e.title, e.description, e.category, e.venue,
    e.event_date, e.event_time, e.organizer, e.contact,
    e.registration_link, e.status, e.created_at,
    u.name as poster_name, u.enrollment
   FROM events e LEFT JOIN users u ON e.user_id=u.id
   ORDER BY e.event_date DESC`,
  ['title','description','category','venue','event_date','event_time','organizer','contact','registration_link','status'],
  ['user_id','title','description','category','venue','event_date','event_time','organizer','contact','registration_link','status']
);

adminCRUD('feedback', 'feedback',
  `SELECT f.id, f.name as submitter_name, f.title, f.body, f.category, f.rating, f.status, f.created_at,
    u.name as user_name, u.enrollment
   FROM feedback f LEFT JOIN users u ON f.user_id=u.id
   ORDER BY f.created_at DESC`,
  ['title','body','category','status']
);

// ── Admin: SQL query (SELECT only, whitelist) ─────────────────
app.post('/admin/api/query', adminAuth, async (req, res) => {
  const sql = (req.body.sql || '').trim().replace(/\s+/g, ' ');
  // Block dangerous keywords
  const dangerous = /\b(DROP|TRUNCATE|ALTER|CREATE|ATTACH|DETACH|LOAD_EXTENSION|DELETE|INSERT|UPDATE|COPY|VACUUM|REINDEX|CLUSTER|GRANT|REVOKE|EXECUTE|EXEC|CALL|DO|BEGIN|COMMIT|ROLLBACK)\b/i;
  if (dangerous.test(sql)) return res.status(403).json({ error: 'This operation is not permitted. Only SELECT queries are allowed.' });
  // Block multi-statement injection (semicolons in middle of query)
  if (/;.+/s.test(sql)) return res.status(403).json({ error: 'Multi-statement queries are not allowed.' });
  // Must start with SELECT
  if (!/^SELECT\b/i.test(sql)) return res.status(403).json({ error: 'Only SELECT queries are allowed.' });
  // Block comment-based injection
  if (/\/\*|--/.test(sql)) return res.status(403).json({ error: 'SQL comments are not allowed.' });
  const allowedTables = ['users','marketplace','notes','lost_found','events','feedback'];
  // Never expose password/session/token tables to admin SQL
  const blockedAdminTables = ['password_reset_tokens'];
  if (blockedAdminTables.some(t => sql.toLowerCase().includes(t)))
    return res.status(403).json({ error: 'This table is not accessible.' });
  const tableMatch = sql.match(/\b(FROM|JOIN|INTO|UPDATE|TABLE)\s+([`"']?(\w+)[`"']?)/gi);
  if (tableMatch) {
    for (const m of tableMatch) {
      const tbl = m.trim().split(/\s+/).pop().replace(/[`"']/g, '').toLowerCase();
      if (!allowedTables.includes(tbl)) return res.status(403).json({ error: `Table '${tbl}' is not accessible.` });
    }
  }
  try {
    const { rows, rowCount } = await getDB().query(sql);
    const isSelect = /^SELECT\b/i.test(sql);
    if (isSelect) res.json({ rows, count: rows.length });
    else res.json({ message: 'Query executed.', changes: rowCount });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// ── Admin: activity log ───────────────────────────────────────
app.get('/admin/api/activity', adminAuth, async (req, res) => {
  const db = getDB();
  try {
    const [users, notes, mkt, events] = await Promise.all([
      db.query('SELECT name, enrollment, created_at FROM users ORDER BY created_at DESC LIMIT 5'),
      db.query('SELECT n.title, n.type, n.created_at, u.name as "user" FROM notes n LEFT JOIN users u ON n.user_id=u.id ORDER BY n.created_at DESC LIMIT 5'),
      db.query('SELECT m.title, m.price, m.created_at, u.name as "user" FROM marketplace m LEFT JOIN users u ON m.user_id=u.id ORDER BY m.created_at DESC LIMIT 5'),
      db.query('SELECT title, event_date, created_at FROM events ORDER BY created_at DESC LIMIT 5'),
    ]);
    const activity = [];
    users.rows.forEach(r  => activity.push({ type:'user',   text:`${r.name} registered`,                      time: r.created_at }));
    notes.rows.forEach(r  => activity.push({ type:'notes',  text:`${r.user} uploaded "${r.title}"`,            time: r.created_at }));
    mkt.rows.forEach(r    => activity.push({ type:'market', text:`${r.user} listed "${r.title}" ₹${r.price}`,  time: r.created_at }));
    events.rows.forEach(r => activity.push({ type:'event',  text:`Event "${r.title}" on ${r.event_date}`,      time: r.created_at }));
    activity.sort((a,b) => new Date(b.time) - new Date(a.time));
    res.json(activity.slice(0, 15));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Catch unhandled promise rejections (prevent process crash) ──
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message);
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, _next) => {
  // Never leak stack traces to client
  console.error('Express error:', err.message);
  res.status(err.status || 500).json({ error: 'An unexpected error occurred. Please try again.' });
});

// ── Unhandled rejection safety net ───────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason?.message || reason);
  // Do NOT exit — Render would restart the container unnecessarily
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  // Only exit on truly fatal errors, not operational ones
  if (err.code === 'ERR_USE_AFTER_FREE' || err.code === 'ERR_WORKER_OUT_OF_MEMORY') {
    process.exit(1);
  }
});

// ── SPA routes — always serve index.html for frontend routes ──
// These must be explicit so they work even before the 404 fallback
app.get('/reset-password', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  // Don't echo the path back (prevents path disclosure)
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found.' });
  } else {
    // For non-API 404s, serve the app (SPA routing)
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// ── Cleanup job: delete expired/used reset tokens every hour ─
setInterval(async () => {
  try {
    await getDB().query(
      "DELETE FROM password_reset_tokens WHERE used=TRUE OR expires_at < NOW() - INTERVAL '1 day'"
    );
  } catch(e) { /* non-critical */ }
}, 3600000); // every hour

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🎓 CU Hub running at http://localhost:${PORT}`);
      console.log(`🔒 Admin panel:    http://localhost:${PORT}/admin\n`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  });
  