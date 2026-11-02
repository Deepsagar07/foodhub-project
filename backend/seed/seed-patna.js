// Additive seed: Patna restaurants (Bailey Road + Kankarbagh).
// Unlike seed.js, this does NOT wipe the database — it backfills city on
// existing restaurants and inserts Patna outlets only if not already present.
// Run:  npm run seed:patna   (with MONGO_URI pointing at your database)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const img = (id) => `https://images.unsplash.com/${id}?w=400&q=80`;

const patnaRestaurants = [
  {
    name: 'Bailey Biryani House',
    cuisine: 'Biryani',
    image: img('photo-1585937421612-70a008356fbe'),
    rating: 4.3,
    ratingCount: 86,
    deliveryTime: '30-40 min',
    deliveryFee: 35,
    address: '12, Bailey Road, Patna, Bihar',
    city: 'Patna',
    area: 'Bailey Road',
  },
  {
    name: 'Patna Pizza Point',
    cuisine: 'Pizza',
    image: img('photo-1565299624946-b28f40a0ae38'),
    rating: 4.1,
    ratingCount: 64,
    deliveryTime: '25-35 min',
    deliveryFee: 29,
    address: '45, Bailey Road, Patna, Bihar',
    city: 'Patna',
    area: 'Bailey Road',
  },
  {
    name: 'Kankarbagh Dosa Corner',
    cuisine: 'South Indian',
    image: img('photo-1630383249896-424e482df921'),
    rating: 4.4,
    ratingCount: 112,
    deliveryTime: '20-30 min',
    deliveryFee: 25,
    address: '8, Kankarbagh, Patna, Bihar',
    city: 'Patna',
    area: 'Kankarbagh',
  },
  {
    name: 'Kankarbagh Food Junction',
    cuisine: 'North Indian',
    image: img('photo-1585937421612-70a008356fbe'),
    rating: 4.2,
    ratingCount: 78,
    deliveryTime: '30-40 min',
    deliveryFee: 30,
    address: '23, Kankarbagh, Patna, Bihar',
    city: 'Patna',
    area: 'Kankarbagh',
  },
];

// [restaurantName, [name, description, price, category, veg, imageId]]
const patnaMenus = {
  'Bailey Biryani House': [
    ['Chicken Dum Biryani', 'Slow-cooked basmati layered with spiced chicken, served with raita', 249, 'Biryani', false, 'photo-1585937421612-70a008356fbe'],
    ['Veg Biryani', 'Fragrant basmati tossed with garden vegetables and saffron', 199, 'Biryani', true, 'photo-1585937421612-70a008356fbe'],
    ['Egg Biryani', 'Masala roasted eggs layered with dum basmati rice', 179, 'Biryani', false, 'photo-1585937421612-70a008356fbe'],
    ['Chicken Tikka (6 pc)', 'Char-grilled smoky chicken tikka with mint chutney', 229, 'Starters', false, 'photo-1599487488170-d11ec9c172f0'],
    ['Gulab Jamun (4 pc)', 'Soft khoya dumplings soaked in rose syrup', 99, 'Desserts', true, 'photo-1666190092159-3171cf0fbb12'],
  ],
  'Patna Pizza Point': [
    ['Margherita Classic', 'Hand-tossed base, rich tomato sauce and mozzarella', 199, 'Pizza', true, 'photo-1574071318508-1cdbab80d002'],
    ['Farmhouse Veggie', 'Onion, capsicum, mushroom, sweet corn and extra cheese', 299, 'Pizza', true, 'photo-1574071318508-1cdbab80d002'],
    ['Chicken Pepperoni', 'Loaded chicken pepperoni with double mozzarella', 349, 'Pizza', false, 'photo-1565299624946-b28f40a0ae38'],
    ['Garlic Breadsticks', 'Baked sticks with garlic butter and cheese dip', 129, 'Sides', true, 'photo-1573140247632-f8fd74997d5c'],
    ['Choco Lava Cake', 'Molten chocolate cake, served warm', 109, 'Desserts', true, 'photo-1624353365286-3f8d62daad51'],
  ],
  'Kankarbagh Dosa Corner': [
    ['Masala Dosa', 'Crisp golden dosa with spiced potato filling and sambar', 120, 'Dosa', true, 'photo-1630383249896-424e482df921'],
    ['Mysore Masala Dosa', 'Fiery red chutney smeared dosa with potato masala', 150, 'Dosa', true, 'photo-1630383249896-424e482df921'],
    ['Idli Sambar (4 pc)', 'Steamed idlis served with hot sambar and chutneys', 80, 'Breakfast', true, 'photo-1589301760014-d929f3979dbc'],
    ['Medu Vada (4 pc)', 'Crisp lentil doughnuts with coconut chutney', 90, 'Breakfast', true, 'photo-1631452180519-c014fe946bc7'],
    ['Filter Coffee', 'Traditional South Indian strong filter coffee', 60, 'Beverages', true, 'photo-1617692855027-33b14f061079'],
  ],
  'Kankarbagh Food Junction': [
    ['Paneer Butter Masala', 'Cottage cheese in rich tomato-cashew gravy with naan', 220, 'Main Course', true, 'photo-1631452180539-96aca7d48617'],
    ['Chicken Curry + Rice', 'Homestyle chicken curry served with steamed rice', 240, 'Main Course', false, 'photo-1565557623262-b51c2513a641'],
    ['Veg Fried Rice', 'Smoky wok-tossed rice with crunchy vegetables', 150, 'Chinese', true, 'photo-1603133872878-684f208fb0b6'],
    ['Chilli Paneer', 'Crisp paneer tossed in spicy chilli-garlic sauce', 200, 'Chinese', true, 'photo-1567188040759-fb8a883e3e4c'],
    ['Sweet Lassi', 'Thick curd lassi topped with malai and pistachio', 80, 'Beverages', true, 'photo-1626200419199-391ae4be7a41'],
  ],
};

