# FoodHub Backend (course project)

Express + MongoDB (Mongoose) REST API for a food ordering website.
Follows an MVC layout: `routes/` → `controllers/` → `models/`.

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then edit MONGO_URI / JWT_SECRET if needed
npm run seed                # load demo restaurants, menu, coupons, users
npm run dev                 # start with nodemon (or: npm start)
```

Seed logins: `admin@foodhub.in` / `admin123` (admin), `demo@foodhub.in` / `demo123` (user).

## API

Base URL: `http://localhost:5000/api`

Auth (send JWT as `Authorization: Bearer <token>`):

| Method | Path | Auth | Body / Query |
|---|---|---|---|
| POST | /auth/register | – | `{name, email, password}` → 201 `{token, user}` |
| POST | /auth/login | – | `{email, password}` → 200 `{token, user}` |
| GET | /auth/me | user | → current user |

Restaurants & menu:

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /restaurants?search=&cuisine= | – | list, filter by name/cuisine |
| GET | /restaurants/:id | – | restaurant + embedded menu |
| GET | /restaurants/:id/menu?category=&veg= | – | filtered menu items |
| GET | /menu/:id | – | single dish |

Orders:

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | /orders | user | `{restaurantId, items:[{menuItemId, qty}], address, couponCode?, paymentMethod?}` → 201 order (prices computed server-side) |
| GET | /orders | user | my orders, newest first |
| GET | /orders/:id | owner/admin | single order |
| PATCH | /orders/:id/status | admin | `{status}` — placed / preparing / on_the_way / delivered / cancelled |

Reviews & coupons:

| Method | Path | Auth | Body / Query |
|---|---|---|---|
| POST | /restaurants/:id/reviews | user | `{rating 1-5, comment}` → 201 (recalculates restaurant rating) |
| GET | /restaurants/:id/reviews | – | newest first |
| GET | /coupons/validate?code=&subtotal= | – | `{valid, discount}` or `{valid:false, message}` |

Admin:

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /admin/stats | admin | totals, revenue, top 5 dishes |
| GET | /admin/orders | admin | all orders, newest first |
| POST | /admin/menu | admin | create dish; multipart field `image` optional (served at `/uploads/...`) |
| PUT | /admin/menu/:id | admin | update dish |
| DELETE | /admin/menu/:id | admin | delete dish |

Errors always look like `{ "message": "..." }`.
