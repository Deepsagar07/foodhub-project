// Authentication & authorization middleware.
const jwt = require('jsonwebtoken');

// protect: verifies the JWT from the "Authorization: Bearer <token>" header.
// On success it attaches { id, role } to req.user for downstream handlers.
function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
}

// adminOnly: must run AFTER protect. Blocks everyone except admins.
function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Forbidden: admin access required' });
}

module.exports = { protect, adminOnly };
