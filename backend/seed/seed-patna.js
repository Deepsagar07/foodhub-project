// Patna seed: replaces the old demo outlets (Bailey Road) with restaurants at
// 11 real Patna locations, and backfills city/area on existing restaurants.
// Does NOT wipe the database. Idempotent — safe to re-run.
// Run:  npm run seed:patna   (with MONGO_URI pointing at your database)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const img = (id) => `https://images.unsplash.com/${id}?w=400&q=80`;

// Old demo outlets to remove (replaced by the 11 locations below)
const OLD_PATNA_NAMES = [
  'Bailey Biryani House',
  'Patna Pizza Point',
  'Kankarbagh Dosa Corner',
  'Kankarbagh Food Junction',
];

// Locality each outlet serves (used for area-level filtering on the homepage).
const AREA_BY_NAME = {
  'Doon Biryani House': 'Rajpur Road',
  'Pahadi Pizza Co.': 'Mussoorie Diversion',
  'Doon Dragon Wok': 'Clock Tower',
  'Garhwal Dosa Junction': 'Sahastradhara Road',
  'Doon Burger Barn': 'Ballupur',
  'Doon Sweet Tooth': 'Jakhan',
  'Raja Bazaar Biryani House': 'Raja Bazaar',
  'Zoo Road Family Dhaba': 'Patna Zoo',
  'Museum Cafe Patna': 'Bihar Museum',
  'PMCH Anna Canteen': 'PMCH',
  'Junction Food Express': 'Patna Junction',
  'IGIMS Health Kitchen': 'IGIMS',
  'Patliputra Dhaba': 'Patliputra Junction',
  'Secretariat Thali House': 'Patna Secretariat',
  'NMCH Food Corner': 'NMCH',
  'Kankarbagh Pizza Point': 'Kankarbagh',
  'Rajendra Nagar Burger Barn': 'Rajendra Nagar',
};

const patnaRestaurants = [
  {
    name: 'Raja Bazaar Biryani House',
    cuisine: 'Biryani',
    image: img('photo-1585937421612-70a008356fbe'),
    rating: 4.3, ratingCount: 96,
    deliveryTime: '30-40 min', deliveryFee: 35,
    address: '15, Raja Bazaar, Patna, Bihar',
    city: 'Patna', area: 'Raja Bazaar',
  },
  {
    name: 'Zoo Road Family Dhaba',
    cuisine: 'North Indian',
    image: img('photo-1565557623262-b51c2513a641'),
    rating: 4.1, ratingCount: 74,
    deliveryTime: '25-35 min', deliveryFee: 30,
    address: 'Near Patna Zoo, Patna, Bihar',
    city: 'Patna', area: 'Patna Zoo',
  },
  {
    name: 'Museum Cafe Patna',
    cuisine: 'Cafe',
    image: img('photo-1554118811-1e0d58224f24'),
    rating: 4.4, ratingCount: 118,
    deliveryTime: '20-30 min', deliveryFee: 25,
    address: 'Near Bihar Museum, Patna, Bihar',
    city: 'Patna', area: 'Bihar Museum',
  },
  {
    name: 'PMCH Anna Canteen',
    cuisine: 'South Indian',
    image: img('photo-1630383249896-424e482df921'),
    rating: 4.2, ratingCount: 88,
    deliveryTime: '20-30 min', deliveryFee: 20,
    address: 'Near PMCH, Ashok Rajpath, Patna, Bihar',
    city: 'Patna', area: 'PMCH',
  },
  {
    name: 'Junction Food Express',
    cuisine: 'Fast Food',
    image: img('photo-1568901346375-23c9450c58cd'),
    rating: 4.0, ratingCount: 203,
    deliveryTime: '15-25 min', deliveryFee: 25,
    address: 'Station Road, Near Patna Junction, Patna, Bihar',
    city: 'Patna', area: 'Patna Junction',
  },
  {
    name: 'IGIMS Health Kitchen',
    cuisine: 'Healthy',
    image: img('photo-1512621776951-a57141f2eefd'),
    rating: 4.3, ratingCount: 67,
    deliveryTime: '25-35 min', deliveryFee: 30,
    address: 'Near IGIMS, Sheikhpura, Patna, Bihar',
    city: 'Patna', area: 'IGIMS',
  },
  {
    name: 'Patliputra Dhaba',
    cuisine: 'North Indian',
    image: img('photo-1585937421612-70a008356fbe'),
    rating: 4.2, ratingCount: 91,
    deliveryTime: '30-40 min', deliveryFee: 30,
    address: 'Near Patliputra Junction, Patna, Bihar',
    city: 'Patna', area: 'Patliputra Junction',
  },
  {
    name: 'Secretariat Thali House',
    cuisine: 'North Indian',
    image: img('photo-1596797038530-2c107229654b'),
    rating: 4.4, ratingCount: 142,
    deliveryTime: '25-35 min', deliveryFee: 25,
    address: 'Near Patna Secretariat, Patna, Bihar',
    city: 'Patna', area: 'Patna Secretariat',
  },
  {
    name: 'NMCH Food Corner',
    cuisine: 'Chinese',
    image: img('photo-1603133872878-684f208fb0b6'),
    rating: 4.1, ratingCount: 59,
    deliveryTime: '25-35 min', deliveryFee: 25,
    address: 'Near NMCH, Agamkuan, Patna, Bihar',
    city: 'Patna', area: 'NMCH',
  },
  {
    name: 'Kankarbagh Pizza Point',
    cuisine: 'Pizza',
    image: img('photo-1565299624946-b28f40a0ae38'),
    rating: 4.3, ratingCount: 127,
    deliveryTime: '25-35 min', deliveryFee: 29,
    address: 'Main Road, Kankarbagh, Patna, Bihar',
    city: 'Patna', area: 'Kankarbagh',
  },
  {
    name: 'Rajendra Nagar Burger Barn',
    cuisine: 'Burgers',
    image: img('photo-1571091718767-18b5b1457add'),
    rating: 4.2, ratingCount: 83,
    deliveryTime: '20-30 min', deliveryFee: 25,
    address: 'Rajendra Nagar, Patna, Bihar',
    city: 'Patna', area: 'Rajendra Nagar',
  },
];

