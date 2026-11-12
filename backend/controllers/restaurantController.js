// Restaurant controller: browse restaurants.
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../middleware/asyncHandler');

// Escape user input before building a RegExp: a search like "Chicken (65)"
// or "Momo's [" is not a valid regex and used to crash this endpoint (500).
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/restaurants?search=&cuisine=  -> list of restaurants
const listRestaurants = asyncHandler(async (req, res) => {
  const { search, cuisine } = req.query;
  // Pending (unapproved) and suspended restaurants stay hidden from customers
  const filter = { status: { $nin: ['pending', 'suspended'] } };

  if (search) {
    // match against name or cuisine, case-insensitive
    const re = new RegExp(escapeRegExp(search.trim()), 'i');
    filter.$or = [{ name: re }, { cuisine: re }];
  }
  if (cuisine) {
    filter.cuisine = new RegExp(`^${escapeRegExp(cuisine.trim())}$`, 'i'); // exact cuisine, case-insensitive
  }

  const restaurants = await Restaurant.find(filter).sort({ rating: -1 });
  res.json(restaurants);
});

// GET /api/restaurants/:id  -> restaurant with its menu embedded
const getRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant || ['pending', 'suspended'].includes(restaurant.status)) {
    return res.status(404).json({ message: 'Restaurant not found' });
  }
  const menu = await MenuItem.find({ restaurant: restaurant._id, isAvailable: true }).sort({ category: 1 });
  res.json({ ...restaurant.toObject(), menu });
});

module.exports = { listRestaurants, getRestaurant };
