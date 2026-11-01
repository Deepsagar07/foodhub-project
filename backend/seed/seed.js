// Seed script: wipes the database and inserts demo data.
// Run with: npm run seed   (do NOT run this on a production database)
require('dotenv').config();

const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Coupon = require('../models/Coupon');

const img = (id) => `https://images.unsplash.com/${id}?w=400&q=80`;

const restaurants = [
  {
    name: 'Doon Biryani House',
    cuisine: 'Biryani',
    image: img('photo-1585937421612-70a008356fbe'),
    rating: 4.4,
    ratingCount: 128,
    deliveryTime: '30-40 min',
    deliveryFee: 39,
    address: '14, Rajpur Road, Dehradun',
  },
  {
    name: 'Pahadi Pizza Co.',
    cuisine: 'Pizza',
    image: img('photo-1565299624946-b28f40a0ae38'),
    rating: 4.2,
    ratingCount: 96,
    deliveryTime: '25-35 min',
    deliveryFee: 29,
    address: '21, Mussoorie Diversion Road, Dehradun',
  },
  {
    name: 'Doon Dragon Wok',
    cuisine: 'Chinese',
    image: img('photo-1585032226651-759b368d7246'),
    rating: 4.3,
    ratingCount: 84,
    deliveryTime: '20-30 min',
    deliveryFee: 35,
    address: '7, Clock Tower, Dehradun',
  },
  {
    name: 'Garhwal Dosa Junction',
    cuisine: 'South Indian',
    image: img('photo-1630383249896-424e482df921'),
    rating: 4.5,
    ratingCount: 152,
    deliveryTime: '15-25 min',
    deliveryFee: 25,
    address: '3, Sahastradhara Road, Dehradun',
  },
  {
    name: 'Doon Burger Barn',
    cuisine: 'Burgers',
    image: img('photo-1568901346375-23c9450c58cd'),
    rating: 4.1,
    ratingCount: 73,
    deliveryTime: '20-30 min',
    deliveryFee: 29,
    address: '9, Ballupur Chowk, Dehradun',
  },
  {
    name: 'Doon Sweet Tooth',
    cuisine: 'Desserts',
    image: img('photo-1551024506-0bccd828d307'),
    rating: 4.6,
    ratingCount: 110,
    deliveryTime: '25-35 min',
    deliveryFee: 35,
    address: '5, Jakhan, Dehradun',
  },
];

