// User model: customers and admins of the food ordering app.
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' }, // e.g. Home, Work
    street: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // We store only the bcrypt hash, never the plain password
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'restaurant', 'delivery'], default: 'user' },
    // For role='restaurant': the outlet this partner account manages.
    // For role='delivery': the outlet this rider delivers for.
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    // Phone doubles as the login ID for delivery riders (10-digit Indian mobile)
    phone: { type: String, default: '', trim: true },
    // Login analytics (visible in the admin dashboard)
    lastLogin: { type: Date, default: null },
    loginCount: { type: Number, default: 0 },
    lastLoginIp: { type: String, default: '' },
    // IP address the account was created from (first join)
    signupIp: { type: String, default: '' },
    // Brute-force protection: 3 wrong passwords -> locked for 24 hours
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
