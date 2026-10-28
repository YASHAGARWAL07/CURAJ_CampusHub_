'use strict';
const crypto = require('crypto');
const { getDB } = require('../database');
const { sanitize, hashPassword, verifyPassword, generateSessionId } = require('../utils');
const { uploadFile, deleteFile } = require('../storage');

const SAFE = 'id,name,enrollment,department,year,program,semester,contact,phone,avatar_url,bio,created_at,last_login_at';
const FORBIDDEN_FIELDS = ['password_hash', 'session_id', 'session_expires', 'last_login_ip', 'failed_logins', 'locked_until'];

const SESSION_TTL_DAYS  = 30;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES   = 30;

const ENROLLMENT_RE = /^[A-Z0-9\/\-\.]{5,30}$/;
const PASSWORD_RE   = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;

function safeUser(row) {
  if (!row) return null;
  const u = { ...row };
  FORBIDDEN_FIELDS.forEach(f => delete u[f]);
  return u;
}

exports.me = async (req, res) => {
  const sid = req.headers['x-session-id'];
  if (!sid || typeof sid !== 'string' || sid.length > 200) return res.json({ user: null });
  try {
    const { rows } = await getDB().query(
      `SELECT ${SAFE} FROM users WHERE session_id=$1 AND (session_expires IS NULL OR session_expires > NOW())`,
      [sid]
    );
    res.json({ user: rows[0] ? safeUser(rows[0]) : null });
  } catch {
    res.json({ user: null });
  }
};

exports.register = async (req, res) => {
  const name       = sanitize(req.body.name, 100);
  const enrollment = sanitize(req.body.enrollment, 30).toUpperCase().replace(/\s+/g, '');
  const department = sanitize(req.body.department, 120);
  const year       = sanitize(req.body.year, 30);
  const program    = sanitize(req.body.program || '', 120);
  const semester   = sanitize(req.body.semester || '', 10);
  const phone      = (req.body.phone || req.body.contact || '').toString().replace(/\D/g, '').slice(-10); // take last 10 digits (handles +91 prefix)
  const password   = typeof req.body.password === 'string' ? req.body.password : '';

  if (!name || name.length < 2)
    return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
  if (!/[a-zA-Z]/.test(name))
    return res.status(400).json({ error: 'Name must contain at least one letter.' });
  if (!enrollment || !ENROLLMENT_RE.test(enrollment))
    return res.status(400).json({ error: 'Invalid enrollment number. Please use the format shown on your ID card (e.g. 22CUCSE001).' });
  if (!department)
    return res.status(400).json({ error: 'Please select your department.' });
  if (!year)
    return res.status(400).json({ error: 'Please select your year of study.' });
  if (!phone || !/^\d{10}$/.test(phone))
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
  if (!password || !PASSWORD_RE.test(password))
    return res.status(400).json({ error: 'Password must be at least 8 characters and include both letters and numbers.' });
  if (password.length > 128)
    return res.status(400).json({ error: 'Password is too long (max 128 characters).' });

  const db = getDB();
  let existPhone, existEnroll;
  try {
    [existPhone, existEnroll] = await Promise.all([
      db.query('SELECT id FROM users WHERE phone=$1', [phone]),
      db.query('SELECT id FROM users WHERE enrollment=$1', [enrollment])
    ]);
  } catch (e) {
    return res.status(500).json({ error: 'Registration failed due to a server error. Please try again in a moment.' });
  }

  if (existPhone.rows.length && existEnroll.rows.length)
    return res.status(409).json({ error: `An account already exists with enrollment number "${enrollment}" and mobile number ${phone}. Please login instead.` });
  if (existPhone.rows.length)
    return res.status(409).json({ error: `An account already exists with mobile number ${phone}. If this is your number, please login instead. If not, contact support.` });
  if (existEnroll.rows.length)
    return res.status(409).json({ error: `An account already exists with enrollment number "${enrollment}". Each student can only have one account. Please login instead.` });

  const sid     = generateSessionId();
  const hash    = hashPassword(password);
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000);
  const ip      = req.ip || '';

  try {
    const r = await db.query(
      `INSERT INTO users(name,enrollment,department,year,program,semester,contact,phone,password_hash,session_id,session_expires,last_login_at,last_login_ip)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12) RETURNING id`,
      [name, enrollment, department, year, program, semester, phone, phone, hash, sid, expires, ip]
    );
    const u = await db.query(`SELECT ${SAFE} FROM users WHERE id=$1`, [r.rows[0].id]);
    res.status(201).json({ message: 'Account created successfully! Welcome to CU Hub 🎉', session_id: sid, user: safeUser(u.rows[0]) });
  } catch (e) {
    if (e.code === '23505') {
      if (e.detail?.includes('phone') || e.constraint?.includes('phone'))
        return res.status(409).json({ error: `An account already exists with mobile number ${phone}. Please login instead.` });
      if (e.detail?.includes('enrollment') || e.constraint?.includes('enrollment'))
        return res.status(409).json({ error: `An account already exists with enrollment number "${enrollment}". Please login instead.` });
      return res.status(409).json({ error: 'An account with these details already exists. Please login instead.' });
    }
    res.status(500).json({ error: 'Registration failed due to a server error. Please try again in a moment.' });
  }
};

