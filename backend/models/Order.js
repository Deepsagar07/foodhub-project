// Order model: a customer's placed order.
// Prices are snapshotted (name/price copied into items) so the order stays
// correct even if the menu price changes later.
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true }, // snapshot of the dish name
    price: { type: Number, required: true }, // snapshot of the dish price
    qty: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, 'Order must contain at least one item'],
    },
    subtotal: { type: Number, required: true, min: 0 }, // sum of item prices, before discount/fees
    discount: { type: Number, default: 0, min: 0 }, // coupon discount in rupees
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 }, // subtotal - discount + deliveryFee
    address: { type: String, required: [true, 'Delivery address is required'] },
    status: {
      type: String,
      enum: ['placed', 'preparing', 'on_the_way', 'delivered', 'cancelled'],
      default: 'placed',
    },
    paymentMethod: { type: String, enum: ['cod', 'upi', 'card'], default: 'cod' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    // The restaurant's own delivery boy assigned to this order (set by the partner)
    assignedRider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    couponCode: { type: String, default: '' }, // coupon applied (for per-user usage limits)
    // Live delivery tracking
    deliveryLat: { type: Number, default: null }, // customer delivery GPS (from checkout)
    deliveryLng: { type: Number, default: null },
    riderLat: { type: Number, default: null }, // rider's live GPS
    riderLng: { type: Number, default: null },
    riderLocationAt: { type: Date, default: null }, // last rider location update
    pickedUpAt: { type: Date, default: null }, // when rider picked up the order
    arrivedAt: { type: Date, default: null }, // when rider reached customer
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
