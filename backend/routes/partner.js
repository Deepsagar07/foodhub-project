// Partner routes: restaurant-side order management.
// All routes need a logged-in restaurant partner (role='restaurant').
const express = require('express');
const router = express.Router();
const { protect, restaurantOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { rateLimit } = require('../middleware/security');
const partnerController = require('../controllers/partnerController');

// PUBLIC: a restaurant owner registers their own outlet (no login needed).
// Strictly rate-limited (5/hour per IP) so bots can't spam fake restaurants.
router.post('/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }), partnerController.registerRestaurant);

router.use(protect, restaurantOnly);

router.get('/me', partnerController.getMyRestaurant);
router.get('/orders', partnerController.getOrders);
router.patch('/orders/:id/accept', partnerController.acceptOrder);
router.patch('/orders/:id/reject', partnerController.rejectOrder);
router.patch('/orders/:id/ready', partnerController.markReady);
router.patch('/orders/:id/delivered', partnerController.markDelivered);
router.patch('/orders/:id/assign', partnerController.assignRider);

// Delivery boys (own restaurant only)
router.get('/riders', partnerController.getRiders);
router.post('/riders', partnerController.createRider);
router.delete('/riders/:id', partnerController.deleteRider);

// Menu management (own restaurant only)
router.get('/menu', partnerController.getMenu);
router.post('/menu', upload.single('image'), partnerController.createMenuItem);
router.put('/menu/:id', upload.single('image'), partnerController.updateMenuItem);
router.delete('/menu/:id', partnerController.deleteMenuItem);
router.patch('/menu/:id/availability', partnerController.toggleAvailability);

module.exports = router;
