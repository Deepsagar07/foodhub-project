// Partner controller: the restaurant-side order flow.
// A logged-in restaurant partner (role='restaurant') manages ONLY their own
// outlet's orders: accept/reject incoming ones, then move them along
// placed -> preparing -> on_the_way -> delivered.
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const asyncHandler = require('../middleware/asyncHandler');

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

module.exports = {
  getMyRestaurant,
  getOrders,
  acceptOrder: transition('accept'),
  rejectOrder: transition('reject'),
  markReady: transition('ready'),
  markDelivered: transition('delivered'),
};
