const redis = require('../config/redis');

const CACHE_TTL = 60; // 60 seconds

/**
 * Get a cached value from Redis.
 * Returns null if Redis is unavailable or key doesn't exist.
 */
const getCache = async (key) => {
  try {
    if (!redis || redis.status !== 'ready') return null;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('Cache get error:', err.message);
    return null;
  }
};

/**
 * Set a cached value in Redis with TTL.
 */
const setCache = async (key, value, ttl = CACHE_TTL) => {
  try {
    if (!redis || redis.status !== 'ready') return;
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    console.warn('Cache set error:', err.message);
  }
};

/**
 * Invalidate cache entries matching a pattern.
 */
const invalidateCache = async (pattern) => {
  try {
    if (!redis || redis.status !== 'ready') return;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn('Cache invalidation error:', err.message);
  }
};

/**
 * Acquire a distributed lock using Redis SET NX PX.
 * Returns the lock token on success, null on failure.
 */
const acquireLock = async (key, ttlMs = 5000) => {
  try {
    if (!redis || redis.status !== 'ready') return 'no-redis'; // Allow proceeding without Redis
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const result = await redis.set(key, token, 'NX', 'PX', ttlMs);
    return result === 'OK' ? token : null;
  } catch (err) {
    console.warn('Lock acquire error:', err.message);
    return 'no-redis'; // Fail open — Postgres is the real guard
  }
};

/**
 * Release a distributed lock (only if we own it).
 */
const releaseLock = async (key, token) => {
  try {
    if (!redis || redis.status !== 'ready' || token === 'no-redis') return;
    // Lua script ensures atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(script, 1, key, token);
  } catch (err) {
    console.warn('Lock release error:', err.message);
  }
};

module.exports = { getCache, setCache, invalidateCache, acquireLock, releaseLock };
