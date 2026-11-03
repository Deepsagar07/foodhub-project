// Partner controller: the restaurant-side order flow.
// A logged-in restaurant partner (role='restaurant') manages ONLY their own
// outlet: its orders (accept/reject, then placed -> preparing -> on_the_way
// -> delivered) and its menu (add/edit/delete dishes, toggle availability).
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
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
    .populate('user', 'name')
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
};
