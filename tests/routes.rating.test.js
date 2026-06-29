const request = require('supertest');
const express = require('express');
const routes = require('../src/routes');
const db = require('../src/db');

describe('Rating API Endpoints', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', routes);
  });

  // Clean up database before each test
  beforeEach(() => {
    // Clear ratings table
    db.prepare('DELETE FROM ratings').run();
  });

  describe('POST /api/rate', () => {
    test('should submit a valid rating (thumbs up)', async () => {
      const res = await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-1',
          title: 'Test Song',
          artist: 'Test Artist',
          rating: 1
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rating).toBe(1);
    });

    test('should submit a valid rating (thumbs down)', async () => {
      const res = await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-2',
          title: 'Test Song',
          artist: 'Test Artist',
          rating: -1
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rating).toBe(-1);
    });

    test('should persist rating to database', async () => {
      await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-3',
          title: 'Persistent Song',
          artist: 'Artist',
          rating: 1
        });

      const result = db.prepare(
        'SELECT rating FROM ratings WHERE session_id = ? AND track_title = ?'
      ).get('session-3', 'Persistent Song');

      expect(result).toBeDefined();
      expect(result.rating).toBe(1);
    });

    test('should update rating on duplicate submission', async () => {
      // First submission: thumbs up
      await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-4',
          title: 'Updated Song',
          artist: 'Artist',
          rating: 1
        });

      // Second submission: thumbs down (should update, not create duplicate)
      await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-4',
          title: 'Updated Song',
          artist: 'Artist',
          rating: -1
        });

      // Verify only one entry exists and it's updated
      const result = db.prepare(
        'SELECT rating FROM ratings WHERE session_id = ? AND track_title = ?'
      ).get('session-4', 'Updated Song');

      expect(result).toBeDefined();
      expect(result.rating).toBe(-1);

      // Count total entries for this session/track combo
      const count = db.prepare(
        'SELECT COUNT(*) as cnt FROM ratings WHERE session_id = ? AND track_title = ?'
      ).get('session-4', 'Updated Song');

      expect(count.cnt).toBe(1); // Only 1 entry, not 2
    });

    test('should reject missing sessionId', async () => {
      const res = await request(app)
        .post('/api/rate')
        .send({
          title: 'Test',
          artist: 'Artist',
          rating: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should reject missing title', async () => {
      const res = await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-1',
          artist: 'Artist',
          rating: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should reject invalid rating (0)', async () => {
      const res = await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-1',
          title: 'Test',
          artist: 'Artist',
          rating: 0
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should reject invalid rating (2)', async () => {
      const res = await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-1',
          title: 'Test',
          artist: 'Artist',
          rating: 2
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should reject invalid rating (-2)', async () => {
      const res = await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-1',
          title: 'Test',
          artist: 'Artist',
          rating: -2
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should handle null artist', async () => {
      const res = await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-5',
          title: 'Test Song',
          artist: null,
          rating: 1
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/ratings/:title', () => {
    beforeEach(() => {
      // Set up test data
      db.prepare('DELETE FROM ratings').run();

      // Session 1: thumbs up
      db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      ).run('session-1', 'Popular Song', 'Artist', 1);

      // Session 2: thumbs up
      db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      ).run('session-2', 'Popular Song', 'Artist', 1);

      // Session 3: thumbs down
      db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      ).run('session-3', 'Popular Song', 'Artist', -1);

      // Session 4: different song
      db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      ).run('session-4', 'Different Song', 'Artist', 1);
    });

    test('should return correct thumbs up count', async () => {
      const res = await request(app)
        .get('/api/ratings/Popular%20Song')
        .query({ sessionId: 'session-1', artist: 'Artist' });

      expect(res.status).toBe(200);
      expect(res.body.thumbsUp).toBe(2);
    });

    test('should return correct thumbs down count', async () => {
      const res = await request(app)
        .get('/api/ratings/Popular%20Song')
        .query({ sessionId: 'session-1', artist: 'Artist' });

      expect(res.status).toBe(200);
      expect(res.body.thumbsDown).toBe(1);
    });

    test('should return user\'s rating', async () => {
      const res = await request(app)
        .get('/api/ratings/Popular%20Song')
        .query({ sessionId: 'session-1', artist: 'Artist' });

      expect(res.status).toBe(200);
      expect(res.body.userRating).toBe(1);
    });

    test('should return null for user rating if not rated', async () => {
      const res = await request(app)
        .get('/api/ratings/Popular%20Song')
        .query({ sessionId: 'session-99', artist: 'Artist' });

      expect(res.status).toBe(200);
      expect(res.body.userRating).toBeNull();
    });

    test('should return 0 counts for non-existent song', async () => {
      const res = await request(app)
        .get('/api/ratings/Nonexistent%20Song')
        .query({ sessionId: 'session-1', artist: 'Artist' });

      expect(res.status).toBe(200);
      expect(res.body.thumbsUp).toBe(0);
      expect(res.body.thumbsDown).toBe(0);
      expect(res.body.userRating).toBeNull();
    });

    test('should aggregate ratings from multiple sessions', async () => {
      const res = await request(app)
        .get('/api/ratings/Popular%20Song')
        .query({ sessionId: 'session-2', artist: 'Artist' });

      expect(res.status).toBe(200);
      expect(res.body.thumbsUp).toBe(2); // session-1 and session-2
      expect(res.body.thumbsDown).toBe(1); // session-3
    });

    test('should handle URL-encoded track title', async () => {
      db.prepare('DELETE FROM ratings').run();
      db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      ).run('session-1', 'Song With Spaces', 'Artist', 1);

      const res = await request(app)
        .get('/api/ratings/Song%20With%20Spaces')
        .query({ sessionId: 'session-1', artist: 'Artist' });

      expect(res.status).toBe(200);
      expect(res.body.thumbsUp).toBe(1);
    });

    test('should handle missing artist in query', async () => {
      const res = await request(app)
        .get('/api/ratings/Popular%20Song')
        .query({ sessionId: 'session-1' });

      expect(res.status).toBe(200);
      // Should still return results (artist treated as null)
      expect(res.body).toHaveProperty('thumbsUp');
    });
  });

  describe('Rating constraint validation', () => {
    test('should enforce UNIQUE constraint on (session_id, track_title, track_artist)', async () => {
      // First insert
      await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-constraint',
          title: 'Unique Test',
          artist: 'Artist',
          rating: 1
        });

      // Second insert with same session/title/artist - should update
      const res = await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-constraint',
          title: 'Unique Test',
          artist: 'Artist',
          rating: -1
        });

      // Should succeed (upsert behavior)
      expect(res.status).toBe(200);

      // Verify only one record exists
      const count = db.prepare(
        'SELECT COUNT(*) as cnt FROM ratings WHERE session_id = ? AND track_title = ? AND track_artist = ?'
      ).get('session-constraint', 'Unique Test', 'Artist');

      expect(count.cnt).toBe(1);
    });

    test('should allow different sessions to rate same song', async () => {
      await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-a',
          title: 'Multi Session',
          artist: 'Artist',
          rating: 1
        });

      await request(app)
        .post('/api/rate')
        .send({
          sessionId: 'session-b',
          title: 'Multi Session',
          artist: 'Artist',
          rating: -1
        });

      const count = db.prepare(
        'SELECT COUNT(*) as cnt FROM ratings WHERE track_title = ?'
      ).get('Multi Session');

      expect(count.cnt).toBe(2);
    });
  });
});
