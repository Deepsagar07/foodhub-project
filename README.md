# 🍔 FoodHub — Food Ordering Website

A full-stack food ordering web app built as a **Frontend Engineering course project**,
focused on **Dehradun** — all restaurants, delivery areas and contact details are Dehradun-based.
Customers can browse restaurants, filter by cuisine, manage a cart, apply coupons,
check out, and track their order live. An admin dashboard manages the menu, orders,
and sales analytics.

**Tech hygiene (no outdated/vulnerable stack):** current stable dependencies (Express 4 LTS,
Mongoose 8, Multer 2.x, bcryptjs 3.x), secure HTTP headers + auth rate-limiting via
zero-dependency middleware (`backend/middleware/security.js`), server-side price/coupon
validation, and `engines: node >= 18`.

## ✨ Features

**Customer**
- 🏠 Home page with hero search, cuisine chips (Biryani, Pizza, Chinese, South Indian, Burgers, Desserts)
- 🔍 Live restaurant search + cuisine filter (backend-powered)
- 🍽️ Restaurant page: menu grouped by category, veg-only toggle, ADD/quantity steppers
- ⭐ Reviews: read and post ratings (login required)
- 🛒 Slide-in cart drawer + full cart page with coupon codes and bill breakdown
- 💳 Checkout: address form (validated), mock UPI/Card/COD payment
- 🛵 Live order tracking timeline (Placed → Preparing → On the way → Delivered), auto-refresh every 10s
- 📦 Order history with one-click **Reorder**
- ❤️ Favorites (restaurants & dishes, saved locally)
- 🌙 Dark mode, fully responsive mobile-first design, mobile bottom nav
- 🦶 Footer on every page (company, explore & contact links)
- 🏷️ Offers page: live coupons from the backend with one-tap copy
- ❓ Help & FAQ page with contact info
- ℹ️ About Us page (story, mission, how-it-works) and 📞 Contact page (message form, info cards, live Dehradun map)
- 🔀 Homepage sorting: Popular / Rating / Fastest delivery
- 📍 Real nearby restaurants, cafes & food courts via GPS + OpenStreetMap (no API key)
- 🔍 Live search suggestions as you type
- 🖼️ Food category tiles with photos, auto-rotating offer banner carousel
- 🏷️ Offer badges on restaurant cards (50% OFF, delivery time)
- 📱 "Get the App" section, trust stats band, "We deliver to" cities + FSSAI license in footer

**Admin**
- 📊 Dashboard: stat cards (orders, revenue, users, restaurants)
- 📈 Chart.js bar chart of top dishes
- 🍽️ Menu manager: add / edit / delete dishes with image URLs
- 📦 Orders manager: update order status from a dropdown

## 🗺️ Syllabus Mapping — which file demonstrates what

| Syllabus topic | Demonstrated in |
|---|---|
| **HTML** | Every page in `frontend/`: `index.html`, `restaurant.html`, `cart.html`, `checkout.html`, `track.html`, `orders.html`, `favorites.html`, `login.html`, `signup.html`, `admin.html` — semantic structure, forms, tables, modals |
| **CSS** | `frontend/css/style.css` — Google Fonts, CSS variables, dark-mode theme, skeleton shimmer, toast + timeline animations, custom components. Plus Tailwind utility classes in every page |
| **JavaScript** | `frontend/js/api.js` (fetch wrapper, JWT header, 401 handling), `frontend/js/auth.js` (login/signup/guards), `frontend/js/common.js` (navbar, cart drawer, cart store in localStorage, favorites, toasts, theme), and each page's script (search/filter, steppers, coupon validation, 10s tracking poll, Chart.js) |
| **NodeJS** | `backend/` — Express server, REST routes, JWT auth middleware, bcrypt password hashing, request validation |
| **Application Design** | MVC separation (`routes/` → `controllers/` → `models/`), REST API design, frontend/backend split over HTTP+JSON, auth middleware, centralized error handling, layered folder structure |
| **MongoDB** | `backend/models/` — Mongoose schemas for User, Restaurant, MenuItem, Order, Review, Coupon; `backend/seed.js` inserts sample data |

## 🚀 Setup

