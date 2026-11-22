/**
 * Global error handler for Aimly Express API
 */
export function errorHandler(err, req, res, next) {
  console.error('[API Error]', {
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.status || err.statusCode || 500;
  const message = err.userMessage || err.message || 'An unexpected server error occurred';

  res.status(statusCode).json({
    error: message,
    statusCode,
  });
}
