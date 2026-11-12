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
  if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
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
  // Pickup must happen first — otherwise the customer never sees
  // "Picked up" / the live ETA, and the order jumps straight to delivered.
  if (!order.pickedUpAt) {
    return res.status(400).json({ message: 'Pick up the order first — it has not been picked up yet' });
  }
  order.status = 'delivered';
  await order.save();
  emitStatus(req, order);
  res.json(order);
});

// POST /api/rider/location -> rider shares live GPS { orderId, lat, lng }
// Emits 'rider-location' to the order room for live tracking on track.html
const updateLocation = asyncHandler(async (req, res) => {
  const { orderId, lat, lng } = req.body;
  if (!orderId || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ message: 'orderId, lat, lng required' });
  }
  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (String(order.assignedRider) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Forbidden: this order is not assigned to you' });
  }
  order.riderLat = lat;
  order.riderLng = lng;
  order.riderLocationAt = new Date();
  // Auto-detect arrival: if rider is within 150m of delivery point, mark arrived.
  // Explicit null checks: a coordinate of exactly 0 is a real GPS value,
  // not "no GPS" (a truthiness check would wrongly skip it).
  if (order.deliveryLat != null && order.deliveryLng != null) {
    const d = haversine(lat, lng, order.deliveryLat, order.deliveryLng);
    if (d < 0.15 && !order.arrivedAt) {
      order.arrivedAt = new Date();
    }
  }
  await order.save();
  const io = req.app.get('io');
  if (io) {
    io.to('order:' + order._id).emit('rider-location', {
      orderId: String(order._id),
      lat, lng,
      arrived: !!order.arrivedAt,
      updatedAt: order.riderLocationAt,
    });
  }
  res.json({ ok: true, arrived: !!order.arrivedAt });
});

// PATCH /api/rider/orders/:id/pickedup -> rider confirms pickup (starts tracking)
const markPickedUp = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (String(order.assignedRider) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Forbidden: this order is not assigned to you' });
  }
  if (order.status !== 'on_the_way') {
    return res.status(400).json({ message: `Cannot mark picked up: order is "${order.status}"` });
  }
  order.pickedUpAt = new Date();
  await order.save();
  const io = req.app.get('io');
  if (io) {
    io.to('order:' + order._id).emit('rider-location', {
      orderId: String(order._id),
      pickedUp: true,
      pickedUpAt: order.pickedUpAt,
    });
  }
  res.json(order);
});

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = { getMe, getOrders, markDelivered, updateLocation, markPickedUp };
