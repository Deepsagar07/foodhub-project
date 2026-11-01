// MenuItem model: one dish sold by a restaurant.
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant is required'],
      index: true,
    },
    name: { type: String, required: [true, 'Dish name is required'], trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    image: { type: String, default: '' }, // URL of the dish photo
    category: { type: String, required: [true, 'Category is required'], trim: true }, // e.g. Pizza, Desserts
    veg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true }, // admin can toggle when a dish runs out
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
