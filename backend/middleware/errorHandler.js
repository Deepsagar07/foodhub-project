// Central error handler: turns every error into a clean { message } JSON response.
// Must be registered AFTER all routes in server.js.
function errorHandler(err, req, res, next) {
  // A malformed ObjectId in a route param (e.g. /api/orders/abc) makes
  // Mongoose throw a CastError. That's a bad client request (400),
  // not a server error (500).
  if (err && err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID' });
  }
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  if (status === 500) console.error(err); // log unexpected errors for debugging
  res.status(status).json({ message });
}

module.exports = errorHandler;
