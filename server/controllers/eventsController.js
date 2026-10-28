'use strict';
const { getDB }                  = require('../database');
const { sanitize, sanitizeUrl }  = require('../utils');
const { uploadFile, deleteFile } = require('../storage');

exports.list = async (req, res) => {
  try {
    const { rows } = await getDB().query(
      `SELECT e.*, u.name AS organizer_name, u.phone AS poster_phone, u.department AS poster_department, u.program AS poster_program
       FROM events e LEFT JOIN users u ON u.id=e.user_id
       ORDER BY e.event_date ASC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error('[events.list]', err.message);
    res.status(500).json({ error: 'Could not load events. Please try again.' });
  }
};

exports.create = async (req, res) => {
  const title   = sanitize(req.body.title, 150);
  const desc    = sanitize(req.body.description, 1000);
  const venue   = sanitize(req.body.venue, 200);
  const date    = typeof req.body.event_date === 'string' ? req.body.event_date.trim().slice(0, 20).replace(/[^0-9\-\/T:Z]/g, '') : '';
  const time    = sanitize(req.body.event_time || '', 20);
  const org     = sanitize(req.body.organizer, 120);
  const cat     = sanitize(req.body.category || 'event', 30);
  const cont    = sanitize(req.body.contact || '', 100);
  const regLink = sanitizeUrl(req.body.registration_link || '');

  if (!title) return res.status(400).json({ error: 'Please enter a title for the event.' });
  if (!desc)  return res.status(400).json({ error: 'Please add a description for the event.' });
  if (!venue) return res.status(400).json({ error: 'Please enter the venue or location of the event.' });
  if (!date)  return res.status(400).json({ error: 'Please select a date for the event.' });
  if (!org)   return res.status(400).json({ error: 'Please enter the name of the organizer or club.' });
  if (isNaN(new Date(date).getTime())) return res.status(400).json({ error: 'The event date is not valid. Please select a proper date.' });
  // Compare dates only (not time) so events can be posted for today
  const today = new Date(); today.setHours(0,0,0,0);
  const eventDay = new Date(date); eventDay.setHours(0,0,0,0);
  if (eventDay < today) return res.status(400).json({ error: 'The event date must be today or in the future. You cannot post events for past dates.' });

  let imageUrl = null;
  if (req.file) {
    try {
      imageUrl = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'events');
    } catch (err) {
      console.error('[events] Cloudinary upload error:', err);
      return res.status(500).json({ error: 'Failed to upload image. Please try again.' });
    }
  }

  try {
    await getDB().query(
      `INSERT INTO events(user_id,title,description,venue,event_date,event_time,organizer,category,contact,registration_link,image_url)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [req.user.id, title, desc, venue, date, time, org, cat, cont, regLink, imageUrl]
    );
    res.status(201).json({ message: 'Your event has been posted successfully! Students can now see it.' });
  } catch (err) {
    console.error('[events.create]', err.message);
    res.status(500).json({ error: 'Could not save the event. Please try again.' });
  }
};

exports.cancel = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid event ID.' });
  try {
    const db = getDB();
    const { rows } = await db.query('SELECT user_id FROM events WHERE id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'This event could not be found. It may have already been cancelled or removed.' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'You can only cancel events that you created.' });
    await db.query("UPDATE events SET status='cancelled' WHERE id=$1", [id]);
    res.json({ message: 'The event has been cancelled successfully.' });
  } catch (err) {
    console.error('[events.cancel]', err.message);
    res.status(500).json({ error: 'Could not cancel the event. Please try again.' });
  }
};
