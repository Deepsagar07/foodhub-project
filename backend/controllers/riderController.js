// Rider controller: the delivery boy's own panel.
// A logged-in rider (role='delivery') sees the orders assigned to them
// by their restaurant's partner and marks them delivered.
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

// GET /api/rider/me -> my restaurant (name shown in the rider panel header)
const getMe = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.restaurantId).select('name area city');
  res.json({ restaurant });
});

// GET /api/rider/orders -> orders assigned to ME, newest first
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ assignedRider: req.user.id })
    .populate('user', 'name phone')
    .populate('restaurant', 'name area')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(orders);
});

// PATCH /api/rider/orders/:id/delivered -> mark MY assigned order as delivered
const markDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (String(order.assignedRider) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Forbidden: this order is not assigned to you' });
  }
  if (order.status !== 'on_the_way') {
    return res.status(400).json({ message: `Cannot mark delivered: order is "${order.status}"` });
  }
  order.status = 'delivered';
  await order.save();
  emitStatus(req, order);
  res.json(order);
});

module.exports = { getMe, getOrders, markDelivered };
