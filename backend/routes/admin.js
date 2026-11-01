// Admin routes: /api/admin/*  (every route here requires an admin JWT)
const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect, adminOnly } = require('../middleware/auth');
const {
  getStats,
  getAllOrders,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/adminController');

const router = express.Router();

// Multer: accept an optional dish photo, saved to backend/uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

router.use(protect, adminOnly); // everything below is admin-only

router.get('/stats', getStats);
router.get('/orders', getAllOrders);
router.post('/menu', upload.single('image'), createMenuItem);
router.put('/menu/:id', upload.single('image'), updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);

module.exports = router;
