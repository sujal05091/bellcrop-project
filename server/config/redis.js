const Redis = require('ioredis');
const config = require('./env');

let redis;

try {
  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
    lazyConnect: false,
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redis.on('error', (err) => {
    console.warn('⚠️  Redis error:', err.message);
  });
} catch (err) {
  console.warn('⚠️  Redis initialization failed:', err.message);
  redis = null;
}

module.exports = redis;
