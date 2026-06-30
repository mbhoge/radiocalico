const express = require('express');
const { pool } = require('./db-postgres');

const router = express.Router();

let nowPlaying = { title: null, artist: null, startedAt: null };

router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.get('/now-playing', (req, res) => {
  res.json(nowPlaying);
});

router.post('/now-playing', async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Archive the track that was playing before this one
    if (nowPlaying.title) {
      await pool.query(
        'INSERT INTO played_tracks (title, artist, played_at) VALUES ($1, $2, $3)',
        [nowPlaying.title, nowPlaying.artist || null, nowPlaying.startedAt || new Date().toISOString()]
      );
    }

    nowPlaying = {
      title,
      artist: artist || null,
      startedAt: new Date().toISOString()
    };
    res.json(nowPlaying);
  } catch (err) {
    console.error('Error setting now playing:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recently-played', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, artist, played_at FROM played_tracks ORDER BY played_at DESC LIMIT 20'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recently played:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'email already exists' });
    }
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rating endpoints
router.post('/rate', async (req, res) => {
  try {
    const { sessionId, title, artist, rating } = req.body;

    if (!sessionId || !title || typeof rating !== 'number') {
      return res.status(400).json({ error: 'sessionId, title, and rating are required' });
    }

    if (![1, -1].includes(rating)) {
      return res.status(400).json({ error: 'rating must be 1 or -1' });
    }

    const result = await pool.query(
      `INSERT INTO ratings (session_id, track_title, track_artist, rating)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id, track_title, track_artist)
       DO UPDATE SET rating = $4, created_at = CURRENT_TIMESTAMP
       RETURNING id, session_id, track_title, track_artist, rating, created_at`,
      [sessionId, title, artist || null, rating]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error submitting rating:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ratings/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const { sessionId, artist } = req.query;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = await pool.query(
      `SELECT
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
        SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down,
        (SELECT rating FROM ratings
         WHERE track_title = $1 AND session_id = $2 AND track_artist = $3 LIMIT 1) as user_rating
       FROM ratings
       WHERE track_title = $1 AND track_artist = $3`,
      [title, sessionId || null, artist || null]
    );

    const row = result.rows[0];
    res.json({
      thumbsUp: parseInt(row.thumbs_up) || 0,
      thumbsDown: parseInt(row.thumbs_down) || 0,
      userRating: row.user_rating || null
    });
  } catch (err) {
    console.error('Error fetching ratings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
