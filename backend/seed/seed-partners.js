// Seed restaurant partner logins: one account per restaurant (role='restaurant').
// Idempotent — skips restaurants that already have a partner account.
// Run:  npm run seed:partners   (with MONGO_URI pointing at your database)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

const PARTNER_PASSWORD = 'partner123';

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '');

async function seedPartners() {
  await connectDB();

  const restaurants = await Restaurant.find({}).sort({ name: 1 });
  console.log(`Restaurants found: ${restaurants.length}`);

  const passwordHash = await bcrypt.hash(PARTNER_PASSWORD, 10);
  let created = 0;

  for (const r of restaurants) {
    const email = `partner.${slug(r.name)}@foodhub.in`;
    const existing = await User.findOne({ email });
    if (existing) {
      // make sure the link/role is correct even for older accounts
      let fixed = false;
      if (existing.role !== 'restaurant') { existing.role = 'restaurant'; fixed = true; }
      if (String(existing.restaurant || '') !== String(r._id)) { existing.restaurant = r._id; fixed = true; }
      if (fixed) await existing.save();
      continue;
    }
    await User.create({
      name: `${r.name} (Partner)`,
      email,
      passwordHash,
      role: 'restaurant',
      restaurant: r._id,
    });
    created++;
    console.log(`+ ${email}  ->  ${r.name}`);
  }

  console.log(`\nPartner accounts created: ${created} (password for all: ${PARTNER_PASSWORD})`);
  console.log('Partner panel: open partner.html and log in with the restaurant\'s email.');
  process.exit(0);
}

seedPartners().catch((err) => {
  console.error('Partner seeding failed:', err);
  process.exit(1);
});