exports.login = async (req, res) => {
  const phone    = (req.body.phone || req.body.contact || '').toString().replace(/\D/g, '').slice(0, 10);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!phone || !/^\d{10}$/.test(phone))
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
  if (!password)
    return res.status(400).json({ error: 'Please enter your password.' });
  if (password.length > 128)
    return res.status(400).json({ error: 'Invalid credentials. Please check your details and try again.' });

  try {
    const db = getDB();
    const { rows } = await db.query('SELECT * FROM users WHERE phone=$1', [phone]);
    const user = rows[0];

    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
      return res.status(423).json({ error: `Your account has been temporarily locked due to too many failed attempts. Please try again in ${mins} minute${mins !== 1 ? 's' : ''}.` });
    }

    const isValid = user ? verifyPassword(password, user.password_hash) : false;

    if (!user || !isValid) {
      if (user) {
        const newFailed = (user.failed_logins || 0) + 1;
        if (newFailed >= MAX_FAILED_LOGINS) {
          const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
          await db.query('UPDATE users SET failed_logins=$1, locked_until=$2 WHERE id=$3', [newFailed, lockUntil, user.id]);
          return res.status(423).json({ error: `Too many failed login attempts. Your account has been locked for ${LOCKOUT_MINUTES} minutes as a security precaution. Please try again later.` });
        }
        await db.query('UPDATE users SET failed_logins=$1 WHERE id=$2', [newFailed, user.id]);
        const remaining = MAX_FAILED_LOGINS - newFailed;
        return res.status(401).json({ error: `Incorrect password. You have ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before your account is temporarily locked.` });
      }
      await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
      return res.status(401).json({ error: 'No account found with this mobile number. Please check your number or create a new account.' });
    }

    const newSid   = generateSessionId();
    const expires  = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000);
    const ip       = req.ip || '';

    await db.query(
      'UPDATE users SET session_id=$1, session_expires=$2, failed_logins=0, locked_until=NULL, last_login_at=NOW(), last_login_ip=$3 WHERE id=$4',
      [newSid, expires, ip, user.id]
    );

    if (user.password_hash && !user.password_hash.startsWith('pbkdf2:')) {
      const newHash = hashPassword(password);
      await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, user.id]);
    }

    const safe = await db.query(`SELECT ${SAFE} FROM users WHERE id=$1`, [user.id]);
    res.json({ message: 'Login successful! Welcome back.', session_id: newSid, user: safeUser(safe.rows[0]) });
  } catch (err) {
    console.error('[auth.login]', err.message);
    res.status(500).json({ error: 'Login failed due to a server error. Please try again in a moment.' });
  }
};

exports.logout = async (req, res) => {
  const sid = req.headers['x-session-id'];
  if (sid && typeof sid === 'string' && sid.length <= 200) {
    await getDB().query('UPDATE users SET session_id=NULL, session_expires=NULL WHERE session_id=$1', [sid]).catch(() => {});
  }
  res.json({ message: 'You have been logged out successfully.' });
};

exports.changePassword = async (req, res) => {
  const current = typeof req.body.current_password === 'string' ? req.body.current_password : '';
  const newPass = typeof req.body.new_password     === 'string' ? req.body.new_password     : '';

  if (!current)
    return res.status(400).json({ error: 'Please enter your current password to continue.' });
  if (!newPass || !PASSWORD_RE.test(newPass))
    return res.status(400).json({ error: 'Your new password must be at least 8 characters and include both letters and numbers.' });
  if (current === newPass)
    return res.status(400).json({ error: 'Your new password must be different from your current password.' });

  try {
    const db = getDB();
    const { rows } = await db.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = rows[0];
    if (!user || !verifyPassword(current, user.password_hash))
      return res.status(401).json({ error: 'The current password you entered is incorrect. Please try again.' });

    const newHash = hashPassword(newPass);
    const newSid  = generateSessionId();
    const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000);
    await db.query('UPDATE users SET password_hash=$1, session_id=$2, session_expires=$3 WHERE id=$4', [newHash, newSid, expires, user.id]);
    res.json({ message: 'Your password has been changed successfully. All other sessions have been signed out.', session_id: newSid });
  } catch (err) {
    console.error('[auth.changePassword]', err.message);
    res.status(500).json({ error: 'Could not change password. Please try again.' });
  }
};

