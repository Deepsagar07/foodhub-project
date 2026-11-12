// Menu controller: read-only menu endpoints (menu writes live under /api/admin).
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/restaurants/:id/menu?category=&veg=true|false  -> filtered menu items
const getRestaurantMenu = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant || ['pending', 'suspended'].includes(restaurant.status)) {
    return res.status(404).json({ message: 'Restaurant not found' });
  }

  const filter = { restaurant: restaurant._id, isAvailable: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.veg === 'true') filter.veg = true;
  if (req.query.veg === 'false') filter.veg = false;

  const items = await MenuItem.find(filter).sort({ category: 1, price: 1 });
  res.json(items);
});

// GET /api/menu/:id  -> single menu item (useful for the dish detail page)
const getMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id).populate('restaurant', 'name cuisine');
  if (!item) return res.status(404).json({ message: 'Menu item not found' });
  res.json(item);
});

module.exports = { getRestaurantMenu, getMenuItem };
