// Partner routes: restaurant-side order management.
// All routes need a logged-in restaurant partner (role='restaurant').
const express = require('express');
const router = express.Router();
const { protect, restaurantOnly } = require('../middleware/auth');
const partnerController = require('../controllers/partnerController');

router.use(protect, restaurantOnly);

router.get('/me', partnerController.getMyRestaurant);
router.get('/orders', partnerController.getOrders);
router.patch('/orders/:id/accept', partnerController.acceptOrder);
router.patch('/orders/:id/reject', partnerController.rejectOrder);
router.patch('/orders/:id/ready', partnerController.markReady);
router.patch('/orders/:id/delivered', partnerController.markDelivered);

module.exports = router;
