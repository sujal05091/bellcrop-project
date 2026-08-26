const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const pool = require('./config/db');
const { connectMongo } = require('./config/mongo');
const redis = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

const app = express();

// --- Security & Parsing Middleware ---
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// --- Health Check ---
app.get('/api/health', async (req, res) => {
  const health = { status: 'ok', timestamp: new Date().toISOString() };

  // Check Postgres
  try {
    await pool.query('SELECT 1');
    health.postgres = 'connected';
  } catch (err) {
    health.postgres = 'disconnected';
    health.status = 'degraded';
  }

  // Check Redis
  try {
    if (redis && redis.status === 'ready') {
      await redis.ping();
      health.redis = 'connected';
    } else {
      health.redis = 'disconnected';
    }
  } catch (err) {
    health.redis = 'disconnected';
  }

  // Check MongoDB
  try {
    const mongoose = require('mongoose');
    health.mongodb = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  } catch (err) {
    health.mongodb = 'disconnected';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.path} not found` });
});

// --- Centralized Error Handler ---
app.use(errorHandler);

// --- Start Server ---
const start = async () => {
  try {
    // Test Postgres connection
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');

    // Connect MongoDB (best-effort)
    await connectMongo();

    // Redis is already connecting via ioredis constructor

    app.listen(config.port, () => {
      console.log(`\n🏨 BellCrop Hotel API running on http://localhost:${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Frontend:    ${config.frontendUrl}\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

start();

module.exports = app;
