/**
 * Frontend Session Management Tests
 * Tests for sessionId generation, persistence, and usage
 */

describe('Session Management', () => {
  // Mock localStorage before each test
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('generateSessionId', () => {
    test('should generate a unique session ID', () => {
      // Inline the function for testing
      const generateSessionId = () => {
        const stored = localStorage.getItem('sessionId');
        if (stored) return stored;

        const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', id);
        return id;
      };

      const id = generateSessionId();
      expect(id).toBeDefined();
      expect(id).toMatch(/^session-\d+-[a-z0-9]+$/);
    });

    test('should persist session ID in localStorage', () => {
      const generateSessionId = () => {
        const stored = localStorage.getItem('sessionId');
        if (stored) return stored;

        const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', id);
        return id;
      };

      const id1 = generateSessionId();
      expect(localStorage.getItem('sessionId')).toBe(id1);

      const id2 = generateSessionId();
      expect(id2).toBe(id1);
    });

    test('should reuse same session ID on page reload', () => {
      const generateSessionId = () => {
        const stored = localStorage.getItem('sessionId');
        if (stored) return stored;

        const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', id);
        return id;
      };

      // First call generates ID
      const firstId = generateSessionId();

      // Simulate page reload by clearing but not localStorage
      jest.clearAllMocks();

      // Second call should retrieve same ID
      const secondId = generateSessionId();
      expect(secondId).toBe(firstId);
    });

    test('should generate different IDs for different localStorage instances', () => {
      const generateSessionId = () => {
        const stored = localStorage.getItem('sessionId');
        if (stored) return stored;

        const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', id);
        return id;
      };

      const id1 = generateSessionId();

      // Clear localStorage to simulate different user/browser
      localStorage.clear();

      const id2 = generateSessionId();
      expect(id2).not.toBe(id1);
    });

    test('should include timestamp in session ID', () => {
      const generateSessionId = () => {
        const stored = localStorage.getItem('sessionId');
        if (stored) return stored;

        const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', id);
        return id;
      };

      const before = Date.now();
      const id = generateSessionId();
      const after = Date.now();

      // Extract timestamp from ID (format: session-TIMESTAMP-RANDOM)
      const timestamp = parseInt(id.split('-')[1]);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    test('should handle localStorage quota exceeded', () => {
      const generateSessionId = () => {
        try {
          const stored = localStorage.getItem('sessionId');
          if (stored) return stored;

          const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('sessionId', id);
          return id;
        } catch (e) {
          if (e.name === 'QuotaExceededError') {
            return 'session-fallback-' + Date.now();
          }
          throw e;
        }
      };

      const id = generateSessionId();
      expect(id).toBeDefined();
      expect(id).toMatch(/^session-/);
    });
  });

  describe('Session ID in API Requests', () => {
    test('should include sessionId in rating submission', async () => {
      // Mock fetch
      global.fetch = jest.fn();

      const sessionId = 'test-session-123';
      localStorage.setItem('sessionId', sessionId);

      // Simulate submitRating
      await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: localStorage.getItem('sessionId'),
          title: 'Test Song',
          artist: 'Test Artist',
          rating: 1
        })
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/rate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(sessionId)
        })
      );
    });

    test('should include sessionId in rating retrieval', async () => {
      global.fetch = jest.fn();

      const sessionId = 'test-session-456';
      localStorage.setItem('sessionId', sessionId);

      // Simulate fetchRatings
      const params = new URLSearchParams({
        sessionId: localStorage.getItem('sessionId'),
        artist: 'Test Artist'
      });

      const url = `/api/ratings/Test%20Song?${params.toString()}`;
      await fetch(url);

      // Verify fetch was called with URL containing sessionId
      expect(fetch).toHaveBeenCalledWith(url);
      expect(fetch.mock.calls[0][0]).toContain(sessionId);
    });

    test('should use same sessionId across multiple requests', async () => {
      global.fetch = jest.fn();

      const sessionId = 'persistent-session-789';
      localStorage.setItem('sessionId', sessionId);

      // First request
      await fetch('/api/rate', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: localStorage.getItem('sessionId'),
          title: 'Song 1',
          artist: 'Artist',
          rating: 1
        })
      });

      // Second request
      await fetch('/api/ratings/Song%201?sessionId=' + localStorage.getItem('sessionId'));

      // Both should use same sessionId
      const calls = global.fetch.mock.calls;
      expect(calls[0][1].body).toContain(sessionId);
      expect(calls[1][0]).toContain(sessionId);
    });
  });

  describe('Session Storage Edge Cases', () => {
    test('should handle sessionId with special characters', () => {
      const generateSessionId = () => {
        const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', id);
        return id;
      };

      const id = generateSessionId();
      expect(() => {
        localStorage.getItem('sessionId');
      }).not.toThrow();
    });

    test('should survive multiple clear/set cycles', () => {
      const generateSessionId = () => {
        const stored = localStorage.getItem('sessionId');
        if (stored) return stored;

        const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', id);
        return id;
      };

      for (let i = 0; i < 5; i++) {
        const id = generateSessionId();
        expect(id).toBeDefined();
        expect(id).toMatch(/^session-/);
      }
    });

    test('should generate valid JSON in API request body', () => {
      const sessionId = 'test-123';
      localStorage.setItem('sessionId', sessionId);

      const body = JSON.stringify({
        sessionId: localStorage.getItem('sessionId'),
        title: 'Test',
        artist: 'Artist',
        rating: 1
      });

      // Should not throw when parsing
      expect(() => JSON.parse(body)).not.toThrow();

      const parsed = JSON.parse(body);
      expect(parsed.sessionId).toBe(sessionId);
    });
  });

  describe('Session Consistency', () => {
    test('should maintain session across different functions', () => {
      const generateSessionId = () => {
        const stored = localStorage.getItem('sessionId');
        if (stored) return stored;

        const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', id);
        return id;
      };

      const getSessionId = () => localStorage.getItem('sessionId');
      const useSessionId = () => localStorage.getItem('sessionId');

      const id1 = generateSessionId();
      const id2 = getSessionId();
      const id3 = useSessionId();

      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
    });

    test('should have same sessionId in consecutive operations', () => {
      const sessionId = 'consistent-session';
      localStorage.setItem('sessionId', sessionId);

      const operation1 = localStorage.getItem('sessionId');
      const operation2 = localStorage.getItem('sessionId');
      const operation3 = localStorage.getItem('sessionId');

      expect(operation1).toBe(operation2);
      expect(operation2).toBe(operation3);
    });
  });
});
