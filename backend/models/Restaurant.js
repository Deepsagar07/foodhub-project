// Restaurant model: one food outlet listed on the platform.
const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Restaurant name is required'], trim: true },
    cuisine: { type: String, required: [true, 'Cuisine is required'], trim: true }, // e.g. Biryani, Pizza
    image: { type: String, default: '' }, // URL of the restaurant/food photo
    rating: { type: Number, default: 0, min: 0, max: 5 }, // average of all reviews
    ratingCount: { type: Number, default: 0 }, // how many reviews produced the average
    deliveryTime: { type: String, default: '30-40 min' }, // display string, e.g. "25-35 min"
    deliveryFee: { type: Number, default: 0, min: 0 }, // in rupees
    address: { type: String, default: '' },
    city: { type: String, default: 'Dehradun', trim: true, index: true }, // service city: Dehradun | Patna
    area: { type: String, default: '', trim: true }, // locality the outlet serves, e.g. "Rajpur Road"
    // Self-registered restaurants start as 'pending' (hidden from customers)
    // until an admin approves them. 'suspended' = hidden by the admin
    // (recoverable). Older restaurants have no status field and are treated
    // as active by queries using { status: { $nin: ['pending', 'suspended'] } }.
    status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'active', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
