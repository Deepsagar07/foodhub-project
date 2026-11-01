// Review controller: customers rate restaurants; the restaurant's
// average rating is recalculated every time a review is added.
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const asyncHandler = require('../middleware/asyncHandler');

// POST /api/restaurants/:id/reviews (protect)  { rating, comment } -> 201
const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
  }

  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) {
    return res.status(404).json({ message: 'Restaurant not found' });
  }

  const review = await Review.create({
    user: req.user.id,
    restaurant: restaurant._id,
    rating,
    comment: comment ? String(comment).trim() : '',
  });

  // Recalculate the restaurant's average rating from all its reviews
  const stats = await Review.aggregate([
    { $match: { restaurant: restaurant._id } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  restaurant.rating = Math.round(stats[0].avg * 10) / 10; // one decimal place
  restaurant.ratingCount = stats[0].count;
  await restaurant.save();

  res.status(201).json(review);
});

// GET /api/restaurants/:id/reviews -> all reviews for a restaurant, newest first
const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ restaurant: req.params.id })
    .populate('user', 'name')
    .sort({ createdAt: -1 });
  res.json(reviews);
});

module.exports = { addReview, getReviews };
