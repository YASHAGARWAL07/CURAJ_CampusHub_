'use strict';
const { getDB }    = require('../database');
const { sanitize } = require('../utils');

exports.submit = async (req, res) => {
  const body     = sanitize(req.body.body || req.body.feedback || '', 2000);
  const title    = sanitize(req.body.title || 'General', 120);
  const category = sanitize(req.body.category || 'general', 50);
  const name     = sanitize(req.body.name || '', 120);
  const rating   = parseInt(req.body.rating, 10) || null;
  // user_id is optional — anonymous feedback is fully allowed
  const userId   = req.user ? req.user.id : null;

  if (!body || body.length < 5)
    return res.status(400).json({ error: 'Please write at least a sentence of feedback so we can understand your thoughts.' });
  if (body.length > 2000)
    return res.status(400).json({ error: 'Feedback is too long. Please keep it under 2000 characters.' });
  if (rating !== null && (rating < 1 || rating > 5))
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });

  try {
    await getDB().query(
      `INSERT INTO feedback(user_id, name, title, body, category, rating) VALUES($1,$2,$3,$4,$5,$6)`,
      [userId, name, title, body, category, rating]
    );
    res.status(201).json({ message: 'Thank you for your feedback! It helps us make CU Hub better for everyone.' });
  } catch (err) {
    console.error('[feedback.submit]', err.message);
    res.status(500).json({ error: 'Could not save feedback. Please try again in a moment.' });
  }
};
