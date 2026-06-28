const express = require('express');
const db = require('./db');

const router = express.Router();

let nowPlaying = { title: null, artist: null, startedAt: null };

const insertTrack   = db.prepare('INSERT INTO played_tracks (title, artist, played_at) VALUES (?, ?, ?)');
const recentTracks  = db.prepare('SELECT id, title, artist, played_at FROM played_tracks ORDER BY played_at DESC LIMIT 20');
const submitRating  = db.prepare('INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?) ON CONFLICT DO UPDATE SET rating = excluded.rating');
const getRatings    = db.prepare('SELECT SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up, SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down, (SELECT rating FROM ratings WHERE session_id = ? AND track_title = ? AND track_artist IS ?) as user_rating FROM ratings WHERE track_title = ? AND track_artist IS ?');
const getUserRating = db.prepare('SELECT rating FROM ratings WHERE session_id = ? AND track_title = ? AND track_artist IS ?');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.get('/now-playing', (req, res) => {
  res.json(nowPlaying);
});

router.post('/now-playing', (req, res) => {
  const { title, artist } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  // Archive the track that was playing before this one
  if (nowPlaying.title) {
    insertTrack.run(nowPlaying.title, nowPlaying.artist || null, nowPlaying.startedAt || new Date().toISOString());
  }

  nowPlaying = { title, artist: artist || null, startedAt: new Date().toISOString() };
  res.json(nowPlaying);
});

router.get('/recently-played', (req, res) => {
  res.json(recentTracks.all());
});

router.post('/rate', (req, res) => {
  const { sessionId, title, artist, rating } = req.body;
  if (!sessionId || !title || ![1, -1].includes(rating)) {
    return res.status(400).json({ error: 'sessionId, title, and rating (1 or -1) required' });
  }

  try {
    submitRating.run(sessionId, title, artist || null, rating);
    res.json({ success: true, rating });
  } catch (err) {
    res.status(500).json({ error: 'Rating submission failed' });
  }
});

router.get('/ratings/:title', (req, res) => {
  const { title } = req.params;
  const { sessionId, artist } = req.query;

  const result = getRatings.get(sessionId, title, artist || null, title, artist || null);
  const thumbsUp = result?.thumbs_up || 0;
  const thumbsDown = result?.thumbs_down || 0;
  const userRating = result?.user_rating || null;

  res.json({ thumbsUp, thumbsDown, userRating });
});

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.post('/users', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  try {
    const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
    res.status(201).json({ id: result.lastInsertRowid, name, email });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'email already exists' });
    }
    throw err;
  }
});

module.exports = router;
