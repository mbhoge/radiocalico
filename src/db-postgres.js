const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'radiocalico',
  user: process.env.DB_USER || 'radiocalico',
  password: process.env.DB_PASSWORD || 'radiocalico',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function initializeSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS played_tracks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        track_title TEXT NOT NULL,
        track_artist TEXT,
        rating INTEGER NOT NULL CHECK (rating IN (1, -1)),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, track_title, track_artist)
      );

      CREATE INDEX IF NOT EXISTS idx_ratings_track ON ratings(track_title, track_artist);
      CREATE INDEX IF NOT EXISTS idx_played_tracks_played_at ON played_tracks(played_at DESC);
    `);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initializeSchema,
  query: (text, params) => pool.query(text, params),
};
