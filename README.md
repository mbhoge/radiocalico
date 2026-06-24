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

- Node.js 18 or higher
- npm

### Installation

```bash
git clone https://github.com/mbhoge/radiocalico.git
cd radiocalico
npm install
```

### Running the Server

```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

The server starts at **http://localhost:3000**.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create a new user (`{ name, email }`) |

### Example

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","time":"2026-06-24T00:00:00.000Z"}
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
