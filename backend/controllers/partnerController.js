// Partner controller: the restaurant-side order flow.
// A logged-in restaurant partner (role='restaurant') manages ONLY their own
// outlet: its orders (accept/reject, then placed -> preparing -> on_the_way
// -> delivered) and its menu (add/edit/delete dishes, toggle availability).
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { fileUrl } = require('../middleware/upload');

// Push the new status to the customer watching track.html (real-time)
function emitStatus(req, order) {
  const io = req.app.get('io');
  if (io) {
    io.to('order:' + order._id).emit('order-status', {
      orderId: String(order._id),
      status: order.status,
    });
  }
}

// Allowed transitions per partner action
const TRANSITIONS = {
  accept: { from: ['placed'], to: 'preparing' },
  reject: { from: ['placed'], to: 'cancelled' },
  ready: { from: ['preparing'], to: 'on_the_way' },
  delivered: { from: ['on_the_way'], to: 'delivered' },
};

function transition(action) {
  const t = TRANSITIONS[action];
  return asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (String(order.restaurant) !== String(req.restaurantId)) {
      return res.status(403).json({ message: 'Forbidden: this order belongs to another restaurant' });
    }
    if (!t.from.includes(order.status)) {
      return res.status(400).json({
        message: `Cannot ${action} an order that is "${order.status}"`,
      });
    }
    order.status = t.to;
    await order.save();
    emitStatus(req, order);
    res.json(order);
  });
}

// GET /api/partner/me -> my restaurant + today's counters
const getMyRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.restaurantId);
  if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [placed, preparing, today] = await Promise.all([
    Order.countDocuments({ restaurant: req.restaurantId, status: 'placed' }),
    Order.countDocuments({ restaurant: req.restaurantId, status: 'preparing' }),
    Order.countDocuments({ restaurant: req.restaurantId, createdAt: { $gte: startOfDay } }),
  ]);
  res.json({ restaurant, counts: { placed, preparing, today } });
});

// GET /api/partner/orders?status=placed,preparing -> my outlet's orders, newest first
const getOrders = asyncHandler(async (req, res) => {
  const filter = { restaurant: req.restaurantId };
  if (req.query.status) {
    const wanted = String(req.query.status).split(',').map((s) => s.trim()).filter(Boolean);
    if (wanted.length) filter.status = { $in: wanted };
  }
  const orders = await Order.find(filter)
    .populate('user', 'name phone')
    .populate('assignedRider', 'name phone')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(orders);
});

// ---------- Menu management (own restaurant only) ----------

// GET /api/partner/menu -> my outlet's dishes
const getMenu = asyncHandler(async (req, res) => {
  const items = await MenuItem.find({ restaurant: req.restaurantId }).sort({ category: 1, name: 1 });
  res.json(items);
});

// POST /api/partner/menu (multer single "image" optional) -> add a dish to MY restaurant
const createMenuItem = asyncHandler(async (req, res) => {
  const { name, description, price, image, category, veg } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ message: 'Dish name is required' });
  if (!category || !category.trim()) return res.status(400).json({ message: 'Category is required' });
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return res.status(400).json({ message: 'Price must be a non-negative number' });
  }

  // Prefer the uploaded photo if one was sent, otherwise use the image URL
  const imageUrl = req.file ? fileUrl(req.file) : image || '';

  const item = await MenuItem.create({
    restaurant: req.restaurantId, // always MY outlet — never taken from the client
    name: name.trim(),
    description: description ? String(description).trim() : '',
    price: priceNum,
    image: imageUrl,
    category: category.trim(),
    veg: veg === undefined ? true : veg === true || veg === 'true',
  });

  res.status(201).json(item);
});

// Ownership guard shared by update / delete / availability toggle
async function ownDish(req, res) {
  const item = await MenuItem.findById(req.params.id);
  if (!item) {
    res.status(404).json({ message: 'Menu item not found' });
    return null;
  }
  if (String(item.restaurant) !== String(req.restaurantId)) {
    res.status(403).json({ message: 'Forbidden: this dish belongs to another restaurant' });
    return null;
  }
  return item;
}

// PUT /api/partner/menu/:id -> edit one of MY dishes
const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await ownDish(req, res);
  if (!item) return;

  if (req.body.name !== undefined) item.name = String(req.body.name).trim();
  if (req.body.description !== undefined) item.description = String(req.body.description).trim();
  if (req.body.category !== undefined) item.category = String(req.body.category).trim();
  if (req.body.image !== undefined) item.image = String(req.body.image).trim();
  if (req.body.price !== undefined) {
    const priceNum = Number(req.body.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }
    item.price = priceNum;
  }
  if (req.body.veg !== undefined) item.veg = req.body.veg === true || req.body.veg === 'true';
  if (req.body.isAvailable !== undefined) {
    item.isAvailable = req.body.isAvailable === true || req.body.isAvailable === 'true';
  }
  if (req.file) item.image = fileUrl(req.file); // new uploaded photo wins

  await item.save();
  res.json(item);
});

// DELETE /api/partner/menu/:id -> delete one of MY dishes
const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await ownDish(req, res);
  if (!item) return;
  await item.deleteOne();
  res.json({ message: 'Menu item deleted' });
});

// PATCH /api/partner/menu/:id/availability -> quick toggle when a dish runs out
const toggleAvailability = asyncHandler(async (req, res) => {
  const item = await ownDish(req, res);
  if (!item) return;
  item.isAvailable = !item.isAvailable;
  await item.save();
  res.json(item);
});