exports.updateContact = async (req, res) => {
  const c = (req.body.contact || '').toString().replace(/\D/g, '').slice(0, 10);
  if (!c || !/^\d{10}$/.test(c))
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
  try {
    const ex = await getDB().query('SELECT id FROM users WHERE phone=$1 AND id!=$2', [c, req.user.id]);
    if (ex.rows.length)
      return res.status(409).json({ error: `The mobile number ${c} is already linked to another CU Hub account. Please use a different number.` });
    await getDB().query('UPDATE users SET contact=$1,phone=$2 WHERE id=$3', [c, c, req.user.id]);
    res.json({ message: 'Contact number updated successfully.' });
  } catch (err) {
    console.error('[auth.updateContact]', err.message);
    res.status(500).json({ error: 'Could not update contact. Please try again.' });
  }
};

exports.updateProfile = async (req, res) => {
  const db         = getDB();
  const name       = sanitize(req.body.name || '', 100);
  const bio        = sanitize(req.body.bio || '', 300);
  const phone      = (req.body.phone || '').toString().replace(/\D/g, '').slice(0, 10);
  const program    = sanitize(req.body.program || '', 120);
  const semester   = sanitize(req.body.semester || '', 10);
  const department = sanitize(req.body.department || '', 120);

  if (!name || name.length < 2)
    return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
  if (phone && !/^\d{10}$/.test(phone))
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });

  try {
    if (phone) {
      const ex = await db.query('SELECT id FROM users WHERE phone=$1 AND id!=$2', [phone, req.user.id]);
      if (ex.rows.length)
        return res.status(409).json({ error: `The mobile number ${phone} is already linked to another CU Hub account. Please use a different number.` });
    }

    const ph   = phone      || req.user.phone      || '';
    const dept = department || req.user.department  || '';
    const prog = program    || req.user.program     || '';
    const sem  = semester   || req.user.semester    || '';
    const semN = parseInt(sem, 10);
    const yr   = semN > 0 ? String(Math.ceil(semN / 2)) : (req.user.year || '');

    await db.query(
      'UPDATE users SET name=$1,bio=$2,phone=$3,contact=$4,program=$5,semester=$6,department=$7,year=$8 WHERE id=$9',
      [name, bio, ph, ph, prog, sem, dept, yr, req.user.id]
    );
    const updated = await db.query(`SELECT ${SAFE} FROM users WHERE id=$1`, [req.user.id]);
    res.json({ message: 'Profile updated successfully.', user: safeUser(updated.rows[0]) });
  } catch (err) {
    console.error('[auth.updateProfile]', err.message);
    res.status(500).json({ error: 'Could not update profile. Please try again.' });
  }
};

exports.updateAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image was uploaded. Please select a photo and try again.' });
  try {
    // Delete old avatar from Cloudinary if it exists
    const { rows: old } = await getDB().query('SELECT avatar_url FROM users WHERE id=$1', [req.user.id]);
    if (old[0]?.avatar_url) await deleteFile(old[0].avatar_url);

    const url = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'avatars');
    await getDB().query('UPDATE users SET avatar_url=$1 WHERE id=$2', [url, req.user.id]);
    res.json({ message: 'Profile photo updated successfully.', avatar_url: url });
  } catch (err) {
    console.error('[avatar] upload error:', err);
    res.status(500).json({ error: 'Failed to upload photo. Please try again.' });
  }
};

/* ══════════════════════════════════════════════════════════
   FORGOT PASSWORD — send magic link to university email
   Rate limited: 2 per enrollment per 3 hours (in routes)
   ══════════════════════════════════════════════════════════ */
