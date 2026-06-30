# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

### With Docker (Recommended)

```bash
# Production container (optimized, 198MB)
docker-compose up radiocalico-prod
# Server at http://localhost:3001

# Development container (with nodemon hot-reload)
docker-compose up radiocalico-dev
# Server at http://localhost:3000

# Both simultaneously
docker-compose up
# Dev: 3000 | Prod: 3001

# View logs
docker-compose logs -f radiocalico-dev
```

### Without Docker (Local Development)

```bash
# Install dependencies
npm install

# Run the server (listens on http://localhost:3000)
node src/server.js

# Development with auto-reload (requires nodemon)
npm run dev

# Set a test track (required for rating feature to work)
curl -X POST http://localhost:3000/api/now-playing \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Song","artist":"Test Artist"}'
```

## Project Structure

```
src/              Backend Node.js/Express code
  ├── server.js       Express app, HLS/branding/static routes
  ├── routes.js       API endpoints (/api/*)
  ├── db.js           SQLite setup and schema
  └── hls-stream.js   HLS segment generation with ID3 metadata

public/           Frontend assets (served as static files)
  ├── index.html      Player UI, ~400 lines (markup + JS)
  └── style.css       Styling, ~700 lines (animations, layout, responsive)

db/               Data storage
  └── radiocalico.db  SQLite database (auto-created)

Docker/           Container configuration
  ├── Dockerfile          Legacy production image (SQLite + Express)
  ├── Dockerfile.prod     Production image (PostgreSQL API-only)
  ├── Dockerfile.dev      Development image (with nodemon, 670MB)
  ├── docker-compose.yml  Orchestrates dev & prod services
  ├── nginx.conf          nginx reverse proxy config (production)
  └── .dockerignore       Excludes files from Docker build context

Root files:
  ├── CLAUDE.md       This guidance document
  ├── README.md       User-facing project description
  ├── package.json    Dependencies and scripts
  ├── RadioCalicoLogoTM.png      Branding asset (served at /logo.png)
  ├── RadioCalicoLayout.png       Reference design (served at /layout.png)
  └── RadioCalico_Style_Guide.txt Branding guidelines
```

## Architecture Overview

Radiocalico is a live radio streaming application with a rating system. The backend generates HLS streams with embedded ID3 metadata, serves a REST API for ratings and track management, and persists data in SQLite. The frontend streams audio via HLS.js, displays track metadata via ID3 tags or API polling, and manages user ratings per session.

### Deployment Architecture

The project includes a production-grade Docker setup with separate stacks for dev and prod:

**Development (SQLite + Express):**
- Single Node.js container with SQLite
- Nodemon for hot-reload on file changes
- Express serves API and static files
- Volumes for local file binding

**Production (PostgreSQL + nginx):**
- PostgreSQL database (separate container)
- Node.js API backend (API-only, no static serving)
- nginx web server (reverse proxy, static caching, compression)
- Health checks on all services
- Auto-restart policy for resilience
- Separation of concerns: web server vs. API server

### Data Flow

1. **Track Setting**: Admin/backend sets current track via `POST /api/now-playing`
2. **HLS Generation**: Server generates MPEG-TS segments with embedded ID3 metadata (title, artist)
3. **Stream Playback**: Frontend plays `/live.m3u8` using HLS.js
4. **Metadata Extraction**: Frontend parses ID3 tags from segments OR polls `/api/now-playing` every 15 seconds as fallback
5. **Rating Submission**: User clicks thumbs up/down → `POST /api/rate` with sessionId, title, artist, rating (1 or -1)
6. **Rating Display**: Frontend fetches counts via `GET /api/ratings/:title?sessionId=X&artist=Y`

## Style Guide
- Text verion of the styling guide for the webpage is at the /home/marcus/radiocalico/RadioCalico_Style_Guide.txt file. It includes color palette, font sizes, and layout rules.
- The Radio Calico logo if at /home/mbhoge/radicalico/RadioCalico_Logo.png. It is a vector image and can be scaled to any size without losing quality. Use it in the header and footer of the webpage, and in promotional materials.

## Key Components

### Backend

**`src/server.js`** — Express app entry point
- Initializes HLS stream generator and routes
- Serves static files from `public/` (index.html, style.css, cover.jpg, logo.png)
- Registers HLS endpoints (`/live.m3u8`, `/segment-*.ts`)
- Registers branding asset endpoints (`/logo.png`, `/layout.png`)
- Mounts API routes at `/api`

**`src/hls-stream.js`** — HLS segment generation with ID3 metadata
- `generateID3Metadata(title, artist)`: Creates ID3v2.3 frames (TIT2, TPE1)
- `setTrack(title, artist)`: Updates metadata for next segments (called when `/api/now-playing` is posted)
- `generateSegment(index)`: Creates MPEG-TS segment with embedded ID3 header and placeholder TS packets
- `generateManifest()`: Returns m3u8 playlist referencing segment URLs
- Segments include minimal valid MPEG-TS structure; metadata is in ID3 header at segment start

