'use strict';
/**
 * storage.js - Cloudinary file storage helper
 *
 * Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

const cloudinary = require('cloudinary').v2;

const REQUIRED = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.warn(`[storage] WARNING: ${key} is not set. File uploads will fail until this is configured.`);
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const RESOURCE_TYPE = {
  avatars:     'image',   // profile photos
  marketplace: 'image',   // product/listing photos
  events:      'image',   // event banners
  lostfound:   'image',   // lost & found photos
  notes:       'raw',     // notes PDFs
  pyq:         'raw',     // PYQ paper PDFs (own folder, separate from notes)
  documents:   'raw',     // generic large file uploads
};

/**
 * Sanitize a filename for use in Cloudinary URLs and Content-Disposition headers.
 * Keeps alphanumerics, hyphens, underscores, dots. Replaces spaces with underscores.
 */
function sanitizeFilename(name) {
  const clean = (name || 'file')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')    // no double dots
    .slice(0, 80) || 'file';
  // Strip dangerous double extensions e.g. evil.pdf.exe → evil_pdf
  const parts = clean.split('.');
  if (parts.length > 2) {
    // Keep only last extension, join rest with _
    return parts.slice(0, -1).join('_') + '.' + parts[parts.length - 1];
  }
  return clean;
}

/**
 * Upload a file buffer to Cloudinary.
 * Returns the secure public URL of the uploaded file.
 */
function uploadFile(buffer, originalName, mimetype, folder) {
  folder = folder || 'uploads';
  const resourceType = RESOURCE_TYPE[folder] || 'auto';
  const safeName     = sanitizeFilename(originalName || 'file');

  return new Promise(function(resolve, reject) {
    const opts = {
      folder:          'cu-hub/' + folder,
      resource_type:   resourceType,
      use_filename:    true,
      unique_filename: true,
    };

    if (resourceType === 'image') {
      opts.quality      = 'auto';
      opts.fetch_format = 'auto';
    }

    if (resourceType === 'raw') {
      opts.context = 'original_filename=' + safeName;
    }

    const stream = cloudinary.uploader.upload_stream(opts, function(error, result) {
      if (error) return reject(error);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

/**
 * Build a Cloudinary URL that forces the browser to download the file with
 * the correct filename and extension.
 *
 * Inserts fl_attachment:filename.pdf into the URL so Cloudinary sends:
 *   Content-Disposition: attachment; filename="filename.pdf"
 *
 * This fixes the bug where downloaded PDFs had no extension and browsers
 * couldn't identify the file type.
 *
 * @param {string} secureUrl    - URL returned by uploadFile()
 * @param {string} downloadName - desired download filename (e.g. "DSA_Notes_Sem3.pdf")
 * @returns {string}            - URL that triggers a named download
 */
function buildDownloadUrl(secureUrl, downloadName) {
  if (!secureUrl || !secureUrl.includes('cloudinary.com')) return secureUrl || '';
  // Only transform raw (PDF/doc) files — images should display, not force download
  if (!secureUrl.includes('/raw/upload/')) return secureUrl;

  // Sanitize the filename strictly: only alphanumerics, underscores, hyphens, and a single dot before extension.
  // Dots (other than extension) and special chars in the fl_attachment param cause Cloudinary 400 errors.
  const rawName = downloadName || 'download.pdf';
  const extMatch = rawName.match(/(\.[a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '.pdf';
  const baseName = rawName.replace(/(\.[a-zA-Z0-9]+)$/, ''); // remove extension
  const safeBase = baseName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '') // remove ALL special chars including dots
    .slice(0, 80) || 'download';
  const safeName = safeBase + ext;

  // Insert fl_attachment transformation after /upload/
  // Before: https://res.cloudinary.com/cloud/raw/upload/v123/cu-hub/notes/abc
  // After:  https://res.cloudinary.com/cloud/raw/upload/fl_attachment:DSA_Notes.pdf/v123/cu-hub/notes/abc
  return secureUrl.replace('/raw/upload/', '/raw/upload/fl_attachment:' + safeName + '/');
}

/**
 * Delete a file from Cloudinary by its secure URL.
 * Silently ignores errors.
 */
async function deleteFile(secureUrl) {
  if (!secureUrl || !secureUrl.includes('cloudinary.com')) return;
  // Strip any fl_attachment transformation before extracting public_id
  const cleanUrl = secureUrl.replace(/\/fl_attachment:[^/]+\//, '/');
  try {
    const matches = cleanUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (!matches) return;
    const publicId    = matches[1];
    const resourceType = cleanUrl.includes('/raw/') ? 'raw' : 'image';
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('[storage] deleteFile error:', err.message);
  }
}

module.exports = { uploadFile, deleteFile, buildDownloadUrl, sanitizeFilename };
