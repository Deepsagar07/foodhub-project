// Authentication & authorization middleware.
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

// restaurantOnly: must run AFTER protect. Allows only restaurant-partner
// accounts, and attaches their restaurant id as req.restaurantId.
async function restaurantOnly(req, res, next) {
  if (!req.user || req.user.role !== 'restaurant') {
    return res.status(403).json({ message: 'Forbidden: restaurant partner access required' });
  }
  try {
    const user = await User.findById(req.user.id).select('restaurant');
    if (!user || !user.restaurant) {
      return res.status(403).json({ message: 'Forbidden: no restaurant linked to this account' });
    }
    req.restaurantId = String(user.restaurant);
    next();
  } catch (err) {
    next(err);
  }
}

// riderOnly: must run AFTER protect. Allows only delivery-rider accounts
// (role='delivery'), and attaches their restaurant id as req.restaurantId.
async function riderOnly(req, res, next) {
  if (!req.user || req.user.role !== 'delivery') {
    return res.status(403).json({ message: 'Forbidden: delivery rider access required' });
  }
  try {
    const user = await User.findById(req.user.id).select('restaurant');
    if (!user || !user.restaurant) {
      return res.status(403).json({ message: 'Forbidden: no restaurant linked to this account' });
    }
    req.restaurantId = String(user.restaurant);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { protect, adminOnly, restaurantOnly, riderOnly };
