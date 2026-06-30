# Radiocalico

A live internet radio station with a lossless HLS stream, built for high-fidelity listening in the browser. Radiocalico delivers 24/7 music through a clean, immersive web interface — no app required.

---

## Features

- **Lossless HLS streaming** — high-fidelity audio delivered via HTTP Live Streaming
- **Live radio UI** — spinning vinyl, animated waveform visualizer, and live badge
- **Play / Pause / Stop controls** — full stream lifecycle management with proper HLS teardown on stop
- **Auto-reconnect** — detects fatal stream errors and retries automatically
- **Volume control** — persistent per-session volume slider
- **Responsive design** — optimized for desktop; side imagery hides gracefully on mobile
- **Cross-browser HLS** — HLS.js for Chrome/Firefox/Edge, native HLS for Safari
- **REST API** — health check and user endpoints for future feature expansion

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| HTML5 / CSS3 | Structure and styling |
| Vanilla JavaScript | Player logic and stream management |
| [HLS.js](https://github.com/video-dev/hls.js/) | HLS stream playback in non-Safari browsers |
| [Unsplash](https://unsplash.com) | High-quality photography assets |

### Backend
| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org) | JavaScript runtime |
| [Express.js 5](https://expressjs.com) | Web server and REST API framework |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Fast, synchronous SQLite driver |
| SQLite | Embedded relational database |

### Developer Tools
| Tool | Purpose |
|---|---|
| [nodemon](https://nodemon.io) | Auto-restart server on file changes |
| npm | Package management |
| Git | Version control |

---

## Project Structure

```
radiocalico/
├── src/
│   ├── server.js       # Express app — entry point, middleware, static serving
│   ├── routes.js       # API route handlers (/api/health, /api/users)
│   └── db.js           # SQLite connection and schema initialization
├── public/
│   └── index.html      # Radio player UI (single-page)
├── db/
│   └── radiocalico.db  # SQLite database file (auto-created on first run)
├── package.json
└── README.md
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

### Production Architecture

The production deployment uses a multi-service architecture:

**Services:**
1. **nginx** (web server) — Reverse proxy, static file serving, caching, compression
2. **radiocalico-api** (Node.js/Express) — API backend with PostgreSQL
3. **PostgreSQL** — Production database

**Benefits:**
- Separation of concerns (web server vs API server)
- Static file caching and gzip compression via nginx
- PostgreSQL for scalability and advanced features
- Health checks on all services
- Auto-restart on failure

### Image Sizes

- **Development Stack**: 670MB (Node.js + SQLite + nodemon)
- **Production Stack**: ~600MB total
  - nginx: 50MB (Alpine)
  - Node.js API: 300MB (Alpine)
  - PostgreSQL: 250MB (Alpine)

### Container Configuration

| Environment | Host Port | Database | Web Server | Features |
|---|---|---|---|---|
| Production | 3001 | PostgreSQL | nginx | Health checks, auto-restart, scalable |
| Development | 3000 | SQLite | Express | Hot-reload (nodemon), simplified |

### Docker Files

- `Dockerfile` — Legacy production build (SQLite, Express)
- `Dockerfile.prod` — New production build (PostgreSQL, API-only)
- `Dockerfile.dev` — Development build (with nodemon)
- `docker-compose.yml` — Orchestrates all services
- `nginx.conf` — Production web server configuration
- `.dockerignore` — Optimizes build context

### View Logs

```bash
# Production logs
docker-compose logs -f radiocalico-prod

# Development logs
docker-compose logs -f radiocalico-dev

# All logs
docker-compose logs -f
```

### Run Tests in Docker

```bash
docker-compose exec radiocalico-dev npm test
docker-compose exec radiocalico-dev npm run test:coverage
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create a new user (`{ name, email }`) |

### Example

```bash
curl http://localhost:3001/api/health
# → Returns health status
```

---

## Stream Details

| Property | Value |
|---|---|
| Stream URL | `https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8` |
| Format | HLS (HTTP Live Streaming) |
| Quality | Lossless |
| Availability | 24 / 7 |

---

## About the Author

**Manish Bhoge** is a software engineer and music enthusiast based in the United States. He built Radiocalico as a passion project combining his interest in high-fidelity audio with modern web development. Manish has experience across the full stack — from Node.js and Python backends to browser-based UIs — and enjoys building tools that are simple to use but carefully engineered under the hood.

- **GitHub:** [github.com/mbhoge](https://github.com/mbhoge)
- **Email:** manish.bhoge@gmail.com

---

## License

This project is open source. Feel free to fork, modify, and build on it.
