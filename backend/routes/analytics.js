// Analytics routes: public visitor tracking beacon (POST /visit only).
// Admin views (visits/users) live in adminController.js, not in this file.
const express = require('express');
const jwt = require('jsonwebtoken');
const Visit = require('../models/Visit');
const asyncHandler = require('../middleware/asyncHandler');
const { geoLookup, parseDevice } = require('../utils/geoip');

const router = express.Router();

// POST /api/analytics/visit  { path } -> { ok: true }
// Called by the frontend on every page load (fire-and-forget beacon).
// Auth is OPTIONAL: when a valid JWT is sent, the visit is linked to the user.
router.post(
  '/visit',
  asyncHandler(async (req, res) => {
    let userId = null;
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) {
        /* guest visit — leave userId null */
      }
    }

    const ip = req.ip || '';
    const ua = String(req.headers['user-agent'] || '');
    const visit = await Visit.create({
      ip,
      user: userId,
      path: String(req.body.path || '/').slice(0, 200),
      userAgent: ua.slice(0, 500),
      device: parseDevice(ua),
    });

    // Geolocate without blocking the response
    geoLookup(ip)
      .then((g) => {
        if (g && (g.city || g.country)) {
          visit.city = g.city;
          visit.country = g.country;
          visit.save().catch(() => {});
        }
      })
      .catch(() => {});

    res.json({ ok: true });
  })
);

module.exports = router;
