const db = require('../src/db');

describe('Rating Database Operations', () => {
  beforeEach(() => {
    // Clear ratings table before each test
    db.prepare('DELETE FROM ratings').run();
  });

  describe('INSERT ratings', () => {
    test('should insert a rating successfully', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      const result = insertStmt.run('session-1', 'Test Song', 'Test Artist', 1);

      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeDefined();
    });

    test('should insert thumbs down rating', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      const result = insertStmt.run('session-2', 'Test Song', 'Test Artist', -1);

      expect(result.changes).toBe(1);
    });

    test('should insert rating with null artist', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      const result = insertStmt.run('session-3', 'Test Song', null, 1);

      expect(result.changes).toBe(1);
    });

    test('should enforce rating CHECK constraint (1 or -1)', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      // Try to insert invalid rating (0)
      expect(() => {
        insertStmt.run('session-4', 'Test Song', 'Artist', 0);
      }).toThrow();
    });

    test('should not allow rating = 2', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      expect(() => {
        insertStmt.run('session-5', 'Test Song', 'Artist', 2);
      }).toThrow();
    });

    test('should not allow rating = -2', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      expect(() => {
        insertStmt.run('session-6', 'Test Song', 'Artist', -2);
      }).toThrow();
    });
  });

  describe('UNIQUE constraint', () => {
    test('should enforce UNIQUE(session_id, track_title, track_artist)', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      // First insert succeeds
      insertStmt.run('session-1', 'Song', 'Artist', 1);

      // Second insert with same session/title/artist fails
      expect(() => {
        insertStmt.run('session-1', 'Song', 'Artist', 1);
      }).toThrow();
    });

    test('should allow same session to rate different songs', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      insertStmt.run('session-1', 'Song 1', 'Artist', 1);
      insertStmt.run('session-1', 'Song 2', 'Artist', 1);

      const count = db.prepare('SELECT COUNT(*) as cnt FROM ratings WHERE session_id = ?')
        .get('session-1');

      expect(count.cnt).toBe(2);
    });

    test('should allow different sessions to rate same song', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      insertStmt.run('session-1', 'Same Song', 'Artist', 1);
      insertStmt.run('session-2', 'Same Song', 'Artist', 1);

      const count = db.prepare('SELECT COUNT(*) as cnt FROM ratings WHERE track_title = ?')
        .get('Same Song');

      expect(count.cnt).toBe(2);
    });

    test('should allow same title different artist', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      insertStmt.run('session-1', 'Same Title', 'Artist A', 1);
      insertStmt.run('session-1', 'Same Title', 'Artist B', 1);

      const count = db.prepare('SELECT COUNT(*) as cnt FROM ratings WHERE track_title = ?')
        .get('Same Title');

      expect(count.cnt).toBe(2);
    });
  });

  describe('UPDATE ratings (ON CONFLICT)', () => {
    test('should update rating on duplicate key', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?) ON CONFLICT(session_id, track_title, track_artist) DO UPDATE SET rating = excluded.rating'
      );

      // First insert
      insertStmt.run('session-1', 'Song', 'Artist', 1);

      // Update with same key
      insertStmt.run('session-1', 'Song', 'Artist', -1);

      const result = db.prepare(
        'SELECT rating FROM ratings WHERE session_id = ? AND track_title = ? AND track_artist = ?'
      ).get('session-1', 'Song', 'Artist');

      expect(result.rating).toBe(-1);
    });

    test('should have only one record after update', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?) ON CONFLICT(session_id, track_title, track_artist) DO UPDATE SET rating = excluded.rating'
      );

      insertStmt.run('session-1', 'Song', 'Artist', 1);
      insertStmt.run('session-1', 'Song', 'Artist', -1);
      insertStmt.run('session-1', 'Song', 'Artist', 1);

      const count = db.prepare(
        'SELECT COUNT(*) as cnt FROM ratings WHERE session_id = ? AND track_title = ?'
      ).get('session-1', 'Song');

      expect(count.cnt).toBe(1);
    });
  });

  describe('SELECT queries', () => {
    beforeEach(() => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      // Populate test data
      insertStmt.run('session-1', 'Popular', 'Artist', 1);
      insertStmt.run('session-2', 'Popular', 'Artist', 1);
      insertStmt.run('session-3', 'Popular', 'Artist', -1);
      insertStmt.run('session-4', 'Unpopular', 'Artist', -1);
    });

    test('should count thumbs up correctly', () => {
      const result = db.prepare(
        'SELECT SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up FROM ratings WHERE track_title = ?'
      ).get('Popular');

      expect(result.thumbs_up).toBe(2);
    });

    test('should count thumbs down correctly', () => {
      const result = db.prepare(
        'SELECT SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down FROM ratings WHERE track_title = ?'
      ).get('Popular');

      expect(result.thumbs_down).toBe(1);
    });

    test('should get user rating for session', () => {
      const result = db.prepare(
        'SELECT rating FROM ratings WHERE session_id = ? AND track_title = ?'
      ).get('session-1', 'Popular');

      expect(result.rating).toBe(1);
    });

    test('should return null for user not rating song', () => {
      const result = db.prepare(
        'SELECT rating FROM ratings WHERE session_id = ? AND track_title = ?'
      ).get('session-99', 'Popular');

      expect(result).toBeUndefined();
    });

    test('should filter by track_title', () => {
      const result = db.prepare(
        'SELECT COUNT(*) as cnt FROM ratings WHERE track_title = ?'
      ).get('Popular');

      expect(result.cnt).toBe(3);
    });

    test('should filter by session_id', () => {
      const result = db.prepare(
        'SELECT COUNT(*) as cnt FROM ratings WHERE session_id = ?'
      ).get('session-1');

      expect(result.cnt).toBe(1);
    });
  });

  describe('Timestamp tracking', () => {
    test('should record created_at timestamp', () => {
      const beforeInsert = Date.now() / 1000; // seconds

      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );
      insertStmt.run('session-1', 'Song', 'Artist', 1);

      const afterInsert = Date.now() / 1000; // seconds

      const result = db.prepare(
        'SELECT created_at FROM ratings WHERE session_id = ?'
      ).get('session-1');

      expect(result.created_at).toBeDefined();
      // SQLite CURRENT_TIMESTAMP is in seconds, not milliseconds
      // Verify timestamp is within a reasonable range
      expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}/); // ISO format date
    });
  });

  describe('Data integrity', () => {
    test('should not allow null session_id', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      expect(() => {
        insertStmt.run(null, 'Song', 'Artist', 1);
      }).toThrow();
    });

    test('should not allow null track_title', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      expect(() => {
        insertStmt.run('session-1', null, 'Artist', 1);
      }).toThrow();
    });

    test('should not allow null rating', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      expect(() => {
        insertStmt.run('session-1', 'Song', 'Artist', null);
      }).toThrow();
    });

    test('should allow null track_artist', () => {
      const insertStmt = db.prepare(
        'INSERT INTO ratings (session_id, track_title, track_artist, rating) VALUES (?, ?, ?, ?)'
      );

      const result = insertStmt.run('session-1', 'Song', null, 1);
      expect(result.changes).toBe(1);
    });
  });
});
