'use strict';
const multer  = require('multer');
const path    = require('path');
const { getDB } = require('./database');

// ── File Upload (multer) ──────────────────────────────────
// Files are stored in memory (buffer) and then uploaded to
// Cloudinary by each controller — nothing is written to disk.

const MAX_IMAGE_MB    = 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

const MAX_DOC_MB      = 25;
const MAX_DOC_BYTES   = MAX_DOC_MB * 1024 * 1024;

// Back-compat alias used in error messages
const MAX_FILE_MB = MAX_DOC_MB;

// Allowed MIME types with magic byte signatures
const ALLOWED_SIGNATURES = {
  'image/jpeg':       [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png':        [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/gif':        [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  'image/webp':       [Buffer.from([0x52, 0x49, 0x46, 0x46])],  // RIFF
  'application/pdf':  [Buffer.from([0x25, 0x50, 0x44, 0x46])],  // %PDF
};

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const IMAGE_EXTS  = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const DOC_MIMES   = [...IMAGE_MIMES, 'application/pdf'];
const DOC_EXTS    = [...IMAGE_EXTS, '.pdf'];

// Validate file magic bytes from buffer (no disk I/O needed)
function validateMagicBytes(buffer, mimetype) {
  const sigs = ALLOWED_SIGNATURES[mimetype];
  if (!sigs || !buffer || buffer.length < 8) return false;
  return sigs.some(sig => buffer.slice(0, sig.length).equals(sig));
}

// ── Image-only upload (avatars, marketplace, events, lostfound) ──
exports.upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_, file, cb) => {
    if (!IMAGE_MIMES.includes(file.mimetype))
      return cb(new Error('Only JPG, PNG, GIF and WEBP images are allowed.'));
    if (!IMAGE_EXTS.includes(path.extname(file.originalname).toLowerCase()))
      return cb(new Error('Invalid file extension.'));
    cb(null, true);
  }
});

// ── Document upload (notes + PYQs — PDFs and images up to 25 MB) ──
exports.uploadDoc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_BYTES, files: 1 },
  fileFilter: (_, file, cb) => {
    if (!DOC_MIMES.includes(file.mimetype))
      return cb(new Error('Only JPG, PNG, GIF, WEBP images and PDFs are allowed.'));
    if (!DOC_EXTS.includes(path.extname(file.originalname).toLowerCase()))
      return cb(new Error('Invalid file extension.'));
    cb(null, true);
  }
});

// Post-upload magic byte validation middleware (reads from buffer)
exports.validateUpload = (req, res, next) => {
  if (!req.file) return next();
  if (!validateMagicBytes(req.file.buffer, req.file.mimetype)) {
    return res.status(400).json({ error: 'The file you uploaded appears to be invalid or corrupted. Please upload a genuine image or PDF file.' });
  }
  next();
};

exports.handleUploadError = (err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    // Detect which multer instance fired based on route path
    const isDoc = req.originalUrl && req.originalUrl.includes('/api/notes');
    const label = isDoc ? MAX_DOC_MB : MAX_IMAGE_MB;
    return res.status(413).json({ error: `The file you selected is too large. Please upload a file smaller than ${label}MB.` });
  }
  if (err && err.message)
    return res.status(400).json({ error: err.message });
  next(err);
};

exports.MAX_FILE_MB  = MAX_FILE_MB;
exports.MAX_IMAGE_MB = MAX_IMAGE_MB;
exports.MAX_DOC_MB   = MAX_DOC_MB;
exports.requireAuth = async (req, res, next) => {
  const sid = req.headers['x-session-id'];
  // Session IDs are 48 random bytes = 96 hex chars. Reject anything else immediately.
  if (!sid || typeof sid !== 'string' || sid.length !== 96 || !/^[a-f0-9]{96}$/.test(sid)) {
    return res.status(401).json({ error: 'You need to be logged in to do this. Please sign in and try again.' });
  }
  try {
    const { rows } = await getDB().query(
      `SELECT id,name,enrollment,department,year,program,semester,contact,phone,avatar_url,bio
       FROM users
       WHERE session_id=$1 AND (session_expires IS NULL OR session_expires > NOW())`,
      [sid]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Your session has expired. Please log in again to continue.' });
    req.user = rows[0];
    next();
  } catch {
    res.status(500).json({ error: 'Authentication failed due to a server error. Please try again.' });
  }
};

// ── Rate Limiter (per IP + path) ─────────────────────────
const rateMaps = new Map();
// Clean stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMaps) {
    if (now - entry.start > 3600000) rateMaps.delete(key);
  }
}, 300000);

exports.rateLimit = (max, windowMs) => (req, res, next) => {
  // Use X-Forwarded-For IP (trust proxy = 1 set in server.js handles this via req.ip)
  const key  = (req.ip || 'unknown') + '|' + req.path;
  const now  = Date.now();
  const e    = rateMaps.get(key) || { count: 0, start: now };
  if (now - e.start > windowMs) { e.count = 0; e.start = now; }
  e.count++;
  rateMaps.set(key, e);
  if (e.count > max) {
    res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', 0);
    return res.status(429).json({ error: 'Too many requests. Please wait before trying again.' });
  }
  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, max - e.count));
  next();
};

