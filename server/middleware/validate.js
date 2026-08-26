const { z } = require('zod');

/**
 * Express middleware factory: validates req.body against a Zod schema.
 * On failure, passes a ZodError to the centralized error handler.
 */
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    next(err); // ZodError → caught by errorHandler
  }
};

module.exports = validate;
