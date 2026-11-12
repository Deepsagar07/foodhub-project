// Auth controller: register, login, logout, and "who am I".
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginSession = require('../models/LoginSession');
const { geoLookup, parseDevice, parseBrowser } = require('../utils/geoip');
const asyncHandler = require('../middleware/asyncHandler');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Create a signed JWT valid for 7 days, carrying the user id and role
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Never send the password hash back to the client
function safeUser(user) {
  const u = { id: user._id, name: user.name, email: user.email, role: user.role };
  if (user.restaurant) u.restaurantId = String(user.restaurant);
  return u;
}

// POST /api/auth/register  { name, email, password } -> 201 { token, user }
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'A valid email is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(400).json({ message: 'Email is already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10); // 10 salt rounds
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    signupIp: req.ip || '', // IP of first join (shown in admin dashboard)
  });

  res.status(201).json({ token: signToken(user), user: safeUser(user) });
});

// POST /api/auth/login  { email|phone, password } -> 200 { token, user }
// Delivery riders log in with their 10-digit phone number; everyone else with email.
const login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;
  const idInput = String(phone || email || '').trim();

  if (!idInput || !password) {
    return res.status(400).json({ message: 'Email/phone and password are required' });
  }

  const isPhone = /^[6-9]\d{9}$/.test(idInput);
  const user = isPhone
    ? await User.findOne({ phone: idInput })
    : await User.findOne({ email: idInput.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: 'Invalid email/phone or password' });
  }

  // Brute-force protection: 3 wrong passwords lock the account for 24 hours
  // Once a lock has expired, the attempt counter resets — otherwise a single
  // wrong password after expiry would instantly re-lock the account for 24h.
  if (user.lockUntil && user.lockUntil <= new Date()) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
  }
  if (user.lockUntil && user.lockUntil > new Date()) {
    const msLeft = user.lockUntil.getTime() - Date.now();
    const hrs = Math.floor(msLeft / 3600000);
    const mins = Math.ceil((msLeft % 3600000) / 60000);
    const when = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
    return res.status(423).json({ message: `Account locked due to too many failed attempts. Try again in ${when}.` });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 3) {
      user.lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      return res.status(423).json({ message: 'Too many failed attempts. Your account is locked for 24 hours.' });
    }
    await user.save();
    const left = 3 - user.failedLoginAttempts;
    return res.status(401).json({
      message: `Invalid email/phone or password. ${left} attempt${left === 1 ? '' : 's'} left before your account is locked for 24 hours.`,
    });
  }

  // Success: reset the failed-attempt counter
  user.failedLoginAttempts = 0;
  user.lockUntil = null;

  // Stamp login analytics (visible in the admin dashboard)
  user.lastLogin = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  user.lastLoginIp = req.ip || '';
  await user.save();

  // Record this login as its own session (per-device history for admin).
  // Geo lookup runs in the background so login never waits for it.
  const ua = req.headers['user-agent'] || '';
  const session = await LoginSession.create({
    user: user._id,
    ip: req.ip || '',
    userAgent: ua,
    device: parseDevice(ua),
    browser: parseBrowser(ua),
  });
  geoLookup(req.ip)
    .then((g) => {
      if (g && (g.city || g.country)) {
        LoginSession.updateOne(
          { _id: session._id },
          { $set: { city: g.city || '', country: g.country || '' } }
        ).catch(() => {});
      }
    })
    .catch(() => {});

  res.json({ token: signToken(user), user: safeUser(user) });
});

// POST /api/auth/logout  (protect) -> mark the latest open session as exited
const logout = asyncHandler(async (req, res) => {
  await LoginSession.findOneAndUpdate(
    { user: req.user.id, logoutAt: null },
    { $set: { logoutAt: new Date() } },
    { sort: { loginAt: -1 } }
  );
  res.json({ ok: true });
});

// GET /api/auth/me  (protect) -> current user
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

module.exports = { register, login, logout, me };