**`src/routes.js`** — REST API handlers
- `GET /health` — Server status
- `GET|POST /now-playing` — Get/set current track (syncs to HLS stream metadata)
- `POST /rate` — Submit rating (1 for thumbs up, -1 for thumbs down)
- `GET /ratings/:title` — Fetch rating summary for a track
- `GET|POST /users` — User management (legacy)
- `GET /recently-played` — List recently played tracks (from database)

**`src/db.js`** — SQLite connection and schema
- Tables: `users`, `played_tracks`, `ratings`
- `ratings` table has unique constraint on (session_id, track_title, track_artist) to prevent duplicate ratings per user
- Uses WAL mode and foreign keys enabled

### Frontend

**`public/index.html`** — Single-page radio player (~400 lines)
- HTML markup and inline JavaScript
- Links to external stylesheet (`<link rel="stylesheet" href="/style.css">`)
- Loads HLS.js library from CDN
- Embeds player audio element and script for stream handling

**`public/style.css`** — All styling (~700 lines)
- CSS custom properties (--gold, --gold-light, --dark, --card, --text, --muted)
- Layout: header, main content (flexbox grid), footer with ticker
- Components: player card, now-playing widget, rating buttons, recently-played list
- Animations: pulse (live dot), spin (vinyl), marquee (scrolling text), bar (visualizer), ticker (footer)
- Responsive design: hides side images on screens <860px wide
- Album art styling: 40px icon with fallback to music note SVG

Key script sections in index.html:
- **HLS Stream Setup** (~line 295): Initializes HLS.js with local stream `/live.m3u8`, handles fatal errors with 3-second retry
- **Metadata Parsing** (~line 303-320): Reads ID3 tags (TIT2, TPE1) from HLS stream FRAG_PARSING_METADATA event
- **Polling Fallback** (~line 379-384): Every 15 seconds, polls `/api/now-playing` to get current track if stream metadata unavailable
- **Rating System** (~line 170-240):
  - `submitRating(value)`: POST to `/api/rate` with current sessionId, track title/artist, rating (1 or -1)
  - `fetchRatings()`: GET `/api/ratings/:title` to display thumbs up/down counts and user's current rating
  - `updateRatingUI()`: Toggles `.active` class on buttons based on `currentRating`
- **Session Management** (~line 161-168): Generates unique session ID stored in localStorage; persists across page reloads

Key UI elements:
- Now Playing widget: Shows album art (cover.jpg), track title/artist, elapsed time, and rating buttons (👍 👎)
- Rating buttons only become interactive when `track.title` is set (requires either ID3 metadata from stream OR API polling)
- Recently Played list: Polls every 15 seconds, shows last 20 tracks with play time

## Important Implementation Details

### Rating System Constraints
- Users identified by **sessionId** (generated per browser, stored in localStorage)
- One rating per session/track combination (database UNIQUE constraint enforces this)
- Rating values: `1` (thumbs up) or `-1` (thumbs down)
- Clicking a button always submits that rating; clicking again changes it to the other option
- Frontend removes debug logging after initial implementation (check git history if troubleshooting)

### HLS Stream with ID3 Metadata
- Local stream at `/live.m3u8` replaces external CloudFront URL (see hardcoded STREAM URL in HTML)
- Segments are generated dynamically with ID3 header containing title and artist
- ID3v2.3 format: [header (10 bytes)] + [TIT2 frame] + [TPE1 frame] + [minimal MPEG-TS packets]
- When `/api/now-playing` is updated, `hlsStream.setTrack()` is called to update metadata for future segments
- Frontend's HLS.js decoder extracts metadata from the first few bytes of each segment

### Album Art
- Served at `/cover.jpg`
- Placeholder JPEG is served if no file exists
- Displayed in now-playing widget with fallback to music note icon if load fails

### Track Polling vs. Stream Metadata
- **Stream Metadata** (ID3): Extracted from HLS segments in real-time, updates instantly
- **API Polling** (/api/now-playing every 15s): Fallback if stream doesn't have ID3 tags
- Frontend uses whichever data arrives; if both available, stream metadata takes precedence (no polling delay)

## Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE played_tracks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ratings (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  rating INTEGER NOT NULL CHECK (rating IN (1, -1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, track_title, track_artist)
);
```

## Common Tasks

### Docker Quick Commands

**Development (SQLite + Express):**
```bash
# Start development server (hot-reload on port 3000)
docker-compose up radiocalico-dev

# Run tests
docker-compose exec radiocalico-dev npm test

# View logs
docker-compose logs -f radiocalico-dev
```

**Production (PostgreSQL + nginx):**
```bash
# Start production stack (PostgreSQL + API + nginx on port 3001)
docker-compose up radiocalico-db-postgres radiocalico-api radiocalico-web

