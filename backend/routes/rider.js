// Rider routes: /api/rider/* — the delivery boy's own panel.
// All routes need a logged-in delivery rider (role='delivery').
const express = require('express');
const { protect, riderOnly } = require('../middleware/auth');
const riderController = require('../controllers/riderController');

const router = express.Router();

router.use(protect, riderOnly);

router.get('/me', riderController.getMe);
router.get('/orders', riderController.getOrders);
router.patch('/orders/:id/delivered', riderController.markDelivered);

module.exports = router;
