'use strict';
const crypto = require('crypto');

// ── Sanitize: strip ALL HTML, control chars, null bytes ──
exports.sanitize = (s, max = 500) => {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFC')                                      // normalise unicode (prevent homograph attacks)
    .trim()
    .slice(0, max)
    .replace(/\0/g, '')                                    // null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/[<>"`;]/g, '')                              // HTML/JS injection chars
    .replace(/javascript\s*:/gi, '')                      // js: protocol
    .replace(/on\w+\s*=/gi, '')                           // event handlers
    .replace(/data\s*:/gi, '')                            // data: URIs
    .replace(/<!--.*?-->/gs, '')                           // HTML comments
    .replace(/<\/?[a-z][^>]*>/gi, '');                    // any remaining HTML tags
};

// ── Sanitize URL: only allow http/https, no SSRF targets ──
exports.sanitizeUrl = (s) => {
  if (!s) return '';
  const u = s.trim().slice(0, 2000);
  if (!/^https?:\/\//i.test(u)) return '';
  // Block SSRF: local network, metadata endpoints, cloud metadata
  if (/localhost|127\.|0\.0\.0\.0|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|\[::1\]|metadata\.google|169\.254\.169\.254|instance-data|imds\.msft\.net|169\.254\.169\.254|aws-metadata|azure-metadata/i.test(u)) return '';
  // Block protocol attacks
  if (/javascript:|data:|vbscript:|file:|ftp:|gopher:|dict:|ldap:/i.test(u)) return '';
  // Block null bytes
  if (u.includes('\0')) return '';
  // Block encoded traversal
  if (/%2e%2e|%252e|%00/i.test(u)) return '';
  // Validate URL parses correctly
  try { new URL(u); } catch { return ''; }
  return u;
};

// ── PBKDF2 password hashing (replaces SHA256+static salt) ──
// Uses 100,000 iterations, SHA-512, 64-byte output
exports.hashPassword = (password) => {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt + (process.env.PASSWORD_PEPPER || 'cuhub_pepper_v2'), 100000, 64, 'sha512').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
};

exports.verifyPassword = (password, stored) => {
  if (!stored) return false;
  // Legacy SHA256 support for existing accounts
  if (!stored.startsWith('pbkdf2:')) {
    const legacyHash = crypto.createHash('sha256').update(password + 'cuhub_salt_v1', 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(legacyHash));
  }
  const [, salt, hash] = stored.split(':');
  const attempt = crypto.pbkdf2Sync(password, salt + (process.env.PASSWORD_PEPPER || 'cuhub_pepper_v2'), 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(attempt));
};

// ── SHA256 for admin only ──
exports.sha256 = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// ── Constant-time string compare ──
exports.safeCompare = (a, b) => {
  // Pad to same length to prevent timing leaks even on length mismatch
  const ha = Buffer.from(crypto.createHash('sha256').update(String(a)).digest('hex'));
  const hb = Buffer.from(crypto.createHash('sha256').update(String(b)).digest('hex'));
  return crypto.timingSafeEqual(ha, hb);
};

// ── Generate secure session ID ──
exports.generateSessionId = () => crypto.randomBytes(48).toString('hex');
