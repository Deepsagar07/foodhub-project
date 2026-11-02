// Public stats: real live numbers for the homepage trust band.
// No auth — only aggregate counts, no personal data.
const express = require('express');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// GET /api/stats -> { restaurants, dishes, avgRating }
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [restaurants, dishes, ratingAgg] = await Promise.all([
      Restaurant.countDocuments(),
      MenuItem.countDocuments({ isAvailable: true }),
      Restaurant.aggregate([
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
    ]);
    const avgRating =
      ratingAgg.length && ratingAgg[0].avg
        ? Math.round(ratingAgg[0].avg * 10) / 10
        : 0;
    res.json({ restaurants, dishes, avgRating });
  })
);

module.exports = router;
