// Coupon controller: check whether a coupon code applies to a cart subtotal.
const Coupon = require('../models/Coupon');
const asyncHandler = require('../middleware/asyncHandler');
const { calculateDiscount } = require('../utils/discount');

// GET /api/coupons/validate?code=&subtotal=
// -> { valid: true, discount }  or  { valid: false, message }
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.query;

  if (!code) {
    return res.status(400).json({ message: 'Query param "code" is required' });
  }
  const sub = Number(subtotal);
  if (!Number.isFinite(sub) || sub < 0) {
    return res.status(400).json({ message: 'Query param "subtotal" must be a non-negative number' });
  }

  const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim() });
  const result = calculateDiscount(coupon, sub);

  if (!result.valid) {
    return res.json({ valid: false, message: result.message });
  }
  // minOrder lets the cart/checkout drop a stored coupon the moment the
  // cart falls below it, instead of showing a discount the backend will reject
  res.json({ valid: true, discount: result.discount, freeDelivery: result.freeDelivery, minOrder: coupon.minOrder });
});

// GET /api/coupons
// -> [{ code, discountPercent, maxDiscount, minOrder, freeDelivery }]
// Public list for the Offers page (no sensitive fields).
const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find(
    {},
    { code: 1, discountPercent: 1, maxDiscount: 1, minOrder: 1, freeDelivery: 1, _id: 0 }
  ).sort({ minOrder: 1 });
  res.json({ coupons });
});

module.exports = { validateCoupon, listCoupons };
