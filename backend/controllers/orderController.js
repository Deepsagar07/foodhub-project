// Order controller: checkout, order history, and status updates.
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Coupon = require('../models/Coupon');
const asyncHandler = require('../middleware/asyncHandler');
const { calculateDiscount } = require('../utils/discount');

const PAYMENT_METHODS = ['cod', 'upi', 'card'];
const STATUSES = ['placed', 'preparing', 'on_the_way', 'delivered', 'cancelled'];

// POST /api/orders (protect)
// Body: { restaurantId, items: [{ menuItemId, qty }], address, couponCode?, paymentMethod? }
// Prices are ALWAYS taken from the database, never from the client.
const createOrder = asyncHandler(async (req, res) => {
  const { restaurantId, items, address, couponCode, paymentMethod } = req.body;

  if (!restaurantId) {
    return res.status(400).json({ message: 'restaurantId is required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Order must contain at least one item' });
  }
  if (!address || !String(address).trim()) {
    return res.status(400).json({ message: 'Delivery address is required' });
  }
  if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}` });
  }
  for (const it of items) {
    if (!it.menuItemId || !Number.isInteger(it.qty) || it.qty < 1) {
      return res.status(400).json({ message: 'Each item needs a menuItemId and a qty of at least 1' });
    }
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    return res.status(404).json({ message: 'Restaurant not found' });
  }

  // Load the real menu items and verify they exist, are available,
  // and actually belong to this restaurant
  const menuItems = await MenuItem.find({ _id: { $in: items.map((i) => i.menuItemId) } });
  const byId = new Map(menuItems.map((m) => [String(m._id), m]));

  const orderItems = [];
  for (const it of items) {
    const menuItem = byId.get(String(it.menuItemId));
    if (!menuItem) {
      return res.status(400).json({ message: `Menu item not found: ${it.menuItemId}` });
    }
    if (String(menuItem.restaurant) !== String(restaurant._id)) {
      return res.status(400).json({ message: `Item "${menuItem.name}" does not belong to this restaurant` });
    }
    if (!menuItem.isAvailable) {
      return res.status(400).json({ message: `Item "${menuItem.name}" is currently unavailable` });
    }
    // Snapshot name + price so the order is unaffected by later menu edits.
    // Cap quantity per item (frontend also enforces this; this is the safety net).
    orderItems.push({ menuItem: menuItem._id, name: menuItem.name, price: menuItem.price, qty: Math.min(it.qty, 5) });
  }

  const subtotal = orderItems.reduce((sum, it) => sum + it.price * it.qty, 0);

  // Apply coupon if one was given
  let discount = 0;
  let deliveryFee = restaurant.deliveryFee;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim() });
    const result = calculateDiscount(coupon, subtotal);
    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }
    discount = result.discount;
    if (result.freeDelivery) deliveryFee = 0;
  }

  const total = subtotal - discount + deliveryFee;

  const order = await Order.create({
    user: req.user.id,
    restaurant: restaurant._id,
    items: orderItems,
    subtotal,
    discount,
    deliveryFee,
    total,
    address: String(address).trim(),
    paymentMethod: paymentMethod || 'cod',
  });

  // Notify the restaurant's partner panel in real time (it beeps on 'new-order').
  // Note: no customer address in the payload — socket rooms aren't authenticated,
  // the panel refetches full order details over the authenticated API instead.
  const io = req.app.get('io');
  if (io) {
    io.to('restaurant:' + restaurant._id).emit('new-order', {
      orderId: String(order._id),
      items: orderItems.length,
      total: order.total,
      createdAt: order.createdAt,
    });
  }

  res.status(201).json(order);
});

// GET /api/orders (protect) -> my orders, newest first
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .populate('restaurant', 'name image')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// GET /api/orders/:id (protect) -> one order, only for its owner or an admin
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('restaurant', 'name image');
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const isOwner = String(order.user) === String(req.user.id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: this order belongs to someone else' });
  }
  res.json(order);
});

// PATCH /api/orders/:id/status (admin)  { status } -> update order status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${STATUSES.join(', ')}` });
  }
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  // Push the new status to anyone watching this order on track.html (real-time)
  req.app.get('io').to('order:' + order._id).emit('order-status', {
    orderId: String(order._id),
    status: order.status,
  });
  res.json(order);
});

module.exports = { createOrder, getMyOrders, getOrderById, updateOrderStatus };
