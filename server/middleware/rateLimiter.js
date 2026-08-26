const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');

/**
 * Create a rate limiter backed by Redis.
 * Falls back to in-memory if Redis is unavailable.
 */
const createRateLimiter = ({ windowMs = 60000, max = 10, message = 'Too many requests' } = {}) => {
  const options = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'TooManyRequests', message },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    },
  };

  // Use Redis store if available
  if (redis && redis.status === 'ready') {
    options.store = new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    });
  }

  return rateLimit(options);
};

// Booking creation: 10 requests per minute
const bookingRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many booking attempts. Please try again later.',
});

// Login: 5 requests per minute
const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again later.',
});

module.exports = { bookingRateLimiter, loginRateLimiter, createRateLimiter };