// ---------- Self-registration + delivery boys ----------

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const SERVICE_CITIES = ['Dehradun', 'Patna'];

function signPartnerToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/partner/register (PUBLIC) -> restaurant owner signs up their own outlet.
// The restaurant starts as 'pending' (hidden from customers) until an admin approves it.
const registerRestaurant = asyncHandler(async (req, res) => {
  const { restaurantName, cuisine, area, city, address, phone, ownerName, email, password } = req.body;

  if (!restaurantName || !restaurantName.trim()) return res.status(400).json({ message: 'Restaurant name is required' });
  if (!cuisine || !cuisine.trim()) return res.status(400).json({ message: 'Cuisine is required' });
  if (!area || !area.trim()) return res.status(400).json({ message: 'Area/locality is required' });
  const cleanCity = String(city || '').trim();
  const matchedCity = SERVICE_CITIES.find((c) => c.toLowerCase() === cleanCity.toLowerCase());
  if (!matchedCity) {
    return res.status(400).json({ message: 'We currently serve only Dehradun and Patna' });
  }
  if (!ownerName || !ownerName.trim()) return res.status(400).json({ message: 'Owner name is required' });
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({ message: 'A valid email is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }
  if (phone && !PHONE_RE.test(String(phone).trim())) {
    return res.status(400).json({ message: 'Phone must be a valid 10-digit mobile number' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) return res.status(400).json({ message: 'Email is already registered' });

  const restaurant = await Restaurant.create({
    name: restaurantName.trim(),
    cuisine: cuisine.trim(),
    area: area.trim(),
    city: matchedCity,
    address: address ? String(address).trim() : '',
    status: 'pending', // hidden from customers until admin approval
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: ownerName.trim(),
    email: normalizedEmail,
    phone: phone ? String(phone).trim() : '',
    passwordHash,
    role: 'restaurant',
    restaurant: restaurant._id,
    signupIp: req.ip || '',
  });

  const safe = { id: user._id, name: user.name, email: user.email, role: user.role, restaurantId: String(restaurant._id) };
  res.status(201).json({ token: signPartnerToken(user), user: safe, restaurant });
});

// GET /api/partner/riders -> my outlet's delivery boys
const getRiders = asyncHandler(async (req, res) => {
  const riders = await User.find({ restaurant: req.restaurantId, role: 'delivery' })
    .select('name phone createdAt')
    .sort({ name: 1 })
    .lean();
  const withCounts = await Promise.all(
    riders.map(async (r) => ({
      ...r,
      activeDeliveries: await Order.countDocuments({ assignedRider: r._id, status: 'on_the_way' }),
    }))
  );
  res.json(withCounts);
});

// POST /api/partner/riders { name, phone, password } -> add a delivery boy to MY outlet
const createRider = asyncHandler(async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Rider name is required' });
  const cleanPhone = String(phone || '').trim();
  if (!PHONE_RE.test(cleanPhone)) {
    return res.status(400).json({ message: 'A valid 10-digit mobile number is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }
  const existing = await User.findOne({ phone: cleanPhone });
  if (existing) return res.status(400).json({ message: 'This phone number is already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const rider = await User.create({
    name: name.trim(),
    email: `rider.${cleanPhone}@foodhub.in`, // internal only — riders log in with their phone number
    phone: cleanPhone,
    passwordHash,
    role: 'delivery',
    restaurant: req.restaurantId,
    signupIp: req.ip || '',
  });
  res.status(201).json({ id: rider._id, name: rider.name, phone: rider.phone });
});

// DELETE /api/partner/riders/:id -> remove one of MY delivery boys
const deleteRider = asyncHandler(async (req, res) => {
  const rider = await User.findById(req.params.id);
  if (!rider || rider.role !== 'delivery') {
    return res.status(404).json({ message: 'Delivery boy not found' });
  }
  if (String(rider.restaurant) !== String(req.restaurantId)) {
    return res.status(403).json({ message: "Forbidden: this rider belongs to another restaurant" });
  }
  // Unassign from any active deliveries first
  await Order.updateMany(
    { assignedRider: rider._id, status: 'on_the_way' },
    { $set: { assignedRider: null } }
  );
  await rider.deleteOne();
  res.json({ message: 'Delivery boy removed' });
});

// PATCH /api/partner/orders/:id/assign { riderId } -> assign MY delivery boy to an on-the-way order
const assignRider = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (String(order.restaurant) !== String(req.restaurantId)) {
    return res.status(403).json({ message: 'Forbidden: this order belongs to another restaurant' });
  }
  if (order.status !== 'on_the_way') {
    return res.status(400).json({ message: 'A rider can only be assigned once the order is on the way' });
  }
  const rider = await User.findById(req.body.riderId);
  if (!rider || rider.role !== 'delivery' || String(rider.restaurant) !== String(req.restaurantId)) {
    return res.status(400).json({ message: 'Invalid rider for this restaurant' });
  }
  order.assignedRider = rider._id;
  await order.save();
  // Nudge the customer's tracker so the rider info appears live
  const io = req.app.get('io');
  if (io) {
    io.to('order:' + order._id).emit('order-status', {
      orderId: String(order._id),
      status: order.status,
    });
  }
  res.json(order);
});

module.exports = {
  getMyRestaurant,
  getOrders,
  acceptOrder: transition('accept'),
  rejectOrder: transition('reject'),
  markReady: transition('ready'),
  markDelivered: transition('delivered'),
  getMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  registerRestaurant,
  getRiders,
  createRider,
  deleteRider,
  assignRider,
};
