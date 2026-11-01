// Restaurant controller: browse restaurants.
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/restaurants?search=&cuisine=  -> list of restaurants
const listRestaurants = asyncHandler(async (req, res) => {
  const { search, cuisine } = req.query;
  const filter = {};

  if (search) {
    // match against name or cuisine, case-insensitive
    const re = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: re }, { cuisine: re }];
  }
  if (cuisine) {
    filter.cuisine = new RegExp(`^${cuisine.trim()}$`, 'i'); // exact cuisine, case-insensitive
  }

  const restaurants = await Restaurant.find(filter).sort({ rating: -1 });
  res.json(restaurants);
});

// GET /api/restaurants/:id  -> restaurant with its menu embedded
const getRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) {
    return res.status(404).json({ message: 'Restaurant not found' });
  }
  const menu = await MenuItem.find({ restaurant: restaurant._id, isAvailable: true }).sort({ category: 1 });
  res.json({ ...restaurant.toObject(), menu });
});

module.exports = { listRestaurants, getRestaurant };