// Menu items keyed by restaurant name: [name, description, price, category, veg, imageId]
const menuData = {
  'Doon Biryani House': [
    ['Chicken Dum Biryani', 'Slow-cooked basmati layered with spiced chicken, served with raita', 249, 'Biryani', false, 'photo-1585937421612-70a008356fbe'],
    ['Mutton Biryani', 'Tender mutton pieces dum-cooked with saffron rice and fried onions', 349, 'Biryani', false, 'photo-1606491956689-2ea866880c84'],
    ['Veg Biryani', 'Fragrant basmati with seasonal vegetables, paneer and whole spices', 199, 'Biryani', true, 'photo-1589302168068-964664d93dc0'],
    ['Egg Biryani', 'Masala roasted eggs layered with dum basmati rice', 179, 'Biryani', false, 'photo-1585937421612-70a008356fbe'],
    ['Chicken Tikka (6 pc)', 'Char-grilled smoky chicken tikka with mint chutney', 229, 'Starters', false, 'photo-1599487488170-d11ec9c172f0'],
    ['Boondi Raita', 'Cooling curd with boondi and roasted cumin', 49, 'Sides', true, 'photo-1626074353765-517a681e40be'],
    ['Gulab Jamun (4 pc)', 'Soft khoya dumplings soaked in rose-cardamom syrup', 99, 'Desserts', true, 'photo-1666190092159-3171cf0fbb12'],
  ],
  'Pahadi Pizza Co.': [
    ['Margherita Classic', 'Hand-tossed base, rich tomato sauce and 100% mozzarella', 199, 'Pizza', true, 'photo-1565299624946-b28f40a0ae38'],
    ['Farmhouse Veggie', 'Onion, capsicum, mushroom, sweet corn and extra cheese', 299, 'Pizza', true, 'photo-1574071318508-1cdbab80d002'],
    ['Chicken Pepperoni', 'Loaded chicken pepperoni with double mozzarella', 349, 'Pizza', false, 'photo-1565299624946-b28f40a0ae38'],
    ['Paneer Tikka Pizza', 'Spicy paneer tikka, onion and capsicum on a cheesy base', 289, 'Pizza', true, 'photo-1574071318508-1cdbab80d002'],
    ['Garlic Breadsticks', 'Buttery breadsticks with garlic and herbs, cheesy dip', 149, 'Sides', true, 'photo-1573140247632-f8fd74997d5c'],
    ['Cheese Burst Corn', 'Corn and cheese burst crust with Italian seasoning', 279, 'Pizza', true, 'photo-1565299624946-b28f40a0ae38'],
    ['Choco Lava Cake', 'Molten chocolate core in a soft chocolate cake', 109, 'Desserts', true, 'photo-1624353365286-3f8d62daad51'],
  ],
  'Doon Dragon Wok': [
    ['Veg Hakka Noodles', 'Wok-tossed noodles with crunchy veggies and burnt garlic', 149, 'Noodles', true, 'photo-1585032226651-759b368d7246'],
    ['Chicken Schezwan Noodles', 'Fiery schezwan noodles with juicy chicken strips', 199, 'Noodles', false, 'photo-1563379091339-03b21ab4a4f8'],
    ['Veg Fried Rice', 'Smoky wok-fried rice with spring onion and carrot', 139, 'Rice', true, 'photo-1512058564366-18510be2db19'],
    ['Chicken Manchurian', 'Crisp chicken dumplings glazed in garlic-soy sauce', 219, 'Main Course', false, 'photo-1563379091339-03b21ab4a4f8'],
    ['Chilli Paneer Dry', 'Crispy paneer tossed with peppers in chilli-garlic sauce', 229, 'Starters', true, 'photo-1631452180519-c014fe946bc7'],
    ['Veg Spring Rolls (6 pc)', 'Golden crispy rolls stuffed with glass noodles and veggies', 129, 'Starters', true, 'photo-1606525437679-037aca74a3e9'],
    ['Hot & Sour Soup', 'Peppery soup loaded with mushrooms, tofu and veggies', 99, 'Soup', true, 'photo-1547592166-23ac45744acd'],
    ['Dragon Chicken', 'Signature spicy dry chicken with curry leaves and red chillies', 239, 'Main Course', false, 'photo-1563379091339-03b21ab4a4f8'],
  ],
  'Garhwal Dosa Junction': [
    ['Masala Dosa', 'Crisp golden dosa with spiced potato filling, sambar and chutneys', 99, 'Dosa', true, 'photo-1630383249896-424e482df921'],
    ['Plain Dosa', 'Classic thin and crispy dosa with sambar and coconut chutney', 79, 'Dosa', true, 'photo-1567188040759-fb8a883dc6d8'],
    ['Mysore Masala Dosa', 'Spicy red garlic chutney smeared inside a crisp masala dosa', 119, 'Dosa', true, 'photo-1630383249896-424e482df921'],
    ['Rava Onion Dosa', 'Lacy semolina crepe with onion, green chilli and pepper', 129, 'Dosa', true, 'photo-1567188040759-fb8a883dc6d8'],
    ['Idli Sambar (4 pc)', 'Pillowy steamed idlis dunked in hot sambar', 69, 'Tiffin', true, 'photo-1589301760014-d929f3979dbc'],
    ['Medu Vada (2 pc)', 'Crisp outside, fluffy inside, with sambar and chutney', 59, 'Tiffin', true, 'photo-1631452180539-96aca7d48617'],
    ['Onion Uttapam', 'Thick griddle pancake topped with onion, tomato and coriander', 109, 'Dosa', true, 'photo-1567188040759-fb8a883dc6d8'],
    ['Filter Coffee', 'Strong South Indian filter kaapi with frothed milk', 49, 'Beverages', true, 'photo-1617692855027-33b14f061079'],
  ],
  'Doon Burger Barn': [
    ['Classic Veggie Burger', 'Crispy veg patty, cheese slice, mayo and fresh veggies', 99, 'Burgers', true, 'photo-1568901346375-23c9450c58cd'],
    ['Chicken Zinger', 'Crunchy fried chicken fillet with pepper mayo in a toasted bun', 149, 'Burgers', false, 'photo-1550547660-d9450f859349'],
    ['Double Cheese Burst', 'Two patties, double cheese and smoky chipotle sauce', 179, 'Burgers', true, 'photo-1568901346375-23c9450c58cd'],
    ['Paneer Crunch Burger', 'Spiced crispy paneer patty with mint mayo', 139, 'Burgers', true, 'photo-1550547660-d9450f859349'],
    ['Peri Peri Fries', 'Crispy fries dusted with fiery peri peri masala', 109, 'Sides', true, 'photo-1571091718767-18b5b1457add'],
    ['Onion Rings', 'Beer-battered onion rings with cheesy dip', 99, 'Sides', true, 'photo-1639024471283-03518883512d'],
    ['Cold Coffee', 'Blended iced coffee topped with whipped cream', 89, 'Beverages', true, 'photo-1461023058943-07fcbe16d735'],
  ],
  'Doon Sweet Tooth': [
    ['Chocolate Truffle Pastry', 'Dense Belgian chocolate layers with ganache', 89, 'Desserts', true, 'photo-1551024506-0bccd828d307'],
    ['Red Velvet Jar', 'Red velvet crumbs layered with cream cheese frosting', 129, 'Desserts', true, 'photo-1488477181946-6428a0291777'],
    ['Gulab Jamun Cheesecake', 'Fusion cheesecake topped with mini gulab jamuns', 149, 'Desserts', true, 'photo-1533134242443-d4fd215305ad'],
    ['Brownie Sundae', 'Warm walnut brownie with vanilla ice cream and hot chocolate', 159, 'Ice Cream', true, 'photo-1563805042-7684c019e1cb'],
    ['Rasmalai (2 pc)', 'Feather-light chenna discs in saffron-cardamom milk', 99, 'Desserts', true, 'photo-1610508500445-a4592435e27e'],
    ['Kulfi Falooda', 'Traditional kulfi with vermicelli, basil seeds and rose syrup', 119, 'Ice Cream', true, 'photo-1563805042-7684c019e1cb'],
  ],
};

