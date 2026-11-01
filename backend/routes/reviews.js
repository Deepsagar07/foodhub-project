// Review routes: mounted at /api/restaurants/:id/reviews in server.js.
// mergeParams lets the controller read req.params.id (the restaurant id).
const express = require('express');
const { addReview, getReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/', getReviews);
router.post('/', protect, addReview);

module.exports = router;
