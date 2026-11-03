// LoginSession model: one record per login, so the admin dashboard can show
// every device a user/partner logged in from — IP, device, browser, location,
// login time and logout (exit) time. Old records auto-delete after 90 days.
const mongoose = require('mongoose');

const loginSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  device: { type: String, default: '' }, // e.g. "Chrome · Windows"
  browser: { type: String, default: '' }, // e.g. "Chrome"
  city: { type: String, default: '' },
  country: { type: String, default: '' },
  loginAt: { type: Date, default: Date.now },
  // Set when the user clicks Logout; stays null if they just closed the tab/app
  logoutAt: { type: Date, default: null },
});

// Index for "latest open session of this user" lookups on logout
loginSessionSchema.index({ user: 1, loginAt: -1 });
// Auto-cleanup: delete sessions 90 days after login
loginSessionSchema.index({ loginAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('LoginSession', loginSessionSchema);
