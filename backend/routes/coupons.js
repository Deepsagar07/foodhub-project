// Coupon routes: /api/coupons/*
const express = require('express');
const { validateCoupon, listCoupons } = require('../controllers/couponController');

const router = express.Router();

router.get('/', listCoupons);
router.get('/validate', validateCoupon);

module.exports = router;