exports.forgotPassword = async (req, res) => {
  const enrollment = sanitize(req.body.enrollment || '', 30).toUpperCase().replace(/\s+/g, '');

  if (!enrollment || !ENROLLMENT_RE.test(enrollment))
    return res.status(400).json({ error: 'Please enter a valid CURAJ enrollment number (e.g. 22CUCSE001).' });

  // Always return the same message — never reveal if enrollment exists
  const SUCCESS_MSG = {
    message: `If an account exists for ${enrollment}, a reset link has been sent to ${enrollment.toLowerCase()}@curaj.ac.in`,
    email: `${enrollment.toLowerCase()}@curaj.ac.in`
  };

  try {
    const db = getDB();
    const { rows } = await db.query('SELECT id, name, enrollment FROM users WHERE enrollment=$1', [enrollment]);

    if (!rows[0]) {
      // Silent — don't reveal that enrollment doesn't exist
      await new Promise(r => setTimeout(r, 200 + Math.random() * 100)); // timing-safe delay
      return res.json(SUCCESS_MSG);
    }

    const user  = rows[0];
    const email = user.enrollment.toLowerCase() + '@curaj.ac.in';

    // Check: max 2 tokens per enrollment in last 3 hours
    const { rows: recent } = await db.query(
      `SELECT id FROM password_reset_tokens
       WHERE user_id=$1 AND created_at > NOW() - INTERVAL '3 hours'`,
      [user.id]
    );
    if (recent.length >= 2) {
      return res.status(429).json({
        error: 'A reset link was already sent to your university email. Please wait 3 hours before requesting again.'
      });
    }

    // Delete old unused tokens for this user
    await db.query('DELETE FROM password_reset_tokens WHERE user_id=$1 AND used=FALSE', [user.id]);

    // Generate secure token
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.query(
      'INSERT INTO password_reset_tokens(user_id, token, expires_at) VALUES($1,$2,$3)',
      [user.id, token, expires]
    );

    // Validate APP_URL to prevent open redirect — must be http/https, no SSRF
    const rawAppUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    let appUrl = 'http://localhost:3000';
    try {
      const parsed = new URL(rawAppUrl);
      const isHttp = /^https?:$/.test(parsed.protocol);
      const isSafe = !/localhost|127\.|192\.168\.|10\.|169\.254\./.test(parsed.hostname);
      const isLocalDev = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (isHttp && (isSafe || isLocalDev)) appUrl = rawAppUrl; // prevent open redirect
    } catch { /* use default localhost */ }
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    await require('../email').sendResetEmail(email, user.name, resetLink, user.enrollment);

    res.json(SUCCESS_MSG);
  } catch (err) {
    console.error('[forgotPassword]', err.message);
    res.status(500).json({ error: 'Could not send reset email. Please try again.' });
  }
};

/* ══════════════════════════════════════════════════════════
   RESET PASSWORD — validate token → set new password
   ══════════════════════════════════════════════════════════ */
exports.resetPassword = async (req, res) => {
  const token    = typeof req.body.token       === 'string' ? req.body.token.trim()       : '';
  const newPass  = typeof req.body.new_password === 'string' ? req.body.new_password       : '';

  if (!token || token.length !== 64 || !/^[a-f0-9]+$/.test(token))
    return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });

  if (!newPass || !PASSWORD_RE.test(newPass))
    return res.status(400).json({ error: 'Password must be at least 8 characters and include both letters and numbers.' });
  if (newPass.length > 128)
    return res.status(400).json({ error: 'Password is too long (max 128 characters).' });

  try {
    const db = getDB();

    // Find valid, unused, non-expired token
    const { rows } = await db.query(
      `SELECT t.*, u.id as uid FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token=$1 AND t.used=FALSE AND t.expires_at > NOW()`,
      [token]
    );

    if (!rows[0])
      return res.status(400).json({ error: 'This reset link has expired or already been used. Please request a new one.' });

    const resetRow = rows[0];
    const newHash  = hashPassword(newPass);
    const newSid   = generateSessionId();
    const expires  = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000);

    // Update password + invalidate all existing sessions + clear lockout
    await db.query(
      `UPDATE users
       SET password_hash=$1, session_id=$2, session_expires=$3,
           failed_logins=0, locked_until=NULL
       WHERE id=$4`,
      [newHash, newSid, expires, resetRow.uid]
    );

    // Mark token as used so it can't be reused
    await db.query('UPDATE password_reset_tokens SET used=TRUE WHERE id=$1', [resetRow.id]);

    // Fetch safe user data for auto-login
    const { rows: userRows } = await db.query(`SELECT ${SAFE} FROM users WHERE id=$1`, [resetRow.uid]);

    res.json({
      message:    'Password reset successfully! You are now logged in.',
      session_id: newSid,
      user:       safeUser(userRows[0])
    });
  } catch (err) {
    console.error('[resetPassword]', err.message);
    res.status(500).json({ error: 'Could not reset password. Please try again.' });
  }
};
