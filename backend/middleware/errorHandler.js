// Central error handler: turns every error into a clean { message } JSON response.
// Must be registered AFTER all routes in server.js.
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  if (status === 500) console.error(err); // log unexpected errors for debugging
  res.status(status).json({ message });
}

module.exports = errorHandler;
