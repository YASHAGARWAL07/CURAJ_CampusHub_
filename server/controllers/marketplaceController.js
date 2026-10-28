'use strict';
const { getDB }                  = require('../database');
const { sanitize }               = require('../utils');
const { uploadFile, deleteFile } = require('../storage');

exports.list = async (req, res) => {
  try {
    const db = getDB();
    const { rows } = await db.query(
      `SELECT m.*, u.name AS seller_name, u.department, u.program AS seller_program, u.phone AS seller_phone
       FROM marketplace m LEFT JOIN users u ON u.id=m.user_id
       WHERE m.status='active' ORDER BY m.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error('[marketplace.list]', err.message);
    res.status(500).json({ error: 'Could not load listings. Please try again.' });
  }
};

exports.create = async (req, res) => {
  const title = sanitize(req.body.title, 120);
  const desc  = sanitize(req.body.description, 1000);
  const price = parseInt(req.body.price, 10);
  const cat   = sanitize(req.body.category || 'other', 30);
  const cond  = sanitize(req.body.condition || 'good', 20);
  const cont  = sanitize(req.body.contact || '', 100);

  if (!title)                    return res.status(400).json({ error: 'Please enter a title for your listing.' });
  if (!desc)                     return res.status(400).json({ error: 'Please add a description so buyers know what you are selling.' });
  if (isNaN(price) || price < 0) return res.status(400).json({ error: 'Please enter a valid price (0 or more).' });
  if (price > 500000)            return res.status(400).json({ error: 'Price cannot exceed ₹5,00,000. Please enter a realistic price.' });

  let imageUrl = null;
  if (req.file) {
    try {
      imageUrl = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'marketplace');
    } catch (err) {
      console.error('[marketplace] Cloudinary upload error:', err.message);
      return res.status(500).json({ error: 'Failed to upload image. Please try again.' });
    }
  }

  try {
    const db = getDB();
    await db.query(
      `INSERT INTO marketplace(user_id,title,description,price,category,condition,contact,image_url)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [req.user.id, title, desc, price, cat, cond, cont, imageUrl]
    );
    res.status(201).json({ message: 'Your listing has been published successfully! Other students can now see it.' });
  } catch (err) {
    console.error('[marketplace.create]', err.message);
    res.status(500).json({ error: 'Could not publish listing. Please try again.' });
  }
};

exports.remove = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid listing ID.' });
  try {
    const db = getDB();
    const { rows } = await db.query('SELECT user_id, image_url FROM marketplace WHERE id=$1', [id]);
    if (!rows[0])                        return res.status(404).json({ error: 'This listing could not be found. It may have already been removed.' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'You can only remove your own listings.' });
    if (rows[0].image_url) await deleteFile(rows[0].image_url);
    await db.query('DELETE FROM marketplace WHERE id=$1', [id]);
    res.json({ message: 'Your listing has been removed successfully.' });
  } catch (err) {
    console.error('[marketplace.remove]', err.message);
    res.status(500).json({ error: 'Could not remove listing. Please try again.' });
  }
};
