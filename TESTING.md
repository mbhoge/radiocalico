# Testing Framework - Radiocalico

## Overview

This document describes the comprehensive testing framework for Radiocalico, covering unit tests, integration tests, and Docker deployment validation. The framework supports both development (SQLite) and production (PostgreSQL) environments.

### Test Coverage

- **Backend API Tests**: Express route handlers, request validation, error handling
- **Database Tests**: SQLite (dev) and PostgreSQL (prod) operations
- **Frontend Tests**: Browser-based rating system, session management
- **Integration Tests**: Full API workflows, database persistence
- **Docker Tests**: Container build validation, multi-service orchestration
- **CI/CD Tests**: Automated testing on push/PR to master/main/develop

## Phase 1: Backend Unit Tests ✅ COMPLETE

### Test Files

#### `tests/routes.rating.test.js` (20 tests)
Tests for Express API endpoints: `/api/rate` and `/api/ratings/:title`

**POST /api/rate Tests (7 tests):**
- Valid rating submission (thumbs up: 1, thumbs down: -1)
- Rating persistence to SQLite database
- Duplicate rating handling (updates existing, doesn't create duplicate)
- Missing field validation (sessionId, title, rating)
- Invalid rating rejection (values other than 1 or -1)
- Null artist handling

**GET /api/ratings/:title Tests (8 tests):**
- Correct thumbs up count aggregation
- Correct thumbs down count aggregation
- User's current rating retrieval
- Null return for unrated tracks
- Non-existent track handling (returns 0 counts)
- Multi-session rating aggregation
- URL-encoded title handling
- Missing query parameter handling

**Constraint Tests (5 tests):**
- UNIQUE constraint enforcement on (session_id, track_title, track_artist)
- Constraint violation proper error handling
- Different sessions allowed to rate same song
- Same session allowed to rate different songs
- Same title different artists allowed

#### `tests/db.rating.test.js` (23 tests)
Tests for SQLite database operations on the ratings table

**INSERT Operations (7 tests):**
- Successful rating insertion
- Thumbs up insertion (rating = 1)
- Thumbs down insertion (rating = -1)
- Null artist handling in INSERT
- CHECK constraint validation for rating values
- Invalid rating rejection (0, 2, -2)

**UNIQUE Constraint (4 tests):**
- UNIQUE(session_id, track_title, track_artist) enforcement
- Same session, different songs allowed
- Different sessions, same song allowed
- Same title, different artists allowed

**UPDATE/Upsert Operations (3 tests):**
- ON CONFLICT update behavior (upsert)
- Single record maintained after upsert
- Rating value change tracking

**SELECT Queries (6 tests):**
- Thumbs up count aggregation accuracy
- Thumbs down count aggregation accuracy
- Individual user rating retrieval
- Non-existent entry handling
- Filter by track_title
- Filter by session_id

**Data Integrity (3 tests):**
- Null validation for required fields (session_id, title, rating)
- Null artist allowed
- Timestamp tracking in created_at column

### Coverage Report

```
Database layer (db.js):     100% ✓
Routes (routes.js):         57%
Overall:                    38.67%
```

**Coverage goals for Phase 2:** 70%+ global coverage

### Running Tests

```bash
# Run all tests
npm test

# Run rating system tests
npm run test:rating

# Watch mode (auto-rerun on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/routes.rating.test.js
```

### Test Dependencies

- **jest**: Modern testing framework with zero configuration
- **supertest**: HTTP assertions for Express routes
- **sinon**: Mocking and spying utilities
- **@testing-library/dom**: DOM testing utilities

### CI/CD Integration

GitHub Actions automatically runs tests on:
- Every push to `master`, `main`, `develop`
- Every pull request
- Test runs on Node.js 18.x and 20.x

Tests run in this order:
1. Install build dependencies
2. Unit tests (rating system)
3. Coverage report generation
4. Server startup validation
5. API endpoint smoke tests (dev stack)
6. Docker build validation
7. Production stack tests

---

## Database Testing Strategy

### Development Environment (SQLite)

SQLite is used for **fast, in-memory testing** without external dependencies.

**Test Setup:**
```bash
# Tests use in-memory SQLite by default
npm test

# Or with Docker container
docker-compose exec radiocalico-dev npm test
```

**Advantages:**
- Fast (in-memory)
- No setup required
- Easy to reset between tests
- Suitable for CI/CD

**Database Reset:**
Each test file gets a fresh database via the Jest setup hook:
- `tests/setup.js` initializes schema
- Tests are isolated (separate connections)
- After tests complete, database is discarded

### Production Environment (PostgreSQL)

PostgreSQL testing validates the **production database layer**.

**Test Approaches:**

1. **Docker Compose Testing:**
   ```bash
   # Start PostgreSQL service
   docker-compose up -d radiocalico-db-postgres
   
   # Run tests against PostgreSQL
   DB_HOST=localhost DB_PORT=5432 DB_NAME=test DB_USER=postgres npm test
   
   # Clean up
   docker-compose down
   ```

2. **GitHub Actions Testing:**
   - CI/CD runs a PostgreSQL service
   - Tests run against both SQLite and PostgreSQL
   - Schema validation for both databases

**Test Coverage for PostgreSQL:**
- Connection pooling behavior
- Async query handling
- UNIQUE constraint enforcement
- Transaction handling
- Connection timeout recovery

### Dual-Database Testing

**File Structure:**
```
tests/
├── setup.js                 # Jest setup (SQLite in-memory)
├── routes.rating.test.js    # Works with both SQLite & PostgreSQL
├── db.rating.test.js        # SQLite-specific tests
├── db.postgres.test.js      # PostgreSQL-specific tests (future)
├── frontend/
│   ├── rating.test.js
│   └── session.test.js
└── integration/
    └── rating-flow.test.js
```

**Running Tests:**

```bash
# Development (SQLite in-memory)
npm test

# Development with coverage
npm run test:coverage

# Watch mode (auto-rerun)
npm run test:watch

# Backend tests only
npm run test:backend

# Rating system tests
npm run test:rating

# Test against PostgreSQL (manual)
DB_HOST=localhost npm test -- --testNamePattern="postgres"

# Docker: Test dev stack
docker-compose exec radiocalico-dev npm test

# Docker: Test prod stack (requires running services)
docker-compose exec radiocalico-api npm test
```

**Continuous Integration:**

GitHub Actions workflow (`.github/workflows/ci.yml`):
1. Installs dependencies
2. Runs unit tests (SQLite)
3. Generates coverage report
4. Validates development server (SQLite + Express)
5. Tests API endpoints against dev server
6. Validates Docker builds
7. (Future) Tests production stack with PostgreSQL

### Database Schema Consistency

Both SQLite and PostgreSQL use the **same schema** to ensure consistency:

**tables:**
- `users` - User accounts
- `played_tracks` - Track playback history
- `ratings` - User ratings with UNIQUE constraint

**Constraints:**
- UNIQUE(session_id, track_title, track_artist) on ratings
- CHECK(rating IN (1, -1)) on ratings
- NOT NULL on required fields

**Testing the Schema:**
```bash
# Verify SQLite schema
sqlite3 db/radiocalico.db ".schema"

# Verify PostgreSQL schema
docker-compose exec radiocalico-db-postgres psql -U radiocalico -d radiocalico -c "\\dt"
```

---

## Phase 2: Frontend Unit Tests (Planned)

### Test Files

#### `tests/frontend/rating.test.js` (Est. 12 tests)
Tests for rating button logic and state management

**submitRating() Tests:**
- POST request with correct sessionId, title, artist, rating
- Error handling on network failure
- UI update on success

**fetchRatings() Tests:**
- GET request with correct query parameters
- Response parsing and state update
- Error handling

**Button Logic Tests:**
- Click handlers correctly call submitRating()
- .active class toggled on button state change
- Can switch ratings (up→down, down→up)

**UI State Tests:**
- Rating counts displayed correctly
- Button disabled state before track loads
- User's rating highlighted

#### `tests/frontend/session.test.js` (Est. 8 tests)
Tests for session management

**Session ID Tests:**
- Generated on first load
- Persisted in localStorage
- Reused across page reloads
- Included in all API requests

**localStorage Tests:**
- Correct key/value storage
- Persistence across sessions
- Mockable for unit tests

### Frontend Testing Tools

- **jest**: Testing framework
- **@testing-library/dom**: DOM testing utilities
- **nock**: HTTP mocking for fetch()
- **localStorage-mock**: localStorage mocking

### Frontend Coverage Target

- Rating functions: 85%+
- Session management: 90%+

## Phase 3: Integration Tests (Planned)

### Test Files

#### `tests/integration/rating-flow.test.js` (Est. 10 tests)

**Complete Flow Tests:**
- Page loads with track
- User clicks rating button
- POST request sent to /api/rate
- Database updated
- GET request sent to /api/ratings/:title
- UI updates with counts
- Rating button shows as active

**Multi-User Scenarios:**
- Session A rates song (thumbs up)
- Session B rates same song (thumbs down)
- Both sessions see correct aggregated counts
- Rating change propagates correctly

**Edge Cases:**
- Rapid rating changes
- Network timeout recovery
- Same session changes rating multiple times
- Track change resets rating UI

## Phase 4: E2E Tests (Planned)

### Test Files

#### `tests/e2e/rating.e2e.test.js`

**Real Browser Tests (Playwright/Cypress):**
- Load page in Chrome, Firefox, Safari
- Click rating button
- Observe UI update
- Verify database state via API
- Refresh page, rating persists
- localStorage behavior verification

## Test Coverage Strategy

### Coverage Threshold

Target coverage thresholds (enforced by Jest):

```
Statements:  70%+
Branches:    70%+
Functions:   70%+
Lines:       70%+
```

### Coverage Areas Priority

1. **High Priority** (90%+):
   - Rating submission logic
   - Constraint enforcement
   - Data aggregation queries

2. **Medium Priority** (80%+):
   - Error handling paths
   - Edge case handling
   - Session management

3. **Nice to Have** (70%+):
   - Server initialization
   - Branding asset serving
   - Static file serving

## Best Practices

### Test Organization

- One describe block per feature/function
- Clear test names describing expected behavior
- Arrange-Act-Assert pattern
- Isolated tests (no dependencies between tests)
- Shared setup in beforeEach/beforeAll

### Mocking Strategy

- Mock external dependencies (database, HTTP)
- Use test database for integration tests
- Mock time for timestamp tests
- Spy on methods for behavior verification

### Error Testing

- Test both success and failure paths
- Verify error messages are helpful
- Test edge cases (null, empty, invalid)
- Test constraint violations

## Running Tests in CI/CD

GitHub Actions CI will:

1. **Install Dependencies**
   ```bash
   npm ci
   ```

2. **Run Unit Tests**
   ```bash
   npm test -- tests/routes.rating.test.js tests/db.rating.test.js
   ```

3. **Generate Coverage**
   ```bash
   npm run test:coverage
   ```

4. **Run API Tests**
   ```bash
   # Start server, run smoke tests
   ```

Failing tests will block PR merge.

## Adding New Tests

### Template for Route Tests

```javascript
describe('API Endpoint', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', routes);
  });

  beforeEach(() => {
    db.prepare('DELETE FROM ratings').run();
  });

  test('should handle valid request', async () => {
    const res = await request(app)
      .post('/api/rate')
      .send({ /* test data */ });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ /* expected */ });
  });
});
```

### Template for Database Tests

```javascript
describe('Database Operation', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM ratings').run();
  });

  test('should insert data correctly', () => {
    const stmt = db.prepare('INSERT INTO ratings (...) VALUES (...)');
    const result = stmt.run(/* data */);

    expect(result.changes).toBe(1);
    
    // Verify inserted data
    const row = db.prepare('SELECT * FROM ratings WHERE ...').get();
    expect(row).toEqual({ /* expected */ });
  });
});
```

## Troubleshooting

### Test Failures

1. **Database state issues**: Check beforeEach cleanup
2. **Timing issues**: Use jest.useFakeTimers() for time-dependent tests
3. **Network mocking**: Verify Nock setup for HTTP tests
4. **Type mismatches**: Verify data types match database schema

### Coverage Issues

Run coverage report to identify untested paths:

```bash
npm run test:coverage
```

Look for:
- Red lines (untested)
- Yellow lines (partially covered)
- Branch numbers in "Uncovered Line #s"

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [SQLite Testing Best Practices](https://www.sqlite.org/testing.html)

## Next Steps

1. Phase 2: Implement frontend unit tests
2. Reach 70%+ coverage threshold
3. Phase 3: Add integration tests
4. Phase 4: Add E2E tests with Playwright
5. Continuous improvement based on test failures