// Locality each outlet serves (used for area-level filtering on the homepage).
const AREA_BY_NAME = {
  'Doon Biryani House': 'Rajpur Road',
  'Pahadi Pizza Co.': 'Mussoorie Diversion',
  'Doon Dragon Wok': 'Clock Tower',
  'Garhwal Dosa Junction': 'Sahastradhara Road',
  'Doon Burger Barn': 'Ballupur',
  'Doon Sweet Tooth': 'Jakhan',
  'Bailey Biryani House': 'Bailey Road',
  'Patna Pizza Point': 'Bailey Road',
  'Kankarbagh Dosa Corner': 'Kankarbagh',
  'Kankarbagh Food Junction': 'Kankarbagh',
};

async function seedPatna() {
  await connectDB();

  // Backfill: existing restaurants (seeded before the city field) belong to Dehradun
  const backfilled = await Restaurant.updateMany(
    { city: { $exists: false } },
    { $set: { city: 'Dehradun' } }
  );
  console.log(`Backfilled city=Dehradun on ${backfilled.modifiedCount} restaurants`);

  // Backfill: serving area for restaurants that don't have one yet
  let areaCount = 0;
  for (const [name, area] of Object.entries(AREA_BY_NAME)) {
    const r = await Restaurant.updateMany(
      { name, area: { $in: [null, ''] } },
      { $set: { area } }
    );
    areaCount += r.modifiedCount;
  }
  console.log(`Backfilled area on ${areaCount} restaurants`);

  // Idempotent: skip Patna inserts if they already exist (backfills above still ran)
  const existing = await Restaurant.countDocuments({ city: 'Patna' });
  if (existing > 0) {
    console.log(`Patna already seeded (${existing} restaurants) — nothing to do`);
    process.exit(0);
  }

  const created = await Restaurant.insertMany(patnaRestaurants);
  const idByName = new Map(created.map((r) => [r.name, r._id]));
  console.log(`Patna restaurants created: ${created.length}`);

  const items = [];
  for (const [restName, dishes] of Object.entries(patnaMenus)) {
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
  console.log(`Patna menu items created: ${items.length}`);

  console.log('Patna seeding complete');
  process.exit(0);
}

seedPatna().catch((err) => {
  console.error('Patna seeding failed:', err);
  process.exit(1);
});