**1. Install MongoDB** — locally ([mongodb.com/try/download/community](https://www.mongodb.com/try/download/community),
make sure `mongod` is running), or create a free cluster on MongoDB Atlas and use its connection string.

**2. Install backend dependencies**
```bash
cd backend
npm install
```

**3. Configure environment**
```bash
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
```
Then edit `.env`: set `MONGO_URI` (default `mongodb://127.0.0.1:27017/foodhub`) and a `JWT_SECRET`.

**4. Seed sample data** (restaurants, menus, a coupon, an admin user)
```bash
npm run seed
```

**5. Start the backend**
```bash
npm run dev
```
API runs at `http://localhost:5000/api`.

**6. Open the frontend** — serve `frontend/` with any static server (VS Code **Live Server**
extension recommended — right-click `frontend/index.html` → *Open with Live Server*), then browse the site.
The frontend calls the API at `http://localhost:5000/api` (see `frontend/js/api.js`).

> Admin login after seeding: `admin@foodhub.in` / `admin123` (role `admin`) → opens `admin.html`.
> Demo customer: `demo@foodhub.in` / `demo123`.
> Try coupon codes `WELCOME50` (50% off up to ₹120, min order ₹199) and `FREEDEL` (free delivery, min order ₹149).

## 🌐 Deployment (make it visitable by anyone)

Everything below has a free tier — total cost ₹0.

**1. Push the code to GitHub** — create a repo and push the whole `foodhub-project` folder.

**2. Cloud database (MongoDB Atlas)** — [cloud.mongodb.com](https://cloud.mongodb.com) → free M0 cluster →
Connect → copy the connection string (looks like `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/foodhub`).
Seed it once from your laptop:
```bash
cd backend
MONGO_URI="<atlas-string>" npm run seed        # macOS/Linux
# Windows (PowerShell):  $env:MONGO_URI="<atlas-string>"; npm run seed
```

**3. Backend on Render** — [render.com](https://render.com) → New → Web Service → connect your GitHub repo →
Root Directory: `backend`, Build Command: `npm install`, Start Command: `npm start`.
Add Environment Variables: `MONGO_URI` = your Atlas string, `JWT_SECRET` = any long random text.
Deploy → you'll get a URL like `https://foodhub-backend-xyz.onrender.com`.

**4. Frontend on Vercel** — [vercel.com](https://vercel.com) → New Project → same repo, but set
Root Directory to `frontend` (it's a static site, no build needed). You'll get
`https://foodhub-xyz.vercel.app`.

**5. Connect them** — in `frontend/js/api.js`, set `DEPLOYED_API` to your Render URL
(e.g. `"https://foodhub-backend-xyz.onrender.com/api"`), commit & push → Vercel redeploys automatically.
The file already auto-switches: localhost on your machine, Render URL on the live site.

> Note: Render's free tier sleeps after inactivity — the first visit may take ~30 seconds to wake up.
> Uploaded dish photos (multer `/uploads/`) are ephemeral on free Render; for a course demo this is fine.

## 🔌 API Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | – | `{name, email, password}` → `{token, user}` |
| POST | `/auth/login` | – | `{email, password}` → `{token, user}` |
| GET | `/auth/me` | ✅ | Current user profile |
| GET | `/restaurants?search=&cuisine=` | – | List restaurants (search + cuisine filter) |
| GET | `/restaurants/:id` | – | One restaurant, includes its menu |
| GET | `/restaurants/:id/menu?category=&veg=` | – | Menu items with filters |
| POST | `/restaurants/:id/reviews` | ✅ | `{rating, comment}` — post a review |
| GET | `/restaurants/:id/reviews` | – | List reviews |
| GET | `/coupons` | – | List all coupons (Offers page) |
| GET | `/coupons/validate?code=&subtotal=` | – | Validate coupon, returns discount |
| POST | `/orders` | ✅ | `{restaurantId, items:[{menuItemId, qty}], address, couponCode?, paymentMethod}` |
| GET | `/orders` | ✅ | Logged-in user's order history |
| GET | `/orders/:id` | ✅ | Single order (for tracking) |
| PATCH | `/orders/:id/status` | ✅ admin | `{status}` — update order status |
| GET | `/admin/stats` | ✅ admin | Orders, revenue, users, restaurants, top dishes |
| GET | `/admin/orders` | ✅ admin | All orders |
| POST | `/admin/menu` | ✅ admin | Add a dish (multipart/form-data; text fields + optional `image` photo upload) |
| PUT | `/admin/menu/:id` | ✅ admin | Edit a dish (multipart/form-data) |
| DELETE | `/admin/menu/:id` | ✅ admin | Delete a dish |

## 🏗️ Architecture

```
┌─────────────────────────┐      HTTP + JSON        ┌──────────────────────────┐
│  BROWSER (frontend/)    │  ────────────────────►  │  EXPRESS REST API        │
│  HTML + CSS + Tailwind  │                         │  Node.js  (backend/)     │
│  vanilla JavaScript     │  ◄────────────────────  │  :5000/api               │
│  JWT in localStorage    │   Authorization:        │  routes → controllers    │
│                         │   Bearer <token>        │       → models           │
└─────────────────────────┘                         └────────────┬─────────────┘
                                                                 │ Mongoose
                                                                 ▼
                                                      ┌──────────────────────┐
                                                      │  MongoDB             │
                                                      │  users, restaurants, │
                                                      │  menuitems, orders,  │
                                                      │  reviews, coupons    │
                                                      └──────────────────────┘
```

- **Frontend** is static (no build step): each page fetches JSON from the API and renders it.
- **Backend** is stateless: every protected request carries a JWT; the server verifies it in middleware.
- **Database** persists users, restaurants, menus, orders, reviews, coupons.

## ❓ Viva Q&A (15)

**1. What does your project do?**
FoodHub is a food ordering website: browse restaurants, add dishes to a cart, apply coupons, check out, track the order live, and an admin manages menu/orders/analytics.

**2. What is the tech stack and why?**
Vanilla HTML/CSS/JS + Tailwind on the frontend, Node.js + Express REST API on the backend, MongoDB with Mongoose. Separation lets the frontend and backend evolve and deploy independently.

**3. Why separate frontend and backend instead of one app?**
It follows the client-server model: the backend exposes data over HTTP/JSON, so the same API could later serve a mobile app. It also enforces security — the browser never touches the database directly.

**4. What is a REST API? Give an example.**
An API that uses HTTP methods on resource URLs. Example: `GET /api/restaurants?cuisine=Pizza` reads data, `POST /api/orders` creates an order, `PATCH /api/orders/:id/status` updates one.

**5. How does login work in your app?**
`POST /api/auth/login` checks the email/password; the server returns a JWT. The frontend stores it in `localStorage` (`fh_token`) and sends it as `Authorization: Bearer <token>` on protected calls (`js/api.js`).

**6. Where and how is the password stored?**
Never in plain text. The backend hashes it with **bcrypt** before saving to MongoDB, and compares hashes at login.

**7. What is Mongoose / a schema?**
Mongoose is an ODM for MongoDB. A schema defines a collection's shape — e.g. the Order schema has `restaurantId`, `items`, `address`, `status`, `total` — with types and validation.

**8. How does the cart work?**
The cart lives in `localStorage` (`fh_cart`) as `{ restaurantId, items: { id: {…item, qty} } }`. Only one restaurant per cart — adding from another restaurant asks before replacing. The navbar badge updates everywhere via `updateCartBadge()`.

**9. How is dark mode implemented?**
CSS variables in `style.css` (`:root` vs `[data-theme="dark"]`), toggled by `toggleTheme()` in `common.js` and persisted in `localStorage`. Tailwind uses class-based dark mode on the same toggle.

**10. What happens when the user clicks "Place Order"?**
`checkout.html` validates the address form, then `POST /api/orders` sends restaurant, items, address, coupon, payment method. The backend creates the order, the frontend clears the cart and redirects to `track.html?id=…`.

**11. How does live order tracking update?**
`track.html` polls `GET /api/orders/:id` every 10 seconds (`setInterval`) and re-renders the timeline: Placed → Preparing → On the way → Delivered. Polling stops at Delivered.

**12. What is Express middleware? Where do you use it?**
Functions that run before a route handler. We use auth middleware to verify the JWT and reject unauthenticated requests, plus JSON body parsing and a central error handler.

**13. How are admin pages protected?**
Two layers: frontend `requireAdmin()` in `auth.js` redirects non-admins, and the backend checks `user.role === "admin"` on every `/api/admin/*` route — the backend check is the real security.

**14. What is CORS and why do you need it?**
Browsers block `fetch` from one origin (Live Server, port 5500) to another (API, port 5000) unless the server allows it. The backend enables CORS so the frontend can call the API.

**15. How would you deploy this project?**
Backend on Render/Railway with `MONGO_URI` pointing to MongoDB Atlas, frontend on Vercel/Netlify as static files, `API_BASE` in `js/api.js` changed to the deployed API URL, secrets in environment variables.

## 📁 Folder Structure

```
food-ordering-website/
├── README.md
├── frontend/                 # static site — no build step
│   ├── index.html            # home: hero, search, cuisine chips, restaurant grid
│   ├── restaurant.html       # menu, veg filter, reviews
│   ├── cart.html             # cart + coupons + bill
│   ├── checkout.html         # address + payment (login required)
│   ├── track.html            # live order tracking (login required)
│   ├── orders.html           # order history + reorder (login required)
│   ├── favorites.html        # saved restaurants/dishes
│   ├── login.html / signup.html
│   ├── admin.html            # dashboard, Chart.js, menu & order management
│   ├── css/style.css         # theme, fonts, animations, components
│   └── js/
│       ├── api.js            # API_BASE + fetch wrapper + helpers
│       ├── auth.js           # login/signup/logout + route guards
│       └── common.js         # navbar, cart drawer, cart/favorites stores, toasts, theme
└── backend/                  # Express + Mongoose API
    ├── server.js / app.js
    ├── routes/  controllers/  models/  middleware/
    ├── seed.js
    └── .env.example
```
