// Shared coupon logic, used both by the "validate coupon" endpoint
// and by order creation (so both always agree on the discount).

function calculateDiscount(coupon, subtotal) {
  if (!coupon || coupon.isActive === false) {
    return { valid: false, message: 'Invalid coupon code' };
  }
  if (subtotal < coupon.minOrder) {
    return { valid: false, message: `Minimum order of ₹${coupon.minOrder} required for this coupon` };
  }
  // Percentage discount, capped at maxDiscount (rounded to whole rupees)
  const discount = Math.min(
    Math.round((subtotal * coupon.discountPercent) / 100),
    coupon.maxDiscount
  );
  return { valid: true, discount, freeDelivery: coupon.freeDelivery === true };
}

module.exports = { calculateDiscount };
