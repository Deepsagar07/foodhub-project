// Admin routes: /api/admin/*  (every route here requires an admin JWT)
const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  getStats,
  getAllOrders,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getVisits,
  getUsers,
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect, adminOnly); // everything below is admin-only

router.get('/stats', getStats);
router.get('/orders', getAllOrders);
router.get('/visits', getVisits);
router.get('/users', getUsers);
router.post('/menu', upload.single('image'), createMenuItem);
router.put('/menu/:id', upload.single('image'), updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);

module.exports = router;
