// Admin controller: dashboard stats, all orders, and menu management.
const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../middleware/asyncHandler');
const { fileUrl } = require('../middleware/upload');

// GET /api/admin/stats (admin) -> dashboard numbers
const getStats = asyncHandler(async (req, res) => {
  const [totalOrders, totalUsers, totalRestaurants] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments(),
    Restaurant.countDocuments(),
  ]);

  // Revenue = sum of totals of all non-cancelled orders
  const revenueAgg = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $group: { _id: null, revenue: { $sum: '$total' } } },
  ]);
  const revenue = revenueAgg.length ? revenueAgg[0].revenue : 0;

  // Top 5 dishes by total quantity sold (non-cancelled orders)
  const topDishes = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.name', qty: { $sum: '$items.qty' } } },
    { $sort: { qty: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, name: '$_id', qty: 1 } },
  ]);

  res.json({ totalOrders, revenue, totalUsers, totalRestaurants, topDishes });
});

// GET /api/admin/orders (admin) -> every order, newest first
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'name email')
    .populate('restaurant', 'name')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// POST /api/admin/menu (admin, multer single "image" optional) -> create a menu item
const createMenuItem = asyncHandler(async (req, res) => {
  const { restaurantId, name, description, price, image, category, veg, isAvailable } = req.body;

  if (!restaurantId) return res.status(400).json({ message: 'restaurantId is required' });
  if (!name || !name.trim()) return res.status(400).json({ message: 'Dish name is required' });
  if (!category || !category.trim()) return res.status(400).json({ message: 'Category is required' });
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return res.status(400).json({ message: 'Price must be a non-negative number' });
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

  // Prefer the uploaded file if one was sent, otherwise use the image URL
  const imageUrl = req.file ? fileUrl(req.file) : (image || '');

  const item = await MenuItem.create({
    restaurant: restaurant._id,
    name: name.trim(),
    description: description ? String(description).trim() : '',
    price: priceNum,
    image: imageUrl,
    category: category.trim(),
    veg: veg === undefined ? true : veg === true || veg === 'true',
    isAvailable: isAvailable === undefined ? true : isAvailable === true || isAvailable === 'true',
  });

  res.status(201).json(item);
});

// PUT /api/admin/menu/:id (admin) -> update a menu item
const updateMenuItem = asyncHandler(async (req, res) => {
  const allowed = ['name', 'description', 'price', 'image', 'category', 'veg', 'isAvailable'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.price !== undefined) {
    const priceNum = Number(updates.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }
    updates.price = priceNum;
  }
  if (req.file) updates.image = fileUrl(req.file);

  const item = await MenuItem.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!item) return res.status(404).json({ message: 'Menu item not found' });
  res.json(item);
});

// DELETE /api/admin/menu/:id (admin) -> delete a menu item
const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Menu item not found' });
  res.json({ message: 'Menu item deleted' });
});

module.exports = { getStats, getAllOrders, createMenuItem, updateMenuItem, deleteMenuItem };
