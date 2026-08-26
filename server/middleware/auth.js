const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Verify JWT and attach user to request.
 * Returns 401 if token is missing or invalid.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Token expired or invalid' });
  }
};

/**
 * Require admin role. Must be used AFTER authenticate middleware.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
