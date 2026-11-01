// Security middleware: headers + rate limiting, zero extra dependencies.
// Every line here is viva-explainable.

/** Set secure HTTP response headers (the essential subset of what helmet does). */
function securityHeaders(req, res, next) {
  // Stop browsers from MIME-sniffing responses into executable content
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Block clickjacking: our pages may not be embedded in iframes
  res.setHeader('X-Frame-Options', 'DENY');
  // Don't leak the page URL in the Referer header to other origins
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Opt out of Google's FLoC-style interest tracking
  res.setHeader('Permissions-Policy', 'interest-cohort=()');
  // Hide the framework fingerprint
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * Simple in-memory rate limiter factory (protects login/register from brute force).
 * Usage: app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 100 }), authRoutes)
 */
function rateLimit({ windowMs, max }) {
  const hits = new Map(); // ip -> { count, resetAt }
  // Prevent the map growing forever: sweep expired entries every window
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of hits) {
      if (rec.resetAt <= now) hits.delete(ip);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let rec = hits.get(ip);
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(ip, rec);
    }
    rec.count += 1;
    if (rec.count > max) {
      res.setHeader('Retry-After', Math.ceil((rec.resetAt - now) / 1000));
      return res.status(429).json({ message: 'Too many requests, please try again later' });
    }
    next();
  };
}

module.exports = { securityHeaders, rateLimit };
