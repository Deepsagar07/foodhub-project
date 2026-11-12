// Shared coupon logic, used both by the "validate coupon" endpoint
// and by order creation (so both always agree on the discount).

function calculateDiscount(coupon, subtotal) {
  if (!coupon || coupon.isActive === false) {
    return { valid: false, message: 'Invalid coupon code' };
  }
  if (subtotal < coupon.minOrder) {
    return { valid: false, message: `Minimum order of ₹${coupon.minOrder} required for this coupon` };
  }
  // Percentage discount, capped at maxDiscount (rounded to whole rupees).
  // A maxDiscount of 0/undefined means "no cap" — only apply the cap when
  // it is a positive number (a 0 cap would otherwise silently give ₹0 off).
  const rawDiscount = Math.round((subtotal * coupon.discountPercent) / 100);
  const cap =
    typeof coupon.maxDiscount === 'number' && coupon.maxDiscount > 0
      ? coupon.maxDiscount
      : Infinity;
  const discount = Math.min(rawDiscount, cap);
  return { valid: true, discount, freeDelivery: coupon.freeDelivery === true };
}

module.exports = { calculateDiscount };