// [restaurantName, [name, description, price, category, veg, imageId]]
const patnaMenus = {
  'Raja Bazaar Biryani House': [
    ['Chicken Dum Biryani', 'Slow-cooked basmati layered with spiced chicken, served with raita', 249, 'Biryani', false, 'photo-1585937421612-70a008356fbe'],
    ['Veg Biryani', 'Fragrant basmati tossed with garden vegetables and saffron', 199, 'Biryani', true, 'photo-1585937421612-70a008356fbe'],
    ['Egg Biryani', 'Masala roasted eggs layered with dum basmati rice', 179, 'Biryani', false, 'photo-1585937421612-70a008356fbe'],
    ['Chicken Tikka (6 pc)', 'Char-grilled smoky chicken tikka with mint chutney', 229, 'Starters', false, 'photo-1599487488170-d11ec9c172f0'],
    ['Gulab Jamun (4 pc)', 'Soft khoya dumplings soaked in rose syrup', 99, 'Desserts', true, 'photo-1666190092159-3171cf0fbb12'],
  ],
  'Zoo Road Family Dhaba': [
    ['Butter Chicken + Naan (2 pc)', 'Creamy tomato-butter chicken with tandoori naan', 260, 'Main Course', false, 'photo-1565557623262-b51c2513a641'],
    ['Shahi Paneer + Naan (2 pc)', 'Royal paneer curry in rich cashew gravy', 210, 'Main Course', true, 'photo-1631452180539-96aca7d48617'],
    ['Dal Tadka + Jeera Rice', 'Yellow dal tempered in ghee with cumin rice', 160, 'Main Course', true, 'photo-1585937421612-70a008356fbe'],
    ['Tandoori Chicken (Half)', 'Overnight-marinated chicken roasted in clay tandoor', 240, 'Starters', false, 'photo-1599487488170-d11ec9c172f0'],
    ['Sweet Lassi', 'Thick curd lassi topped with malai and pistachio', 80, 'Beverages', true, 'photo-1626200419199-391ae4be7a41'],
  ],
  'Museum Cafe Patna': [
    ['Cold Coffee', 'Blended iced coffee topped with whipped cream', 120, 'Beverages', true, 'photo-1461023058943-07fcbe16d735'],
    ['Veg Club Sandwich', 'Triple-layered sandwich with mint mayo and fries', 150, 'Snacks', true, 'photo-1528735602780-2552fd46c7af'],
    ['Peri Peri Fries', 'Crispy fries dusted with fiery peri peri masala', 130, 'Snacks', true, 'photo-1573080496219-bb080dd4f877'],
    ['Chocolate Brownie', 'Warm gooey brownie served with vanilla scoop', 140, 'Desserts', true, 'photo-1606313564200-e75d5e30476c'],
    ['Masala Chai', 'Slow-brewed chai with crushed ginger and cardamom', 60, 'Beverages', true, 'photo-1571934811356-5cc061b6821f'],
  ],
  'PMCH Anna Canteen': [
    ['Masala Dosa', 'Crisp golden dosa with spiced potato filling and sambar', 120, 'Dosa', true, 'photo-1630383249896-424e482df921'],
    ['Idli Sambar (4 pc)', 'Steamed idlis served with hot sambar and chutneys', 80, 'Breakfast', true, 'photo-1589301760014-d929f3979dbc'],
    ['Medu Vada (4 pc)', 'Crisp lentil doughnuts with coconut chutney', 90, 'Breakfast', true, 'photo-1631452180519-c014fe946bc7'],
    ['Onion Uttapam', 'Thick pancake topped with onion, tomato and green chilli', 130, 'Dosa', true, 'photo-1630383249896-424e482df921'],
    ['Filter Coffee', 'Traditional South Indian strong filter coffee', 60, 'Beverages', true, 'photo-1617692855027-33b14f061079'],
  ],
  'Junction Food Express': [
    ['Veg Crunch Burger', 'Crispy veg patty, cheese slice and chipotle mayo', 99, 'Burgers', true, 'photo-1568901346375-23c9450c58cd'],
    ['Chicken Zinger Burger', 'Crunchy fried chicken fillet with spicy mayo', 149, 'Burgers', false, 'photo-1568901346375-23c9450c58cd'],
    ['Masala Fries', 'Crispy fries tossed in tangy Indian masala', 110, 'Sides', true, 'photo-1573080496219-bb080dd4f877'],
    ['Veg Momos (8 pc)', 'Steamed momos with spicy red chutney', 100, 'Snacks', true, 'photo-1534422298391-e4f8c172dddb'],
    ['Oreo Thickshake', 'Cookies-and-cream shake topped with crushed Oreo', 150, 'Beverages', true, 'photo-1577805947697-89e18249d767'],
  ],
  'IGIMS Health Kitchen': [
    ['Grilled Paneer Salad', 'Smoky grilled paneer over crunchy garden greens', 180, 'Healthy', true, 'photo-1512621776951-a57141f2eefd'],
    ['Chicken Clear Soup', 'Light nourishing soup with herbs and veggies', 140, 'Healthy', false, 'photo-1547592166-23ac45744acd'],
    ['Oats Khichdi', 'Comforting oats and moong dal khichdi with ghee tadka', 150, 'Healthy', true, 'photo-1585937421612-70a008356fbe'],
    ['Fresh Fruit Bowl', 'Seasonal fruits with honey and roasted seeds', 120, 'Healthy', true, 'photo-1490474418585-ba9bad8fd0ea'],
    ['Masala Buttermilk', 'Churned curd with roasted jeera and curry leaf', 60, 'Beverages', true, 'photo-1626200419199-391ae4be7a41'],
  ],
  'Patliputra Dhaba': [
    ['Chicken Handi', 'Dhaba-style chicken slow-cooked in handi with desi masala', 260, 'Main Course', false, 'photo-1565557623262-b51c2513a641'],
    ['Dal Makhani + Tandoori Roti (2 pc)', 'Creamy black dal with whole wheat tandoori rotis', 200, 'Main Course', true, 'photo-1585937421612-70a008356fbe'],
    ['Kadhai Paneer', 'Paneer tossed with charred peppers and kadhai masala', 220, 'Main Course', true, 'photo-1631452180539-96aca7d48617'],
    ['Jeera Rice', 'Steamed basmati tempered with ghee-roasted cumin', 130, 'Rice', true, 'photo-1585937421612-70a008356fbe'],
    ['Sweet Lassi (Kulhad)', 'Thick lassi served the dhaba way in a kulhad', 80, 'Beverages', true, 'photo-1626200419199-391ae4be7a41'],
  ],
  'Secretariat Thali House': [
    ['Veg Thali', 'Dal, 2 sabzi, roti, rice, salad, papad and a sweet', 180, 'Thali', true, 'photo-1596797038530-2c107229654b'],
    ['Deluxe Thali', 'Paneer sabzi, dal makhani, 3 roti, jeera rice, dessert', 250, 'Thali', true, 'photo-1596797038530-2c107229654b'],
    ['Rajma Chawal', 'Slow-cooked rajma over steamed basmati rice', 150, 'Main Course', true, 'photo-1585937421612-70a008356fbe'],
    ['Chole Bhature', 'Amritsari chole with fluffy bhature and onions', 140, 'Main Course', true, 'photo-1626132647523-66f5bf380027'],
    ['Sweet Lassi', 'Thick curd lassi topped with malai and pistachio', 80, 'Beverages', true, 'photo-1626200419199-391ae4be7a41'],
  ],
  'NMCH Food Corner': [
    ['Veg Hakka Noodles', 'Smoky wok-tossed noodles with crunchy vegetables', 140, 'Chinese', true, 'photo-1585032226651-759b368d7246'],
    ['Chicken Fried Rice', 'Burnt-garlic fried rice with juicy chicken bits', 190, 'Chinese', false, 'photo-1603133872878-684f208fb0b6'],
    ['Chilli Paneer (Dry)', 'Crisp paneer tossed in spicy chilli-garlic sauce', 200, 'Chinese', true, 'photo-1567188040759-fb8a883e3e4c'],
    ['Veg Fried Rice', 'Classic wok-tossed rice with spring onion', 150, 'Chinese', true, 'photo-1603133872878-684f208fb0b6'],
    ['Hot & Sour Soup', 'Peppery soup loaded with mushrooms and tofu', 110, 'Chinese', true, 'photo-1547592166-23ac45744acd'],
  ],
  'Kankarbagh Pizza Point': [
    ['Margherita Classic', 'Hand-tossed base, rich tomato sauce and mozzarella', 199, 'Pizza', true, 'photo-1574071318508-1cdbab80d002'],
    ['Farmhouse Veggie', 'Onion, capsicum, mushroom, sweet corn and extra cheese', 299, 'Pizza', true, 'photo-1574071318508-1cdbab80d002'],
    ['Chicken Pepperoni', 'Loaded chicken pepperoni with double mozzarella', 349, 'Pizza', false, 'photo-1565299624946-b28f40a0ae38'],
    ['Garlic Breadsticks', 'Baked sticks with garlic butter and cheese dip', 129, 'Sides', true, 'photo-1573140247632-f8fd74997d5c'],
    ['Choco Lava Cake', 'Molten chocolate cake, served warm', 109, 'Desserts', true, 'photo-1624353365286-3f8d62daad51'],
  ],
  'Rajendra Nagar Burger Barn': [
    ['Classic Veg Burger', 'Crispy veg patty with creamy mayo in a toasted bun', 99, 'Burgers', true, 'photo-1568901346375-23c9450c58cd'],
    ['Cheese Burst Burger', 'Double cheese veg burger with jalapeños', 139, 'Burgers', true, 'photo-1553979459-d2229ba7433b'],
    ['Chicken Crispy Burger', 'Crunchy chicken patty with chipotle mayo', 159, 'Burgers', false, 'photo-1568901346375-23c9450c58cd'],
    ['Peri Peri Fries', 'Fries dusted with fiery peri peri masala', 120, 'Sides', true, 'photo-1573080496219-bb080dd4f877'],
    ['Oreo Thickshake', 'Cookies-and-cream shake topped with crushed Oreo', 150, 'Beverages', true, 'photo-1577805947697-89e18249d767'],
  ],
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

  // Remove the old demo Patna outlets (Bailey Road) + their menu items
  const oldOnes = await Restaurant.find({ name: { $in: OLD_PATNA_NAMES } });
  if (oldOnes.length > 0) {
    const ids = oldOnes.map((r) => r._id);
    const delItems = await MenuItem.deleteMany({ restaurant: { $in: ids } });
    const delRest = await Restaurant.deleteMany({ _id: { $in: ids } });
    console.log(`Removed ${delRest.deletedCount} old Patna restaurants (${delItems.deletedCount} menu items)`);
  } else {
    console.log('No old Patna restaurants to remove');
  }

  // Insert the 11 new Patna restaurants (skip any that already exist by name)
  let createdCount = 0, itemCount = 0;
  for (const r of patnaRestaurants) {
    let doc = await Restaurant.findOne({ name: r.name });
    if (!doc) {
      doc = await Restaurant.create(r);
      createdCount++;
      console.log(`+ ${r.name} (${r.area})`);
    }
    const dishes = patnaMenus[r.name] || [];
    const hasMenu = await MenuItem.countDocuments({ restaurant: doc._id });
    if (hasMenu === 0 && dishes.length > 0) {
      await MenuItem.insertMany(
        dishes.map(([name, description, price, category, veg, imageId]) => ({
          restaurant: doc._id, name, description, price, category, veg,
          image: img(imageId), isAvailable: true,
        }))
      );
      itemCount += dishes.length;
    }
  }
  console.log(`Patna restaurants created: ${createdCount}, menu items created: ${itemCount}`);
  console.log('Patna seeding complete');
  process.exit(0);
}

seedPatna().catch((err) => {
  console.error('Patna seeding failed:', err);
  process.exit(1);
});
