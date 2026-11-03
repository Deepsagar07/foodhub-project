// Coupon model: discount codes customers can apply at checkout.
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 }, // e.g. 50 = 50% off
    maxDiscount: { type: Number, default: 0, min: 0 }, // cap on the discount, in rupees
    minOrder: { type: Number, default: 0, min: 0 }, // minimum subtotal to use the coupon
    freeDelivery: { type: Boolean, default: false }, // e.g. FREEDEL waives the delivery fee
    isActive: { type: Boolean, default: true }, // admin can disable a coupon
    maxUsesPerUser: { type: Number, default: 1, min: 1 }, // how many times one account can use this code
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
