# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

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

**Test rating feature without external stream:**
```bash
# Set a track
curl -X POST http://localhost:3000/api/now-playing \
  -H "Content-Type: application/json" \
  -d '{"title":"Song Title","artist":"Artist Name"}'

# Submit a rating
curl -X POST http://localhost:3000/api/rate \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","title":"Song Title","artist":"Artist Name","rating":1}'

# Fetch ratings
curl "http://localhost:3000/api/ratings/Song%20Title?sessionId=test-123&artist=Artist%20Name"
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

## Notes for Future Development

- **Stream Quality**: Current HLS implementation generates placeholder MPEG-TS; for real audio, integrate ffmpeg or use an external stream with ID3 metadata
- **Persistence**: Player volume persists per session; recently played tracks are archived to DB only when a new track starts playing
- **UI Responsiveness**: Flex layout hides side images on screens <860px wide; works well on mobile but currently optimized for desktop
- **Error Handling**: Stream errors trigger auto-retry every 3 seconds; verbose console logs help debugging (considered removing after stabilization)
