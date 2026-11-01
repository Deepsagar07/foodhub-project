// Wraps async route handlers so any thrown error is passed to the
// central error handler instead of hanging or crashing the request.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
