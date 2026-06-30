const express = require('express');
const db = require('./db-postgres');
const routesPostgres = require('./routes-postgres');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS headers for nginx reverse proxy
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize database schema
db.initializeSchema().catch(err => {
  console.error('Failed to initialize database schema:', err);
  process.exit(1);
});

// Mount API routes
app.use('/api', routesPostgres);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  console.log(`Connected to PostgreSQL at ${process.env.DB_HOST}:${process.env.DB_PORT}`);
});
