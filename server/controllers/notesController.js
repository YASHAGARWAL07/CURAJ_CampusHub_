'use strict';
const { getDB }                            = require('../database');
const { sanitize, sanitizeUrl }            = require('../utils');
const { uploadFile, deleteFile,
        buildDownloadUrl, sanitizeFilename } = require('../storage');

// MIME → extension
const MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'image/jpeg':      '.jpg',
  'image/jpg':       '.jpg',
  'image/png':       '.png',
  'image/gif':       '.gif',
  'image/webp':      '.webp',
};

// extension → Content-Type
const EXT_TO_MIME = {
  '.pdf':  'application/pdf',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
};

function extFromName(name) {
  if (!name) return '';
  const m = String(name).match(/(\.[a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : '';
}

function mimeFromExt(ext) {
  return EXT_TO_MIME[ext] || 'application/octet-stream';
}

// ─────────────────────────────────────────────────────────────
exports.list = async (req, res) => {
  const type   = ['notes', 'pyq'].includes(req.query.type) ? req.query.type : null;
  const query  = type
    ? `SELECT n.*, u.name AS uploader_name
       FROM notes n LEFT JOIN users u ON u.id=n.user_id
       WHERE (n.status='approved' OR n.status IS NULL OR n.status='') AND n.type=$1
       ORDER BY n.created_at DESC LIMIT 300`
    : `SELECT n.*, u.name AS uploader_name
       FROM notes n LEFT JOIN users u ON u.id=n.user_id
       WHERE n.status='approved' OR n.status IS NULL OR n.status=''
       ORDER BY n.created_at DESC LIMIT 300`;
  const params = type ? [type] : [];
  try {
    const { rows } = await getDB().query(query, params);
    const processed = rows.map(row => ({
      ...row,
      // Never send raw Cloudinary URLs to the client — use our backend proxy instead
      download_url: row.file_url ? `/api/notes/${row.id}/file` : '',
    }));
    res.json(processed);
  } catch (err) {
    console.error('[notes.list]', err.message);
    res.status(500).json({ error: 'Could not load notes. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  const title  = sanitize(req.body.title, 150);
  const desc   = sanitize(req.body.description || '', 500);
  const subj   = sanitize(req.body.subject, 100);
  const sem    = parseInt(req.body.semester, 10);
  const type   = ['notes','pyq'].includes(req.body.type) ? req.body.type : 'notes';
  const dept   = sanitize(req.body.department || '', 120);
  const prog   = sanitize(req.body.program || '', 120);
  const examT  = sanitize(req.body.exam_type || '', 30);
  const yr     = parseInt(req.body.year, 10) || 0;
  const link   = sanitizeUrl(req.body.drive_link || '');

  if (!title) return res.status(400).json({ error: 'Please enter a title for this note or PYQ.' });
  if (!subj)  return res.status(400).json({ error: 'Please enter the subject name.' });
  if (!link && !req.file) return res.status(400).json({ error: 'Please either upload a file or provide a Google Drive link.' });

  let fileUrl  = '';
  let fileName = '';

  if (req.file) {
    // Use actual MIME from multer (validated by magic bytes) to get correct extension
    const mime = req.file.mimetype || 'application/octet-stream';
    const ext  = MIME_TO_EXT[mime] || extFromName(req.file.originalname) || '.pdf';
    fileName   = sanitizeFilename(title || req.file.originalname) + ext;

    const folder = type === 'pyq' ? 'pyq' : 'notes';
    try {
      fileUrl = await uploadFile(req.file.buffer, fileName, mime, folder);
    } catch (err) {
      console.error('[notes] Cloudinary upload error:', err.message);
      return res.status(500).json({ error: 'Failed to upload file. Please try again.' });
    }
  }

  // INSERT — does NOT use file_mime column to avoid migration dependency.
  // The correct extension is already encoded in file_name (e.g. "DSA_Notes.pdf").
  // getFile derives the MIME from file_name at download time.
  try {
    await getDB().query(
      `INSERT INTO notes(user_id,title,description,subject,semester,type,department,program,
                         exam_type,year,file_url,file_name,drive_link)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [req.user.id, title, desc, subj, sem||0, type, dept, prog,
       examT, yr, fileUrl, fileName, link]
    );
    res.status(201).json({ message: 'Your notes have been uploaded successfully! Thank you for helping your fellow students.' });
  } catch (err) {
    console.error('[notes.create]', err.message);
    res.status(500).json({ error: 'Could not save notes. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid note ID.' });
  try {
    const db = getDB();
    const { rows } = await db.query('SELECT user_id, file_url FROM notes WHERE id=$1', [id]);
    if (!rows[0])                        return res.status(404).json({ error: 'This note could not be found.' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'You can only remove notes that you uploaded.' });
    if (rows[0].file_url) await deleteFile(rows[0].file_url);
    await db.query('DELETE FROM notes WHERE id=$1', [id]);
    res.json({ message: 'Note removed successfully.' });
  } catch (err) {
    console.error('[notes.remove]', err.message);
    res.status(500).json({ error: 'Could not remove note. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────────
exports.trackDownload = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid note ID.' });
  try {
    await getDB().query('UPDATE notes SET downloads=downloads+1 WHERE id=$1', [id]);
  } catch { /* non-critical */ }
  res.json({ ok: true });
};

// ─────────────────────────────────────────────────────────────
exports.getFile = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid note ID.' });

  try {
    // Only select columns guaranteed to exist — no file_mime dependency
    const { rows } = await getDB().query(
      'SELECT file_url, file_name, title FROM notes WHERE id=$1',
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Note not found.' });
    }
    if (!rows[0].file_url || rows[0].file_url.trim() === '') {
      return res.status(404).json({ error: 'This note has no attached file. It may use a Google Drive link instead.' });
    }

    // Download counter is handled by the frontend calling /api/notes/:id/download
    // Do NOT also increment here to avoid double-counting every download

    const storedName = (rows[0].file_name || '').trim();
    const title      = rows[0].title || 'download';

    // Derive extension from stored file_name (most reliable — set at upload time)
    const ext    = extFromName(storedName) || '.pdf';
    const dlName = storedName || (sanitizeFilename(title) + ext);

    // Derive Content-Type from the extension we stored — NOT from Cloudinary response headers
    // (Cloudinary always serves raw files as application/octet-stream)
    const contentType = mimeFromExt(ext);

    // Clean URL in case it somehow already has fl_attachment from a previous operation
    const rawFileUrl = rows[0].file_url.replace(/\/fl_attachment:[^/]+\//, '/raw/upload/');

    // Build the Cloudinary download URL with fl_attachment
    const dlUrl = buildDownloadUrl(rawFileUrl, dlName);

    // Fetch from Cloudinary — if fl_attachment URL fails (e.g. 400), retry with plain URL
    let upstream = await fetch(dlUrl);
    if (!upstream.ok && dlUrl !== rawFileUrl) {
      console.warn(`[notes.getFile] fl_attachment URL failed (${upstream.status}), retrying with plain URL`);
      upstream = await fetch(rawFileUrl);
    }
    if (!upstream.ok) {
      console.error(`[notes.getFile] Cloudinary fetch failed: ${upstream.status} for ${dlUrl}`);
      return res.status(502).json({ error: `Could not fetch file from storage (${upstream.status}). Please try again.` });
    }

    // Set response headers — use OUR derived Content-Type, not Cloudinary's
    res.setHeader('Content-Type', contentType);
    // For PDFs: use 'inline' so browser opens them directly (user can save from browser)
    // For other types: force download with 'attachment'
    const disposition = contentType === 'application/pdf' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${dlName}"`);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Stream file body to client — buffer fully so Content-Length is accurate
    try {
      const buf = Buffer.from(await upstream.arrayBuffer());
      // Set all headers now that we have the real size
      res.setHeader('Content-Length', buf.length);
      res.end(buf);
    } catch (streamErr) {
      console.error('[notes.getFile] stream error:', streamErr.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Could not stream file. Please try again.' });
      }
    }
  } catch (err) {
    console.error('[notes.getFile] error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not retrieve file. Please try again.' });
    }
  }
};