const coupons = [
  { code: 'WELCOME50', discountPercent: 50, maxDiscount: 120, minOrder: 199, freeDelivery: false },
  { code: 'FREEDEL', discountPercent: 0, maxDiscount: 0, minOrder: 149, freeDelivery: true },
];

async function seed() {
  await connectDB();

  // Wipe everything so re-running the seed always gives a clean database
  await require('mongoose').connection.db.dropDatabase();
  console.log('Database cleared');

  const passwordHash = (pw) => bcrypt.hash(pw, 10);
  const [adminHash, demoHash] = await Promise.all([passwordHash('admin123'), passwordHash('demo123')]);

  await User.create([
    { name: 'Admin', email: 'admin@foodhub.in', passwordHash: adminHash, role: 'admin' },
    { name: 'Demo User', email: 'demo@foodhub.in', passwordHash: demoHash, role: 'user' },
  ]);
  console.log('Users created: admin@foodhub.in / demo@foodhub.in');

  const created = await Restaurant.insertMany(restaurants);
  const idByName = new Map(created.map((r) => [r.name, r._id]));
  console.log(`Restaurants created: ${created.length}`);

  const items = [];
  for (const [restName, dishes] of Object.entries(menuData)) {
    for (const [name, description, price, category, veg, imageId] of dishes) {
      items.push({
        restaurant: idByName.get(restName),
        name,
        description,
        price,
        category,
        veg,
        image: img(imageId),
        isAvailable: true,
      });
    }
  }
  await MenuItem.insertMany(items);
  console.log(`Menu items created: ${items.length}`);

  await Coupon.insertMany(coupons);
  console.log(`Coupons created: ${coupons.map((c) => c.code).join(', ')}`);

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
