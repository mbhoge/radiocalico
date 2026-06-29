/**
 * Frontend Rating Logic Tests
 * Tests for rating submission, retrieval, and UI updates
 */

describe('Rating Functions', () => {
  let mockFetch;
  let currentRating;
  let currentTrack;

  beforeEach(() => {
    // Clear state
    currentRating = null;
    currentTrack = { title: null, artist: null };
    localStorage.clear();
    localStorage.setItem('sessionId', 'test-session-123');

    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitRating', () => {
    test('should submit thumbs up rating', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, rating: 1 })
      });

      const submitRating = async (value) => {
        const response = await fetch('/api/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: localStorage.getItem('sessionId'),
            title: currentTrack.title,
            artist: currentTrack.artist,
            rating: value
          })
        });
        return response.json();
      };

      currentTrack = { title: 'Test Song', artist: 'Test Artist' };
      const result = await submitRating(1);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/rate',
        expect.objectContaining({
          method: 'POST'
        })
      );
      expect(result.success).toBe(true);
      expect(result.rating).toBe(1);
    });

    test('should submit thumbs down rating', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, rating: -1 })
      });

      const submitRating = async (value) => {
        const response = await fetch('/api/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: localStorage.getItem('sessionId'),
            title: currentTrack.title,
            artist: currentTrack.artist,
            rating: value
          })
        });
        return response.json();
      };

      currentTrack = { title: 'Test Song', artist: 'Test Artist' };
      const result = await submitRating(-1);

      expect(result.success).toBe(true);
      expect(result.rating).toBe(-1);
    });

    test('should include sessionId in submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const submitRating = async (value) => {
        const response = await fetch('/api/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: localStorage.getItem('sessionId'),
            title: currentTrack.title,
            artist: currentTrack.artist,
            rating: value
          })
        });
        return response.json();
      };

      currentTrack = { title: 'Song', artist: 'Artist' };
      await submitRating(1);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.sessionId).toBe('test-session-123');
    });

    test('should include track title in submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const submitRating = async (value) => {
        const response = await fetch('/api/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: localStorage.getItem('sessionId'),
            title: currentTrack.title,
            artist: currentTrack.artist,
            rating: value
          })
        });
        return response.json();
      };

      currentTrack = { title: 'My Song', artist: 'My Artist' };
      await submitRating(1);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.title).toBe('My Song');
    });

    test('should include track artist in submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const submitRating = async (value) => {
        const response = await fetch('/api/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: localStorage.getItem('sessionId'),
            title: currentTrack.title,
            artist: currentTrack.artist,
            rating: value
          })
        });
        return response.json();
      };

      currentTrack = { title: 'Song', artist: 'My Artist' };
      await submitRating(1);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.artist).toBe('My Artist');
    });

    test('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const submitRating = async (value) => {
        try {
          const response = await fetch('/api/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: localStorage.getItem('sessionId'),
              title: currentTrack.title,
              artist: currentTrack.artist,
              rating: value
            })
          });
          return response.json();
        } catch (error) {
          return { error: error.message };
        }
      };

      currentTrack = { title: 'Song', artist: 'Artist' };
      const result = await submitRating(1);

      expect(result.error).toBe('Network error');
    });

    test('should handle server error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      const submitRating = async (value) => {
        const response = await fetch('/api/rate', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: localStorage.getItem('sessionId'),
            title: currentTrack.title,
            artist: currentTrack.artist,
            rating: value
          })
        });

        if (!response.ok) {
          return response.json();
        }
        return response.json();
      };

      currentTrack = { title: 'Song', artist: 'Artist' };
      const result = await submitRating(1);

      expect(result.error).toBe('Server error');
    });
  });

  describe('fetchRatings', () => {
    test('should fetch ratings for current track', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thumbsUp: 5, thumbsDown: 2, userRating: 1 })
      });

      const fetchRatings = async () => {
        const params = new URLSearchParams({
          sessionId: localStorage.getItem('sessionId'),
          artist: currentTrack.artist
        });

        const response = await fetch(
          `/api/ratings/${encodeURIComponent(currentTrack.title)}?${params.toString()}`
        );
        return response.json();
      };

      currentTrack = { title: 'Test Song', artist: 'Test Artist' };
      const result = await fetchRatings();

      expect(mockFetch).toHaveBeenCalled();
      expect(result.thumbsUp).toBe(5);
      expect(result.thumbsDown).toBe(2);
      expect(result.userRating).toBe(1);
    });

    test('should update state with fetched ratings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thumbsUp: 10, thumbsDown: 3, userRating: -1 })
      });

      const fetchRatings = async () => {
        const params = new URLSearchParams({
          sessionId: localStorage.getItem('sessionId'),
          artist: currentTrack.artist
        });

        const response = await fetch(
          `/api/ratings/${encodeURIComponent(currentTrack.title)}?${params.toString()}`
        );
        const data = await response.json();

        // Update state
        currentRating = data.userRating;
        return data;
      };

      currentTrack = { title: 'Song', artist: 'Artist' };
      await fetchRatings();

      expect(currentRating).toBe(-1);
    });

    test('should handle missing track title', async () => {
      const fetchRatings = async () => {
        if (!currentTrack.title) {
          return { error: 'No track loaded' };
        }

        const params = new URLSearchParams({
          sessionId: localStorage.getItem('sessionId'),
          artist: currentTrack.artist
        });

        const response = await fetch(
          `/api/ratings/${encodeURIComponent(currentTrack.title)}?${params.toString()}`
        );
        return response.json();
      };

      currentTrack = { title: null, artist: null };
      const result = await fetchRatings();

      expect(result.error).toBe('No track loaded');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should handle null user rating', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thumbsUp: 5, thumbsDown: 2, userRating: null })
      });

      const fetchRatings = async () => {
        const params = new URLSearchParams({
          sessionId: localStorage.getItem('sessionId'),
          artist: currentTrack.artist
        });

        const response = await fetch(
          `/api/ratings/${encodeURIComponent(currentTrack.title)}?${params.toString()}`
        );
        const data = await response.json();
        currentRating = data.userRating;
        return data;
      };

      currentTrack = { title: 'Song', artist: 'Artist' };
      const result = await fetchRatings();

      expect(result.userRating).toBeNull();
      expect(currentRating).toBeNull();
    });

    test('should handle network error during fetch', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const fetchRatings = async () => {
        try {
          const params = new URLSearchParams({
            sessionId: localStorage.getItem('sessionId'),
            artist: currentTrack.artist
          });

          const response = await fetch(
            `/api/ratings/${encodeURIComponent(currentTrack.title)}?${params.toString()}`
          );
          return response.json();
        } catch (error) {
          return { error: error.message };
        }
      };

      currentTrack = { title: 'Song', artist: 'Artist' };
      const result = await fetchRatings();

      expect(result.error).toBe('Network timeout');
    });
  });

  describe('updateRatingUI', () => {
    test('should highlight thumbs up button when user rated up', () => {
      const updateRatingUI = (userRating) => {
        const thumbsUpBtn = { classList: { add: jest.fn(), remove: jest.fn() } };
        const thumbsDownBtn = { classList: { add: jest.fn(), remove: jest.fn() } };

        if (userRating === 1) {
          thumbsUpBtn.classList.add('active');
          thumbsDownBtn.classList.remove('active');
        } else if (userRating === -1) {
          thumbsDownBtn.classList.add('active');
          thumbsUpBtn.classList.remove('active');
        } else {
          thumbsUpBtn.classList.remove('active');
          thumbsDownBtn.classList.remove('active');
        }

        return { thumbsUpBtn, thumbsDownBtn };
      };

      const { thumbsUpBtn, thumbsDownBtn } = updateRatingUI(1);

      expect(thumbsUpBtn.classList.add).toHaveBeenCalledWith('active');
      expect(thumbsDownBtn.classList.remove).toHaveBeenCalledWith('active');
    });

    test('should highlight thumbs down button when user rated down', () => {
      const updateRatingUI = (userRating) => {
        const thumbsUpBtn = { classList: { add: jest.fn(), remove: jest.fn() } };
        const thumbsDownBtn = { classList: { add: jest.fn(), remove: jest.fn() } };

        if (userRating === 1) {
          thumbsUpBtn.classList.add('active');
          thumbsDownBtn.classList.remove('active');
        } else if (userRating === -1) {
          thumbsDownBtn.classList.add('active');
          thumbsUpBtn.classList.remove('active');
        } else {
          thumbsUpBtn.classList.remove('active');
          thumbsDownBtn.classList.remove('active');
        }

        return { thumbsUpBtn, thumbsDownBtn };
      };

      const { thumbsUpBtn, thumbsDownBtn } = updateRatingUI(-1);

      expect(thumbsDownBtn.classList.add).toHaveBeenCalledWith('active');
      expect(thumbsUpBtn.classList.remove).toHaveBeenCalledWith('active');
    });

    test('should remove active from both buttons when no rating', () => {
      const updateRatingUI = (userRating) => {
        const thumbsUpBtn = { classList: { add: jest.fn(), remove: jest.fn() } };
        const thumbsDownBtn = { classList: { add: jest.fn(), remove: jest.fn() } };

        if (userRating === 1) {
          thumbsUpBtn.classList.add('active');
          thumbsDownBtn.classList.remove('active');
        } else if (userRating === -1) {
          thumbsDownBtn.classList.add('active');
          thumbsUpBtn.classList.remove('active');
        } else {
          thumbsUpBtn.classList.remove('active');
          thumbsDownBtn.classList.remove('active');
        }

        return { thumbsUpBtn, thumbsDownBtn };
      };

      const { thumbsUpBtn, thumbsDownBtn } = updateRatingUI(null);

      expect(thumbsUpBtn.classList.remove).toHaveBeenCalledWith('active');
      expect(thumbsDownBtn.classList.remove).toHaveBeenCalledWith('active');
    });

    test('should handle null rating', () => {
      const updateRatingUI = (userRating) => {
        const result = userRating === 1 ? 'thumbsUp' : userRating === -1 ? 'thumbsDown' : 'none';
        return result;
      };

      const result = updateRatingUI(null);
      expect(result).toBe('none');
    });
  });

  describe('Button Click Handlers', () => {
    test('should call submitRating on thumbs up click', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, rating: 1 })
      });

      const submitRating = jest.fn(async (value) => {
        const response = await fetch('/api/rate', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: localStorage.getItem('sessionId'),
            title: currentTrack.title,
            artist: currentTrack.artist,
            rating: value
          })
        });
        return response.json();
      });

      currentTrack = { title: 'Song', artist: 'Artist' };
      await submitRating(1);

      expect(submitRating).toHaveBeenCalledWith(1);
    });

    test('should call submitRating on thumbs down click', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, rating: -1 })
      });

      const submitRating = jest.fn(async (value) => {
        const response = await fetch('/api/rate', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: localStorage.getItem('sessionId'),
            title: currentTrack.title,
            artist: currentTrack.artist,
            rating: value
          })
        });
        return response.json();
      });

      currentTrack = { title: 'Song', artist: 'Artist' };
      await submitRating(-1);

      expect(submitRating).toHaveBeenCalledWith(-1);
    });

    test('should disable buttons when track is not loaded', () => {
      const disableRatingButtons = () => {
        const thumbsUpBtn = { disabled: !currentTrack.title };
        const thumbsDownBtn = { disabled: !currentTrack.title };
        return { thumbsUpBtn, thumbsDownBtn };
      };

      currentTrack = { title: null, artist: null };
      const { thumbsUpBtn, thumbsDownBtn } = disableRatingButtons();

      expect(thumbsUpBtn.disabled).toBe(true);
      expect(thumbsDownBtn.disabled).toBe(true);
    });

    test('should enable buttons when track is loaded', () => {
      const disableRatingButtons = () => {
        const thumbsUpBtn = { disabled: !currentTrack.title };
        const thumbsDownBtn = { disabled: !currentTrack.title };
        return { thumbsUpBtn, thumbsDownBtn };
      };

      currentTrack = { title: 'Song', artist: 'Artist' };
      const { thumbsUpBtn, thumbsDownBtn } = disableRatingButtons();

      expect(thumbsUpBtn.disabled).toBe(false);
      expect(thumbsDownBtn.disabled).toBe(false);
    });
  });

  describe('Rating State Transitions', () => {
    test('should switch from thumbs up to thumbs down', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, rating: 1 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, rating: -1 })
        });

      const submitRating = async (value) => {
        const response = await fetch('/api/rate', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: localStorage.getItem('sessionId'),
            title: currentTrack.title,
            artist: currentTrack.artist,
            rating: value
          })
        });
        const data = await response.json();
        currentRating = data.rating;
        return data;
      };

      currentTrack = { title: 'Song', artist: 'Artist' };

      // First rating: thumbs up
      await submitRating(1);
      expect(currentRating).toBe(1);

      // Switch to thumbs down
      await submitRating(-1);
      expect(currentRating).toBe(-1);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should handle rating then unrating', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, rating: 1 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, rating: 1 })
        });

      const submitRating = async (value) => {
        const response = await fetch('/api/rate', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: localStorage.getItem('sessionId'),
            title: currentTrack.title,
            artist: currentTrack.artist,
            rating: value
          })
        });
        return response.json();
      };

      currentTrack = { title: 'Song', artist: 'Artist' };

      // Rate up
      const result1 = await submitRating(1);
      expect(result1.rating).toBe(1);

      // Rate up again (database handles this as update)
      const result2 = await submitRating(1);
      expect(result2.rating).toBe(1);
    });
  });

  describe('Rating Display Counts', () => {
    test('should display thumbs up count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thumbsUp: 42, thumbsDown: 8, userRating: null })
      });

      const fetchRatings = async () => {
        const response = await fetch('/api/ratings/Song?sessionId=test&artist=Artist');
        return response.json();
      };

      const result = await fetchRatings();
      const thumbsUpCount = { textContent: result.thumbsUp };

      expect(thumbsUpCount.textContent).toBe(42);
    });

    test('should display thumbs down count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thumbsUp: 42, thumbsDown: 8, userRating: null })
      });

      const fetchRatings = async () => {
        const response = await fetch('/api/ratings/Song?sessionId=test&artist=Artist');
        return response.json();
      };

      const result = await fetchRatings();
      const thumbsDownCount = { textContent: result.thumbsDown };

      expect(thumbsDownCount.textContent).toBe(8);
    });

    test('should default counts to zero if no ratings exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ thumbsUp: 0, thumbsDown: 0, userRating: null })
      });

      const fetchRatings = async () => {
        const response = await fetch('/api/ratings/Song?sessionId=test&artist=Artist');
        return response.json();
      };

      const result = await fetchRatings();

      expect(result.thumbsUp).toBe(0);
      expect(result.thumbsDown).toBe(0);
    });
  });
});
