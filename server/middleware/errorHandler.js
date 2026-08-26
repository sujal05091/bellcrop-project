/**
 * Centralized error handler — never leaks stack traces to client.
 * Follows SRS §6 error shape: { error, message?, details? }
 */
const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'ValidationError',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Postgres errors
  if (err.code === '23505') {
    // Unique constraint violation
    return res.status(409).json({
      error: 'Conflict',
      message: 'A record with this value already exists',
    });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(404).json({
      error: 'NotFound',
      message: 'Referenced record not found',
    });
  }

  // Custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.error || 'Error',
      message: err.message,
    });
  }

  // Generic server error — never expose stack trace
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
  });
};

module.exports = errorHandler;
