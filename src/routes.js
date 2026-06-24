const express = require('express');
const db = require('./db');

const router = express.Router();

let nowPlaying = { title: null, artist: null, startedAt: null };

const insertTrack  = db.prepare('INSERT INTO played_tracks (title, artist, played_at) VALUES (?, ?, ?)');
const recentTracks = db.prepare('SELECT id, title, artist, played_at FROM played_tracks ORDER BY played_at DESC LIMIT 20');

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
