# Radiocalico

A production-ready live radio streaming platform with lossless HLS delivery, user ratings, and separate development/production deployments. Built with modern web technologies and containerized for self-contained deployment.

---

## Features

- **Lossless HLS streaming** — high-fidelity audio delivered via HTTP Live Streaming
- **Live radio UI** — spinning vinyl, animated waveform visualizer, and live badge
- **Play / Pause / Stop controls** — full stream lifecycle management with proper HLS teardown on stop
- **User ratings** — thumbs up/down system per session with persistent storage
- **Auto-reconnect** — detects fatal stream errors and retries automatically
- **Volume control** — persistent per-session volume slider
- **Responsive design** — optimized for desktop; side imagery hides gracefully on mobile
- **Cross-browser HLS** — HLS.js for Chrome/Firefox/Edge, native HLS for Safari
- **REST API** — comprehensive endpoints for streaming, ratings, and track management
- **Docker containerization** — production-grade multi-service deployment

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| HTML5 / CSS3 | Structure and styling |
| Vanilla JavaScript | Player logic and stream management |
| [HLS.js](https://github.com/video-dev/hls.js/) | HLS stream playback in non-Safari browsers |
| localStorage | Client-side session persistence |

### Backend - Development
| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org) 22 Alpine | JavaScript runtime |
| [Express.js 5](https://expressjs.com) | Web server and REST API framework |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Fast, synchronous SQLite driver |
| SQLite | Embedded relational database |
| [nodemon](https://nodemon.io) | Auto-restart on file changes |

### Backend - Production
| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org) 22 Alpine | JavaScript runtime (API-only) |
| [Express.js 5](https://expressjs.com) | REST API framework |
| [PostgreSQL](https://www.postgresql.org/) 16 Alpine | Scalable relational database |
| [pg](https://node-postgres.com/) | PostgreSQL client with connection pooling |
| [nginx](https://nginx.org/) Alpine | Reverse proxy, static file serving, compression |

### DevOps & Deployment
| Technology | Purpose |
|---|---|
| [Docker](https://www.docker.com/) 29+ | Container runtime |
| [Docker Compose](https://docs.docker.com/compose/) 2+ | Multi-container orchestration |
| npm | Package management |
| Git | Version control |

---

## Project Structure

```
radiocalico/
├── src/
│   ├── server.js            # Development: Express app (full-stack)
│   ├── server-api.js        # Production: API-only server
│   ├── routes.js            # Development: API routes (SQLite)
│   ├── routes-postgres.js   # Production: API routes (PostgreSQL async)
│   ├── db.js                # Development: SQLite connection & schema
│   ├── db-postgres.js       # Production: PostgreSQL connection pool
│   ├── hls-stream.js        # HLS segment generation with ID3 metadata
│
├── public/
│   ├── index.html           # Radio player UI (single-page)
│   ├── style.css            # Player styling and animations
│   └── [cover.jpg]          # Optional album art
│
├── db/
│   ├── radiocalico.db       # Dev: SQLite database (auto-created)
│   ├── radiocalico.db-shm   # SQLite WAL shared memory
│   └── radiocalico.db-wal   # SQLite WAL log
│
├── .github/
│   └── workflows/           # CI/CD pipelines
│
├── Docker/
│   ├── Dockerfile           # Legacy: Production build (SQLite)
│   ├── Dockerfile.prod      # Production: API-only for PostgreSQL
│   ├── Dockerfile.dev       # Development: with nodemon
│   ├── docker-compose.yml   # Service orchestration
│   ├── nginx.conf           # nginx reverse proxy config
│   └── .dockerignore        # Build context optimization
│
├── tests/                   # Unit and integration tests
│   ├── *.test.js
│   └── frontend/
│
├── package.json             # Dependencies and scripts
├── package-lock.json        # Locked dependency versions
├── CLAUDE.md                # Developer guidance for Claude Code
├── README.md                # This file
├── TESTING.md               # Test suite documentation
└── RadioCalico_Style_Guide.txt  # Branding guidelines
```

---

## Getting Started

### Prerequisites

**Option A: Docker (Recommended for Deployment)**
- Docker Engine 20.10+
- Docker Compose 2.0+

**Option B: Local Node.js**
- Node.js 18 or higher
- npm

### Installation

```bash
git clone https://github.com/mbhoge/radiocalico.git
cd radiocalico
```

### Running with Docker (Recommended)

**Production (optimized build):**
```bash
docker-compose up radiocalico-prod
# Server runs at http://localhost:3001
```

**Development (with hot-reload on file changes):**
```bash
docker-compose up radiocalico-dev
# Server runs at http://localhost:3000
# Code changes auto-reload via nodemon
```

**Run Both Simultaneously:**
```bash
docker-compose up
# Dev: http://localhost:3000 | Prod: http://localhost:3001
```

**Stop All Containers:**
```bash
docker-compose down
```

### Running Locally (Without Docker)

```bash
npm install

# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

The server starts at **http://localhost:3000**.

### Database Persistence

- **Docker**: Data persists in named volumes (`radiocalico-db-dev`, `radiocalico-db-prod`)
- **Local**: Data stored in `db/radiocalico.db`

To reset the database:
```bash
# With Docker
docker volume rm radiocalico_radiocalico-db-prod  # or radiocalico-db-dev

# Local
rm db/radiocalico.db
```

---

## Docker Deployment

### Architecture Overview

Radiocalico provides two distinct deployment configurations:

#### Development Stack (Single Container)
```
┌─────────────────────────────────────┐
│  radiocalico-dev (Node.js Alpine)   │
│  ├─ Express.js (API + Static)       │
│  ├─ SQLite Database                 │
│  └─ nodemon (Hot-reload)            │
│  Port: 3000                         │
└─────────────────────────────────────┘
```

#### Production Stack (Multi-Service)
```
┌────────────────────────────────────────────┐
│  nginx (50MB Alpine)                       │
│  ├─ Reverse proxy to API                   │
│  ├─ Static file serving (public/)          │
│  ├─ Gzip compression                       │
│  ├─ Security headers                       │
│  └─ Asset caching (1-year for .js/.css)    │
│  Port: 3001 → 80 (internal)               │
└────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────┐
│  radiocalico-api (300MB Alpine)            │
│  ├─ Express.js (API only)                  │
│  ├─ PostgreSQL client (async)              │
│  ├─ Connection pooling                     │
│  └─ Health checks                          │
│  Port: 3000 (internal only)               │
└────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────┐
│  radiocalico-db-postgres (250MB Alpine)    │
│  ├─ PostgreSQL 16 Database                 │
│  ├─ Connection pooling (20 max)            │
│  ├─ WAL mode enabled                       │
│  └─ Persistent volume                      │
│  Port: 5432 (internal only)               │
└────────────────────────────────────────────┘
```

### Production Architecture Benefits

| Aspect | Benefit |
|---|---|
| **Separation of Concerns** | nginx handles web, Node handles API, PostgreSQL handles data |
| **Scalability** | Each component can scale independently |
| **Caching** | nginx caches static assets (1-year), HLS segments (5s), HTML (1h) |
| **Performance** | Gzip compression, connection pooling, async database |
| **Reliability** | Health checks, auto-restart, connection retry |
| **Security** | Security headers, non-root users, no static serving from API |

### Container Image Sizes

| Image | Size | Purpose |
|---|---|---|
| radiocalico:dev | 670MB | Development with build tools |
| radiocalico:prod | 179MB | Production API (PostgreSQL) |
| nginx:alpine | 50MB | Web server |
| postgres:16-alpine | 250MB | Database |
| **Total Prod Stack** | **~500MB** | Three services combined |

### Service Configuration

| Service | Container | Port | Database | Storage | CPU/Memory |
|---|---|---|---|---|---|
| Dev | radiocalico-dev | 3000 | SQLite | Volume: 1GB | Auto |
| API (Prod) | radiocalico-api | 3000 (internal) | PostgreSQL | N/A | Auto |
| Web (Prod) | radiocalico-web | 3001 → 80 | N/A | 1MB (logs) | Auto |
| DB (Prod) | radiocalico-db-postgres | 5432 (internal) | PostgreSQL | Volume: 1GB+ | Auto |

### Docker Files & Configuration

| File | Purpose |
|---|---|
| `Dockerfile` | Legacy production build (SQLite, Express) — deprecated |
| `Dockerfile.prod` | Production build (PostgreSQL, API-only, multi-stage) |
| `Dockerfile.dev` | Development build (SQLite, Express, nodemon, full dev tools) |
| `docker-compose.yml` | Orchestrates dev and prod stacks with volumes and networking |
| `nginx.conf` | Production reverse proxy with caching, compression, headers |
| `.dockerignore` | Optimizes build context (excludes node_modules, tests, etc.) |

### Quick Start Commands

**Development:**
```bash
# Start with hot-reload
docker-compose up radiocalico-dev

# Run tests
docker-compose exec radiocalico-dev npm test

# View logs
docker-compose logs -f radiocalico-dev
```

**Production:**
```bash
# Start all three services
docker-compose up radiocalico-db-postgres radiocalico-api radiocalico-web

# Access at http://localhost:3001
```

**Both Simultaneously:**
```bash
# Start dev and prod stacks
docker-compose up

# Dev: http://localhost:3000
# Prod: http://localhost:3001
```

**Stop & Clean Up:**
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: loses data)
docker-compose down -v

# Remove dangling images
docker-compose down --rmi dangling
```

### Viewing Logs

```bash
# Development logs
docker-compose logs -f radiocalico-dev

# Production API logs
docker-compose logs -f radiocalico-api

# Production web server logs
docker-compose logs -f radiocalico-web

# Database logs
docker-compose logs -f radiocalico-db-postgres

# All services
docker-compose logs -f
```

### Database Access

**Development (SQLite):**
```bash
# Database file at db/radiocalico.db (auto-created)
sqlite3 db/radiocalico.db
```

**Production (PostgreSQL):**
```bash
# Connect to PostgreSQL from host
docker-compose exec radiocalico-db-postgres psql -U radiocalico -d radiocalico

# Or use environment variables
PGPASSWORD=radiocalico psql -h localhost -U radiocalico -d radiocalico
```

### Environment Variables (Production)

```bash
DB_HOST=radiocalico-db-postgres
DB_PORT=5432
DB_NAME=radiocalico
DB_USER=radiocalico
DB_PASSWORD=radiocalico
NODE_ENV=production
```

To customize, create `.env.prod` and pass to docker-compose:
```bash
docker-compose --env-file .env.prod up radiocalico-api
```

### Health Checks

All production services have health checks enabled:

```bash
# Check container health
docker-compose ps

# Manually test health endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/health
```

### Performance Tuning

**Database Connection Pool:**
```javascript
// src/db-postgres.js - default config
const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Idle timeout
  connectionTimeoutMillis: 2000  // Connection timeout
});
```

**nginx Caching:**
- Static files (.js, .css, images): `Cache-Control: public, immutable` (1 year)
- HLS segments (.ts, .m3u8): `Cache-Control: public, max-age=5` (5 seconds)
- HTML files: `Cache-Control: public, max-age=3600` (1 hour)
- Branding assets: `Cache-Control: public, max-age=2592000` (30 days)

**Gzip Compression:**
Enabled for text, CSS, JavaScript, JSON, SVG, and font files (min 1KB)

---

## API Endpoints

### Health & Status

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check (JSON status) |
| `GET` | `/health` | Simple health check (text "healthy") |

### Track Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/now-playing` | Get currently playing track |
| `POST` | `/api/now-playing` | Set current track (admin) |
| `GET` | `/api/recently-played` | Get last 20 played tracks |

### User Ratings

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/rate` | Submit user rating for track |
| `GET` | `/api/ratings/:title` | Get rating summary for track |

### Legacy Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create new user (`{ name, email }`) |

### Request/Response Examples

**Set Current Track:**
```bash
curl -X POST http://localhost:3001/api/now-playing \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Midnight Jazz",
    "artist": "Miles Davis"
  }'

# Response
{
  "title": "Midnight Jazz",
  "artist": "Miles Davis",
  "startedAt": "2026-06-30T12:00:00.000Z"
}
```

**Submit Rating (1 = thumbs up, -1 = thumbs down):**
```bash
curl -X POST http://localhost:3001/api/rate \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "user-12345",
    "title": "Midnight Jazz",
    "artist": "Miles Davis",
    "rating": 1
  }'

# Response
{
  "id": 42,
  "session_id": "user-12345",
  "track_title": "Midnight Jazz",
  "track_artist": "Miles Davis",
  "rating": 1,
  "created_at": "2026-06-30T12:00:15.000Z"
}
```

**Get Rating Summary:**
```bash
curl "http://localhost:3001/api/ratings/Midnight%20Jazz?sessionId=user-12345&artist=Miles%20Davis"

# Response
{
  "thumbsUp": 5,
  "thumbsDown": 2,
  "userRating": 1
}
```

**Get Recently Played:**
```bash
curl http://localhost:3001/api/recently-played

# Response
[
  {
    "id": 1,
    "title": "Midnight Jazz",
    "artist": "Miles Davis",
    "played_at": "2026-06-30T12:00:00.000Z"
  },
  ...
]
```

### Health Check Example

```bash
curl http://localhost:3001/health
# → healthy

curl http://localhost:3001/api/health
# → {"status":"ok","time":"2026-06-30T12:00:00.000Z"}
```

---

## HLS Stream Details

### Local Development Stream

| Property | Value |
|---|---|
| Stream URL | `/live.m3u8` (relative path) |
| Format | HLS (HTTP Live Streaming) with ID3 metadata |
| Quality | Placeholder MPEG-TS (for development) |
| Availability | 24/7 during server runtime |
| Metadata | ID3v2.3 frames (TIT2=title, TPE1=artist) |

### Production Stream Configuration

For production deployment, replace the local stream generator with:
- External HLS provider (CloudFront, Wowza, etc.)
- ffmpeg streaming pipeline
- Custom streaming service

The API and UI remain unchanged — just update the `STREAM` URL in `public/index.html`

### Segment Details

- **M3u8 Manifest**: Playlist containing segment URLs
- **MPEG-TS Segments**: `.ts` files with audio and metadata
- **Caching**: Segments cached for 5 seconds by nginx
- **Metadata Embedding**: ID3 tags in segment header
- **Retry Logic**: Auto-reconnect on stream failure (3-second intervals)

### Browser Compatibility

| Browser | Support | Method |
|---|---|---|
| Chrome | ✅ | HLS.js library |
| Firefox | ✅ | HLS.js library |
| Safari | ✅ | Native HLS support |
| Edge | ✅ | HLS.js library |
| Mobile Safari | ✅ | Native HLS support |

---

## Database Schema

### Development (SQLite)

Tables auto-created in `db/radiocalico.db`:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE played_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  artist TEXT,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  rating INTEGER NOT NULL CHECK (rating IN (1, -1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, track_title, track_artist)
);
```

### Production (PostgreSQL)

Same schema, auto-created with:
- Indexes on `played_at` and `(track_title, track_artist)`
- Native `TIMESTAMP` types
- Connection pooling (20 max connections)
- UNIQUE constraint enforced at database level

---

## Production Deployment Guide

### Self-Contained Docker Deployment

The production stack is self-contained — everything needed runs in Docker:

```bash
# Pull from registry or build locally
docker-compose build radiocalico-db-postgres radiocalico-api radiocalico-web

# Start all services
docker-compose up -d

# Access at http://your-host:3001
```

### Environment Setup

1. **Clone repository:**
   ```bash
   git clone https://github.com/mbhoge/radiocalico.git
   cd radiocalico
   ```

2. **Set environment variables (optional):**
   ```bash
   # .env.prod (optional)
   DB_HOST=radiocalico-db-postgres
   DB_PORT=5432
   DB_NAME=radiocalico
   DB_USER=radiocalico
   DB_PASSWORD=your-secure-password  # Change this!
   ```

3. **Start services:**
   ```bash
   docker-compose up -d radiocalico-db-postgres radiocalico-api radiocalico-web
   ```

4. **Verify health:**
   ```bash
   curl http://localhost:3001/health
   ```

### Monitoring & Maintenance

**Check service status:**
```bash
docker-compose ps
```

**View logs:**
```bash
docker-compose logs -f radiocalico-api
```

**Backup database:**
```bash
docker-compose exec radiocalico-db-postgres pg_dump -U radiocalico radiocalico > backup.sql
```

**Restore database:**
```bash
docker-compose exec -T radiocalico-db-postgres psql -U radiocalico radiocalico < backup.sql
```

### Scaling Considerations

**For larger deployments, consider:**

1. **Database:**
   - Use managed PostgreSQL service (AWS RDS, Azure Database, Google Cloud SQL)
   - Enable automated backups
   - Configure read replicas for high availability

2. **Web Server:**
   - Run multiple nginx instances behind load balancer
   - Use container orchestration (Kubernetes, Docker Swarm)
   - Configure TLS/HTTPS termination

3. **API:**
   - Scale horizontally with multiple instances
   - Use load balancer to distribute requests
   - Implement rate limiting and API gateway

4. **Caching:**
   - Add Redis for session caching
   - Implement CDN for static assets
   - Configure application-level caching

### Security Best Practices

1. **Secrets Management:**
   ```bash
   # Use Docker secrets or environment files
   docker-compose --env-file .env.prod up
   ```

2. **Database:**
   - Change default PostgreSQL password
   - Use strong, random credentials
   - Restrict database access to API container

3. **TLS/HTTPS:**
   - Add reverse proxy (Traefik, HAProxy, nginx SSL)
   - Use Let's Encrypt for free certificates
   - Redirect HTTP to HTTPS

4. **Regular Updates:**
   ```bash
   # Update base images
   docker pull node:22-alpine
   docker pull postgres:16-alpine
   docker pull nginx:alpine
   docker-compose build --no-cache
   ```

5. **Monitoring:**
   - Enable container health checks
   - Log aggregation (ELK, Datadog, etc.)
   - Performance monitoring

---

## Development Workflow

### Local Setup (Without Docker)

```bash
# Install dependencies
npm install

# Development server with auto-reload
npm run dev

# Server runs at http://localhost:3000
```

### Development with Docker

```bash
# Build and start dev container
docker-compose up radiocalico-dev

# Hot-reload is automatic — edit files and refresh browser
```

### Testing

```bash
# Run all tests
docker-compose exec radiocalico-dev npm test

# Run with coverage
docker-compose exec radiocalico-dev npm run test:coverage

# Run specific test suite
docker-compose exec radiocalico-dev npm run test:backend
```

### Adding Features

1. **Edit source files** (Docker auto-reloads)
2. **Test API endpoints:**
   ```bash
   curl -X POST http://localhost:3000/api/now-playing \
     -H "Content-Type: application/json" \
     -d '{"title":"Song","artist":"Artist"}'
   ```
3. **Verify in browser:** http://localhost:3000
4. **Run tests before committing**
5. **Create pull request**

### Database Schema Changes

**Development (SQLite):**
- Delete `db/radiocalico.db`
- Restart server (schema auto-created)

**Production (PostgreSQL):**
- Use migration tool (Flyway, Liquibase)
- Test in staging first
- Plan zero-downtime deployments

---

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port 3000/3001
lsof -i :3000
kill -9 <PID>

# Or use different ports in docker-compose.yml
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker-compose logs radiocalico-db-postgres

# Verify environment variables
docker-compose exec radiocalico-api env | grep DB_
```

### Memory Issues

```bash
# Check container resource usage
docker stats

# Limit resources in docker-compose.yml
services:
  radiocalico-api:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Build Failures

```bash
# Clean build
docker-compose build --no-cache

# Check build logs
docker-compose build radiocalico-api
```

---

## About the Author

**Manish Bhoge** is a software engineer and music enthusiast based in the United States. He built Radiocalico as a passion project combining his interest in high-fidelity audio with modern web development. Manish has experience across the full stack — from Node.js and Python backends to browser-based UIs — and enjoys building tools that are simple to use but carefully engineered under the hood.

- **GitHub:** [github.com/mbhoge](https://github.com/mbhoge)
- **Email:** manish.bhoge@gmail.com

---

## License

This project is open source. Feel free to fork, modify, and build on it.
