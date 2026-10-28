'use strict';
const { getDB }                  = require('../database');
const { sanitize }               = require('../utils');
const { uploadFile }             = require('../storage');

exports.list = async (req, res) => {
  try {
    const { rows } = await getDB().query(
      `SELECT l.*, u.name AS reporter_name, u.phone AS reporter_phone, u.department AS reporter_department, u.program AS reporter_program
       FROM lost_found l LEFT JOIN users u ON u.id=l.user_id
       WHERE l.status IN ('open','resolved') ORDER BY l.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error('[lostfound.list]', err.message);
    res.status(500).json({ error: 'Could not load items. Please try again.' });
  }
};

exports.create = async (req, res) => {
  const title = sanitize(req.body.title, 120);
  const desc  = sanitize(req.body.description, 1000);
  const loc   = sanitize(req.body.location, 200);
  const type  = ['lost','found'].includes(req.body.type) ? req.body.type : 'lost';
  const cont  = sanitize(req.body.contact || '', 100);

  if (!title) return res.status(400).json({ error: 'Please enter the name or title of the item.' });
  if (!desc)  return res.status(400).json({ error: 'Please describe the item so others can identify it.' });
  if (!loc)   return res.status(400).json({ error: 'Please enter the location where the item was lost or found.' });

  let imageUrl = null;
  if (req.file) {
    try {
      imageUrl = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'lostfound');
    } catch (err) {
      console.error('[lostfound] Cloudinary upload error:', err.message);
      return res.status(500).json({ error: 'Failed to upload image. Please try again.' });
    }
  }

  try {
    await getDB().query(
      `INSERT INTO lost_found(user_id,title,description,location,type,contact,image_url)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [req.user.id, title, desc, loc, type, cont, imageUrl]
    );
    res.status(201).json({ message: type === 'lost'
      ? 'Your lost item report has been submitted. We hope it gets found soon!'
      : 'Your found item report has been submitted. Thank you for helping the community!' });
  } catch (err) {
    console.error('[lostfound.create]', err.message);
    res.status(500).json({ error: 'Could not submit report. Please try again.' });
  }
};

exports.resolve = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid report ID.' });
  try {
    const db = getDB();
    const { rows } = await db.query('SELECT user_id FROM lost_found WHERE id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'This report could not be found. It may have already been resolved or removed.' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'You can only resolve your own reports.' });
    await db.query("UPDATE lost_found SET status='resolved' WHERE id=$1", [id]);
    res.json({ message: 'Great news! This item has been marked as resolved.' });
  } catch (err) {
    console.error('[lostfound.resolve]', err.message);
    res.status(500).json({ error: 'Could not update the report. Please try again.' });
  }
};
