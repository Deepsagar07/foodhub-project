// Admin controller: dashboard stats, all orders, and menu management.
const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Review = require('../models/Review');
const LoginSession = require('../models/LoginSession');
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

// GET /api/admin/visits (admin) -> latest 200 page views, newest first
const getVisits = asyncHandler(async (req, res) => {
  const Visit = require('../models/Visit');
  const visits = await Visit.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json(visits);
});

// GET /api/admin/users (admin) -> all users with login stats + order counts
// Note: password hashes are never selected, so they can never leak here.
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-passwordHash')
    .populate('restaurant', 'name')
    .sort({ createdAt: -1 })
    .lean();
  const ids = users.map((u) => u._id);
  // Latest 8 login sessions per user (per-device IP / login / logout history)
  const sessions = await LoginSession.find({ user: { $in: ids } })
    .sort({ loginAt: -1 })
    .lean();
  const byUser = {};
  for (const s of sessions) {
    const k = String(s.user);
    (byUser[k] = byUser[k] || []).push(s);
  }
  const withOrders = await Promise.all(
    users.map(async (u) => ({
      ...u,
      orderCount: await Order.countDocuments({ user: u._id }),
      loginHistory: (byUser[String(u._id)] || []).slice(0, 8),
    }))
  );
  res.json(withOrders);
});

// GET /api/admin/restaurants (admin) -> every restaurant with its partner,
// rider/dish/order counts and approval status (pending first)
const getRestaurants = asyncHandler(async (req, res) => {
  const restaurants = await Restaurant.find().sort({ createdAt: -1 }).lean();
  const out = await Promise.all(
    restaurants.map(async (r) => {
      const [partner, riderCount, dishCount, orderCount] = await Promise.all([
        User.findOne({ restaurant: r._id, role: 'restaurant' }).select('name email phone').lean(),
        User.countDocuments({ restaurant: r._id, role: 'delivery' }),
        MenuItem.countDocuments({ restaurant: r._id }),
        Order.countDocuments({ restaurant: r._id }),
      ]);
      return { ...r, partner, riderCount, dishCount, orderCount };
    })
  );
  out.sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1));
  res.json(out);
});

// PATCH /api/admin/restaurants/:id/approve (admin) -> make a pending/suspended restaurant live
const approveRestaurant = asyncHandler(async (req, res) => {
  const r = await Restaurant.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Restaurant not found' });
  r.status = 'active';
  await r.save();
  res.json(r);
});

// PATCH /api/admin/restaurants/:id/suspend (admin) -> hide a live restaurant
// from customers without deleting anything (recoverable via approve)
const suspendRestaurant = asyncHandler(async (req, res) => {
  const r = await Restaurant.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Restaurant not found' });
  r.status = 'suspended';
  await r.save();
  res.json(r);
});

// PATCH /api/admin/users/:id/unlock (admin) -> clear a 24h login lockout
const unlockUser = asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'User not found' });
  u.failedLoginAttempts = 0;
  u.lockUntil = null;
  await u.save();
  res.json({ ok: true });
});

// DELETE /api/admin/restaurants/:id (admin) -> reject & remove a restaurant
// (plus its partner account, riders, menu items and reviews). A restaurant
// with existing customer orders CANNOT be deleted — suspend it instead,
// otherwise its orders would be orphaned with nowhere to point.
const rejectRestaurant = asyncHandler(async (req, res) => {
  const r = await Restaurant.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Restaurant not found' });
  const orderCount = await Order.countDocuments({ restaurant: r._id });
  if (orderCount > 0) {
    return res.status(400).json({ message: 'Cannot delete restaurant with existing orders. Suspend it instead.' });
  }
  await MenuItem.deleteMany({ restaurant: r._id });
  await Review.deleteMany({ restaurant: r._id });
  await User.deleteMany({ restaurant: r._id, role: { $in: ['restaurant', 'delivery'] } });
  await r.deleteOne();
  res.json({ message: 'Restaurant rejected and removed' });
});

module.exports = { getStats, getAllOrders, createMenuItem, updateMenuItem, deleteMenuItem, getVisits, getUsers, getRestaurants, approveRestaurant, suspendRestaurant, rejectRestaurant, unlockUser };
