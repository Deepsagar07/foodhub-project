// Visit model: one document per page view (visitor analytics).
// Collected by the frontend beacon (POST /api/analytics/visit).
// Old visits auto-delete after 30 days so the free Atlas tier stays lean.
const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    ip: { type: String, default: '' }, // client IP (X-Forwarded-For via trust proxy)
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // set when logged in
    path: { type: String, default: '/' }, // e.g. /index.html, /restaurant.html
    userAgent: { type: String, default: '' },
    device: { type: String, default: '' }, // e.g. "Chrome · Windows"
    city: { type: String, default: '' },
    country: { type: String, default: '' },
  },
  { timestamps: true }
);

// TTL index: MongoDB deletes visits older than 30 days automatically
visitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

module.exports = mongoose.model('Visit', visitSchema);
