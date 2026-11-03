// Partner routes: restaurant-side order management.
// All routes need a logged-in restaurant partner (role='restaurant').
const express = require('express');
const router = express.Router();
const { protect, restaurantOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const partnerController = require('../controllers/partnerController');

router.use(protect, restaurantOnly);

router.get('/me', partnerController.getMyRestaurant);
router.get('/orders', partnerController.getOrders);
router.patch('/orders/:id/accept', partnerController.acceptOrder);
router.patch('/orders/:id/reject', partnerController.rejectOrder);
router.patch('/orders/:id/ready', partnerController.markReady);
router.patch('/orders/:id/delivered', partnerController.markDelivered);

// Menu management (own restaurant only)
router.get('/menu', partnerController.getMenu);
router.post('/menu', upload.single('image'), partnerController.createMenuItem);
router.put('/menu/:id', upload.single('image'), partnerController.updateMenuItem);
router.delete('/menu/:id', partnerController.deleteMenuItem);
router.patch('/menu/:id/availability', partnerController.toggleAvailability);

module.exports = router;