# View logs
docker-compose logs -f radiocalico-api
docker-compose logs -f radiocalico-web

# Access PostgreSQL directly (if needed)
docker-compose exec radiocalico-db-postgres psql -U radiocalico -d radiocalico
```

**All Services:**
```bash
# Start all (dev and prod)
docker-compose up

# Stop all containers
docker-compose down

# Remove all including volumes (CAUTION: loses data)
docker-compose down -v
```

**Test rating feature without external stream:**
```bash
# Set a track
curl -X POST http://localhost:3001/api/now-playing \
  -H "Content-Type: application/json" \
  -d '{"title":"Song Title","artist":"Artist Name"}'

# Submit a rating
curl -X POST http://localhost:3001/api/rate \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","title":"Song Title","artist":"Artist Name","rating":1}'

# Fetch ratings
curl "http://localhost:3001/api/ratings/Song%20Title?sessionId=test-123&artist=Artist%20Name"
```

**Add album art:**
Place an image at `public/cover.jpg` (JPG/PNG format). Server will serve it at `/cover.jpg`.

**Debug track metadata:**
Open browser DevTools (F12), go to Console. Look for logs from:
- `applyTrack()`: Logs when track changes
- `fetchRatings()`: Logs rating API responses
- `submitRating()`: Logs rating submission attempts
- Button click handlers: Log to verify buttons are wired

**Test HLS segments have ID3 metadata:**
```bash
curl http://localhost:3000/segment-0.ts | xxd | head -20
# Look for "ID3" at start, followed by "TIT2" and "TPE1" frames
```

## Production PostgreSQL Setup

### Architecture

The production deployment separates concerns across three containers:

1. **radiocalico-db-postgres** — PostgreSQL database
   - Persistent volume: `radiocalico-db-postgres-data`
   - Environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - Health checks enabled (pg_isready)

2. **radiocalico-api** — Node.js Express API backend
   - Connects to PostgreSQL via environment variables
   - Handles `/api/*` routes and HLS segments
   - No static file serving (nginx handles that)
   - Uses `src/db-postgres.js` for database connection pooling
   - Uses `src/routes-postgres.js` for async PostgreSQL queries

3. **radiocalico-web** — nginx reverse proxy and web server
   - Serves static files from `public/` directory with caching
   - Reverse proxies API requests to `radiocalico-api`
   - Gzip compression for assets
   - Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
   - Health checks via nginx

### Key Files for Production

- `Dockerfile.prod` — Production API image (Node.js Alpine)
- `src/server-api.js` — API-only server entry point (no static serving)
- `src/db-postgres.js` — PostgreSQL connection pool and schema initialization
- `src/routes-postgres.js` — Async route handlers for PostgreSQL
- `nginx.conf` — Reverse proxy and web server configuration

### Environment Variables (Production)

Set these in `docker-compose.yml` or `.env` file:

```
DB_HOST=radiocalico-db-postgres
DB_PORT=5432
DB_NAME=radiocalico
DB_USER=radiocalico
DB_PASSWORD=radiocalico  # Change in production!
NODE_ENV=production
```

### Database Schema

PostgreSQL uses the same schema as SQLite:

- `users` — User accounts (legacy)
- `played_tracks` — Track playback history
- `ratings` — User ratings per track per session (UNIQUE constraint on session_id, track_title, track_artist)

Indexes are created automatically for common queries.

### Caching Strategy

nginx caches assets aggressively:

- Static files (.js, .css, .png, .jpg, etc.): 1 year (immutable)
- HLS segments (.ts, .m3u8): 5 seconds
- HTML files: 1 hour
- Branding assets (/logo.png, /layout.png): 30 days

## Notes for Future Development

- **Stream Quality**: Current HLS implementation generates placeholder MPEG-TS; for real audio, integrate ffmpeg or use an external stream with ID3 metadata
- **Persistence**: Player volume persists per session; recently played tracks are archived to DB only when a new track starts playing
- **UI Responsiveness**: Flex layout hides side images on screens <860px wide; works well on mobile but currently optimized for desktop
- **Error Handling**: Stream errors trigger auto-retry every 3 seconds; verbose console logs help debugging (considered removing after stabilization)
- **Multi-Instance Scaling**: Production setup with PostgreSQL supports horizontal scaling via Docker Swarm or Kubernetes
- **Database Migrations**: Use a tool like Flyway or Liquibase for schema versioning in multi-instance deployments
- **Registry Deployment**: Push production images to Docker registry (Docker Hub, ECR, GCR) with semantic versioning tags
- **Secrets Management**: Use Docker Compose secrets or container orchestration secrets (not .env files) for production credentials
- **TLS/HTTPS**: Add a reverse proxy (Traefik, HAProxy) or cloud load balancer for SSL/TLS termination
