// Entry point: sets up Express, connects to MongoDB, mounts routes, handles errors.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { securityHeaders, rateLimit } = require('./middleware/security');

const app = express();

// Secure response headers on every request
app.use(securityHeaders);
// Allow the frontend (running on a different origin) to call this API
app.use(cors());
// Parse JSON request bodies
app.use(express.json());

// Serve uploaded food images, e.g. GET /uploads/169999.jpg
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Connect to MongoDB before serving requests
connectDB();

// --- Route mounting (MVC: routes -> controllers -> models) ---
// Auth routes are rate-limited: max 100 attempts per IP per 15 minutes (brute-force protection)
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
// Reviews live under a restaurant: /api/restaurants/:id/reviews
app.use('/api/restaurants/:id/reviews', require('./routes/reviews'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/stats', require('./routes/stats')); // public live counters (no auth)
app.use('/api/admin', require('./routes/admin'));
app.use('/api/partner', require('./routes/partner')); // restaurant-side order management

// Simple health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 404 for any unknown route — always the same { message } shape
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Central error handler (must be registered last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// --- Real-time order tracking (socket.io) ---
// The HTTP server wraps Express so websockets share the same port.
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io); // controllers reach it via req.app.get('io')

io.on('connection', (socket) => {
  // track.html joins its order's room: socket.emit('join-order', orderId)
  socket.on('join-order', (orderId) => {
    if (orderId) socket.join('order:' + orderId);
  });
  // partner.html joins its restaurant's room: socket.emit('join-restaurant', restaurantId)
  socket.on('join-restaurant', (restaurantId) => {
    if (restaurantId) socket.join('restaurant:' + restaurantId);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
