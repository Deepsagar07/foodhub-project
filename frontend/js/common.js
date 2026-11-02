/* ============================================================
   FoodHub — shared UI + cart logic
   Included on every page. Handles: navbar, cart drawer,
   toasts, skeleton loaders, dark mode, image fallbacks,
   mobile bottom nav, cart store, favorites store.
   ============================================================ */

/* ---------------- Theme (dark mode) ---------------- */

function applyTheme() {
  const t = localStorage.getItem("fh_theme") || "light";
  document.documentElement.setAttribute("data-theme", t);
  document.documentElement.classList.toggle("dark", t === "dark");
}

function toggleTheme() {
  const next = (localStorage.getItem("fh_theme") || "light") === "dark" ? "light" : "dark";
  localStorage.setItem("fh_theme", next);
  applyTheme();
  // swap the icon in navbar + mobile nav
  document.querySelectorAll(".theme-icon").forEach((el) => {
    el.textContent = next === "dark" ? "☀️" : "🌙";
  });
}

/* ---------------- Toasts ---------------- */

/** Small popup message, e.g. toast("Added to cart", "success"). */
function toast(msg, type) {
  let wrap = document.getElementById("toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

/* ---------------- Skeleton loaders ---------------- */

/** n shimmering restaurant cards while data loads. */
function skeletonCards(n) {
  let html = "";
  for (let i = 0; i < n; i++) {
    html += '<div class="surface rounded-2xl overflow-hidden">'
      + '<div class="skeleton h-40 !rounded-none"></div>'
      + '<div class="p-4 space-y-2"><div class="skeleton h-4 w-3/4"></div>'
      + '<div class="skeleton h-3 w-1/2"></div></div></div>';
  }
  return html;
}

/** n shimmering text lines (for menus, lists). */
function skeletonLines(n) {
  let html = "";
  for (let i = 0; i < n; i++) {
    html += '<div class="skeleton h-16 mb-3"></div>';
  }
  return html;
}

/* ---------------- Image fallback ---------------- */

/**
 * onerror handler: swaps a broken <img> for a pretty gradient
 * placeholder so the layout never shows a broken-image icon.
 * Usage: <img src="..." onerror="imgFallback(this)">
 */
function imgFallback(img) {
  const d = document.createElement("div");
  d.className = (img.className || "") + " img-fallback";
  d.innerHTML = "🍽️";
  img.replaceWith(d);
}
window.imgFallback = imgFallback;

/* ---------------- Cart store ----------------
   localStorage "fh_cart":
   { restaurantId, items: { menuItemId: { _id,name,price,image,veg,qty } } }
   Rule: one restaurant per cart. Mixing triggers a replace warning.
------------------------------------------------ */

const Cart = {
  KEY: "fh_cart",

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || null;
    } catch (e) {
      return null;
    }
  },

  save(cart) {
    if (cart) localStorage.setItem(this.KEY, JSON.stringify(cart));
    else localStorage.removeItem(this.KEY);
    updateCartBadge();
  },

  clear() {
    this.save(null);
  },

  /** total number of items (for the navbar badge) */
  count() {
    const c = this.get();
    if (!c) return 0;
    return Object.values(c.items).reduce((s, i) => s + i.qty, 0);
  },

  /** sum of price*qty (before delivery fee / discounts) */
  subtotal() {
    const c = this.get();
    if (!c) return 0;
    return Object.values(c.items).reduce((s, i) => s + i.qty * i.price, 0);
  },

  /** add one unit of a menu item; returns false if user cancelled the replace */
  add(restaurantId, item) {
    let c = this.get();
    if (c && c.restaurantId !== restaurantId) {
      const ok = confirm("Your cart has items from another restaurant. Replace the cart?");
      if (!ok) return false;
      c = null;
    }
    if (!c) c = { restaurantId, items: {} };
    const key = String(item._id || item.id);
    if (c.items[key]) {
      c.items[key].qty += 1;
    } else {
      c.items[key] = {
        _id: key,
        name: item.name,
        price: Number(item.price) || 0,
        image: item.image || "",
        veg: !!(item.veg ?? item.isVeg),
        qty: 1,
      };
    }
    this.save(c);
    return true;
  },

  /** set quantity directly; 0 removes the item */
  setQty(menuItemId, qty) {
    const c = this.get();
    if (!c) return;
    const key = String(menuItemId);
    if (qty <= 0) delete c.items[key];
    else if (c.items[key]) c.items[key].qty = qty;
    if (Object.keys(c.items).length === 0) this.save(null);
    else this.save(c);
  },
};

/** Refresh the cart count badge in navbar + mobile nav. */
function updateCartBadge() {
  const n = Cart.count();
  document.querySelectorAll(".cart-badge").forEach((b) => {
    b.textContent = n;
    b.style.display = n > 0 ? "flex" : "none";
  });
}

/* ---------------- Favorites store ----------------
   localStorage "fh_favs": { restaurants: [obj...], dishes: [obj...] }
---------------------------------------------------- */

const Favs = {
  KEY: "fh_favs",

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || { restaurants: [], dishes: [] };
    } catch (e) {
      return { restaurants: [], dishes: [] };
    }
  },

  save(f) {
    localStorage.setItem(this.KEY, JSON.stringify(f));
  },

  isFav(kind, id) {
    return this.get()[kind].some((x) => String(x._id || x.id) === String(id));
  },

  /** toggle a restaurant/dish favorite; returns new state (true = now favorited) */
  toggle(kind, obj) {
    const f = this.get();
    const id = String(obj._id || obj.id);
    const i = f[kind].findIndex((x) => String(x._id || x.id) === id);
    if (i >= 0) {
      f[kind].splice(i, 1);
      this.save(f);
      return false;
    }
    f[kind].push(obj);
    this.save(f);
    return true;
  },
};

/* ---------------- Navbar ---------------- */

function renderNavbar() {
  const user = currentUser();
  const themeIcon = (localStorage.getItem("fh_theme") || "light") === "dark" ? "☀️" : "🌙";
  const nav = document.getElementById("navbar");
  if (!nav) return;

  nav.innerHTML =
    '<div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">'
    + '<a href="index.html" class="flex items-center gap-2 font-display font-bold text-xl">'
    + '<span class="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xl" style="background:var(--brand)">🍔</span>'
    + '<span>Food<span style="color:var(--brand)">Hub</span></span></a>'

    + '<div class="hidden md:flex items-center gap-6 text-sm font-medium">'
    + '<a href="index.html" class="hover:opacity-70">Home</a>'
    + '<a href="orders.html" class="hover:opacity-70">My Orders</a>'
    + '<a href="favorites.html" class="hover:opacity-70">Favorites</a>'
    + (isAdmin() ? '<a href="admin.html" class="hover:opacity-70">Admin</a>' : "")
    + "</div>"

    + '<div class="flex items-center gap-2">'
    + '<div class="relative" id="loc-wrap">'
    + '<button onclick="toggleLocMenu(event)" class="hidden sm:flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-xl surface hover:opacity-80" title="Set your location">📍 <span id="nav-location-label">Set location</span></button>'
    + '<div id="loc-menu" class="hidden absolute left-0 mt-2 w-56 surface rounded-xl z-50 py-2" style="box-shadow:var(--shadow)">'
    + '<button onclick="hideLocMenu();detectLocation()" class="block w-full text-left px-4 py-2 text-sm hover:opacity-70">📍 Detect my location (GPS)</button>'
    + '<button onclick="hideLocMenu();setManualLocation()" class="block w-full text-left px-4 py-2 text-sm hover:opacity-70">✎ Type location manually</button>'
    + "</div></div>"
    + '<button onclick="toggleTheme()" class="w-10 h-10 rounded-xl surface flex items-center justify-center" title="Toggle dark mode"><span class="theme-icon">' + themeIcon + "</span></button>"
    + (user ? profileDropdown(user)
        : '<a href="login.html" class="text-sm font-semibold px-4 py-2 rounded-xl btn-brand">Login</a>')
    + '<button onclick="openCartDrawer()" class="relative w-10 h-10 rounded-xl surface flex items-center justify-center" title="Cart">'
    + "🛒"
    + '<span class="cart-badge absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-white text-xs font-bold items-center justify-center" style="background:var(--brand);display:none">0</span>'
    + "</button>"
    + "</div></div>";

  updateCartBadge();
  renderNavLocation();
}

/* ---------------- Location (real nearby location via GPS) ---------------- */

/** Saved location from localStorage, or null if never detected. */
function getSavedLocation() {
  try { return JSON.parse(localStorage.getItem("fh_location")) || null; }
  catch (e) { return null; }
}

/** Show the detected area/city in the navbar (or "Set location"). */
function renderNavLocation(overrideText) {
  const el = document.getElementById("nav-location-label");
  if (!el) return;
  if (overrideText) { el.textContent = overrideText; return; }
  const loc = getSavedLocation();
  el.textContent = (loc && (loc.area || loc.city)) ? (loc.area || loc.city) : "Set location";
}

/**
 * Save a location and update the navbar.
 */
function saveLocation(loc, label) {
  localStorage.setItem("fh_location", JSON.stringify(loc));
  toast("📍 " + label, "success");
  renderNavLocation();
}

/**
 * Detect the user's real location with the browser Geolocation API and
 * reverse-geocode it (free OpenStreetMap Nominatim) to area/city/pincode.
 * Saves to localStorage and updates the navbar. Returns a Promise<loc|null>.
 */
function detectLocation() {
  renderNavLocation("Locating…");
  return new Promise(function (resolve) {
    if (!navigator.geolocation) {
      toast("Geolocation is not supported on this device", "error");
      renderNavLocation();
      return resolve(null);
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lon = pos.coords.longitude;
      fetch("https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lon + "&format=jsonv2",
        { headers: { "Accept": "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var a = (j && j.address) || {};
          var loc = {
            area: a.suburb || a.neighbourhood || a.quarter || a.village || "",
            city: a.city || a.town || a.village || a.county || "",
            pincode: (a.postcode || "").split(" ")[0],
            lat: lat, lon: lon
          };
          saveLocation(loc, (loc.area ? loc.area + ", " : "") + (loc.city || "location detected"));
          resolve(loc);
        })
        .catch(function () {
          toast("Could not look up your address", "error");
          renderNavLocation();
          resolve(null);
        });
    }, function () {
      toast("Location permission denied — allow location access and try again", "error");
      renderNavLocation();
      resolve(null);
    }, { timeout: 12000 });
  });
}

/** Let the user type an area/city manually and geocode it (no GPS needed). */
function setManualLocation() {
  var q = prompt("Enter your area or city (e.g. Rajpur Road, Dehradun):");
  if (!q || !q.trim()) return;
  geocodeAndSave(q.trim(), q.trim());
}

/** Footer locality pills: set the delivery location to that Dehradun area. */
function setLocality(name) {
  geocodeAndSave(name + ", Dehradun, Uttarakhand, India", name);
}

/** Footer locality pills: set the delivery location to that Patna area. */
function setPatnaLocality(name) {
  geocodeAndSave(name + ", Patna, Bihar, India", name);
}

/* ---------------- Serviceability: Dehradun + Patna only ---------------- */

/** Cities/areas where FoodHub delivers. Everything else -> "Coming soon". */
const SERVICEABLE = {
  Dehradun: ["Rajpur Road", "Jakhan", "Sahastradhara Road", "Ballupur", "Clock Tower", "Dalanwala", "Vasant Vihar", "Patel Nagar", "Prem Nagar", "Raipur", "Clement Town", "Mussoorie Road"],
  Patna: ["Raja Bazaar", "Patna Zoo", "Bihar Museum", "PMCH", "Patna Junction", "IGIMS", "Patliputra Junction", "Patna Secretariat", "NMCH", "Kankarbagh", "Rajendra Nagar"],
};

/**
 * Does a restaurant serve the user's picked area?
 * Token-based so small naming differences still match, e.g.
 *   user "Mussoorie Road"  <->  restaurant "Mussoorie Diversion"
 *   user "Rajpur Road"     <->  restaurant "Rajpur Road"
 * Every token of the shorter side must appear in the longer side, so
 * "Patna Junction" does NOT match the "Patliputra Junction" outlet.
 * Restaurants with no area set serve the whole city (shown everywhere).
 */
function areaMatches(userArea, restArea) {
  if (!restArea) return true;
  if (!userArea) return true;
  const tokens = (s) =>
    s.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && w !== "road");
  const uw = tokens(userArea), rw = tokens(restArea);
  if (!uw.length || !rw.length) return true;
  const allIn = (a, b) => a.every((w) => b.includes(w));
  return allIn(uw, rw) || allIn(rw, uw);
}
/**
 * Which service city the saved location belongs to: "Dehradun" | "Patna" | null.
 * null = no location saved yet, or the area is outside our service cities
 * (the site then shows a "Coming soon" state instead of restaurants).
 *
 * Detection is two-layer:
 *  1. Name match (fast): area/city string contains a known name.
 *  2. GPS radius (robust): villages near a city often reverse-geocode
 *     without the city name, so we also accept anything within 70 km
 *     of Dehradun or Patna.
 */
function getServiceCity() {
  const loc = getSavedLocation();
  if (!loc) return null;
  const hay = ((loc.area || "") + " " + (loc.city || "")).toLowerCase();
  const inList = (areas) => areas.some((a) => hay.includes(a.toLowerCase()));
  if (/patna/.test(hay) || inList(SERVICEABLE.Patna)) return "Patna";
  if (/dehradun/.test(hay) || inList(SERVICEABLE.Dehradun)) return "Dehradun";
  // GPS fallback: distance from city centres (Haversine, km)
  if (loc.lat && loc.lon) {
    const distKm = (la1, lo1, la2, lo2) => {
      const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
      const a = Math.sin(dLa / 2) ** 2 +
        Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };
    if (distKm(loc.lat, loc.lon, 30.3165, 78.0322) <= 70) return "Dehradun";
    if (distKm(loc.lat, loc.lon, 25.5941, 85.1376) <= 70) return "Patna";
  }
  return null;
}

/**
 * Geocode a query via Nominatim, save as the delivery location.
 * Returns a Promise<loc|null>.
 */
function geocodeAndSave(q, fallbackLabel) {
  renderNavLocation("Searching…");
  return fetch("https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(q) + "&format=jsonv2&addressdetails=1&limit=1",
    { headers: { "Accept": "application/json" } })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (!j || !j.length) {
        toast("Location not found — try another area or city", "error");
        renderNavLocation();
        return null;
      }
      var r0 = j[0], a = r0.address || {};
      var loc = {
        area: a.suburb || a.neighbourhood || a.quarter || a.village || "",
        city: a.city || a.town || a.village || a.county || "",
        pincode: (a.postcode || "").split(" ")[0],
        lat: parseFloat(r0.lat), lon: parseFloat(r0.lon)
      };
      saveLocation(loc, (loc.area ? loc.area + ", " : "") + (loc.city || fallbackLabel));
      return loc;
    })
    .catch(function () {
      toast("Could not find that location", "error");
      renderNavLocation();
      return null;
    });
}

/** Navbar location dropdown (GPS detect vs manual entry). */
function toggleLocMenu(e) {
  if (e) e.stopPropagation();
  var m = document.getElementById("loc-menu");
  if (m) m.classList.toggle("hidden");
}
function hideLocMenu() {
  var m = document.getElementById("loc-menu");
  if (m) m.classList.add("hidden");
}

/* ---------------- Profile dropdown ---------------- */

/** Avatar button + dropdown menu (My Orders, Favorites, Admin, Logout). */
function profileDropdown(user) {
  const initial = esc((user.name || "U").trim().charAt(0).toUpperCase());
  return '<div class="relative" id="profile-menu-wrap">'
    + '<button onclick="toggleProfileMenu(event)" class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style="background:var(--brand)" title="' + esc(user.name) + '">' + initial + "</button>"
    + '<div id="profile-menu" class="hidden absolute right-0 mt-2 w-52 surface rounded-xl z-50 py-2" style="box-shadow:var(--shadow)">'
    + '<div class="px-4 py-2 border-b" style="border-color:var(--border)">'
    + '<p class="font-semibold text-sm truncate">' + esc(user.name) + "</p>"
    + '<p class="text-xs text-muted truncate">' + esc(user.email || "") + "</p></div>"
    + '<a href="orders.html" class="block px-4 py-2 text-sm hover:opacity-70">📦 My Orders</a>'
    + '<a href="favorites.html" class="block px-4 py-2 text-sm hover:opacity-70">❤️ Favorites</a>'
    + (isAdmin() ? '<a href="admin.html" class="block px-4 py-2 text-sm hover:opacity-70">📊 Admin Dashboard</a>' : "")
    + '<button onclick="logout()" class="block w-full text-left px-4 py-2 text-sm font-medium hover:opacity-70" style="color:#dc2626">↩ Logout</button>'
    + "</div></div>";
}

function toggleProfileMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById("profile-menu");
  if (menu) menu.classList.toggle("hidden");
}

// Close the profile/location dropdowns when clicking anywhere outside them
document.addEventListener("click", function (e) {
  const menu = document.getElementById("profile-menu");
  const wrap = document.getElementById("profile-menu-wrap");
  if (menu && !menu.classList.contains("hidden") && wrap && !wrap.contains(e.target)) {
    menu.classList.add("hidden");
  }
  const locMenu = document.getElementById("loc-menu");
  const locWrap = document.getElementById("loc-wrap");
  if (locMenu && !locMenu.classList.contains("hidden") && locWrap && !locWrap.contains(e.target)) {
    locMenu.classList.add("hidden");
  }
});

/* ---------------- Mobile bottom nav ---------------- */

function renderMobileNav() {
  if (document.getElementById("mobile-nav")) return;
  const themeIcon = (localStorage.getItem("fh_theme") || "light") === "dark" ? "☀️" : "🌙";
  const el = document.createElement("nav");
  el.id = "mobile-nav";
  el.className = "md:hidden fixed bottom-0 left-0 right-0 z-40 surface border-t";
  el.style.borderTop = "1px solid var(--border)";
  el.innerHTML =
    '<div class="grid grid-cols-5 h-16 text-[11px] font-medium">'
    + mobLink("index.html", "🏠", "Home")
    + mobLink("orders.html", "📦", "Orders")
    + mobCart()
    + mobLink("favorites.html", "❤️", "Saved")
    + '<button onclick="toggleTheme()" class="flex flex-col items-center justify-center gap-1"><span class="theme-icon text-xl">' + themeIcon + "</span>Theme</button>"
    + "</div>";
  document.body.appendChild(el);
  // keep page content above the nav
  document.body.style.paddingBottom = "4.5rem";
  updateCartBadge();
}

function mobLink(href, icon, label) {
  const active = location.pathname.split("/").pop() === href;
  const color = active ? "var(--brand)" : "var(--muted)";
  return '<a href="' + href + '" class="flex flex-col items-center justify-center gap-1" style="color:' + color + '">'
    + '<span class="text-xl">' + icon + "</span>" + label + "</a>";
}

function mobCart() {
  return '<button onclick="openCartDrawer()" class="relative flex flex-col items-center justify-center gap-1" style="color:var(--muted)">'
    + '<span class="text-xl">🛒</span>Cart'
    + '<span class="cart-badge absolute top-1 right-6 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold items-center justify-center" style="background:var(--brand);display:none">0</span>'
    + "</button>";
}

/* ---------------- Cart drawer ---------------- */

function ensureDrawer() {
  if (document.getElementById("cart-drawer")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML =
    '<div id="drawer-backdrop" class="fixed inset-0 bg-black/50 z-40" onclick="closeCartDrawer()"></div>'
    + '<aside id="cart-drawer" class="fixed top-0 right-0 h-full w-[92vw] max-w-sm z-50 surface flex flex-col" style="box-shadow:var(--shadow)">'
    + '<div class="flex items-center justify-between p-4 border-b" style="border-color:var(--border)">'
    + '<h3 class="font-display font-bold text-lg">Your Cart</h3>'
    + '<button onclick="closeCartDrawer()" class="w-9 h-9 rounded-xl surface flex items-center justify-center">✕</button>'
    + "</div>"
    + '<div id="drawer-items" class="flex-1 overflow-y-auto p-4 space-y-3"></div>'
    + '<div id="drawer-footer" class="p-4 border-t" style="border-color:var(--border)"></div>'
    + "</aside>";
  document.body.appendChild(wrap.firstChild); // backdrop
  document.body.appendChild(wrap.lastChild);  // drawer
}

function openCartDrawer() {
  ensureDrawer();
  renderDrawer();
  document.getElementById("cart-drawer").classList.add("open");
  document.getElementById("drawer-backdrop").classList.add("open");
}

function closeCartDrawer() {
  const d = document.getElementById("cart-drawer");
  if (d) d.classList.remove("open");
  const b = document.getElementById("drawer-backdrop");
  if (b) b.classList.remove("open");
}

function renderDrawer() {
  const c = Cart.get();
  const itemsEl = document.getElementById("drawer-items");
  const footEl = document.getElementById("drawer-footer");
  if (!itemsEl || !footEl) return;

  if (!c || Object.keys(c.items).length === 0) {
    itemsEl.innerHTML = '<div class="text-center py-16 text-muted"><div class="text-5xl mb-3">🛒</div><p>Your cart is empty.<br>Add something tasty!</p></div>';
    footEl.innerHTML = "";
    return;
  }

  const items = Object.values(c.items);
  itemsEl.innerHTML = items.map((i) =>
    '<div class="flex gap-3 items-center surface rounded-xl p-2">'
    + (i.image
        ? '<img src="' + esc(imgUrl(i.image)) + '" onerror="imgFallback(this)" class="w-16 h-16 rounded-lg object-cover flex-shrink-0" alt="">'
        : '<div class="w-16 h-16 rounded-lg img-fallback flex-shrink-0">🍽️</div>')
    + '<div class="flex-1 min-w-0"><p class="font-medium text-sm truncate">' + esc(i.name) + "</p>"
    + '<p class="text-sm font-semibold" style="color:var(--brand-dark)">' + inr(i.price) + "</p></div>"
    + '<div class="flex items-center gap-2">'
    + '<span class="stepper-btn" onclick="drawerQty(\'' + i._id + "'," + (i.qty - 1) + ')">−</span>'
    + '<span class="font-semibold w-5 text-center">' + i.qty + "</span>"
    + '<span class="stepper-btn" onclick="drawerQty(\'' + i._id + "'," + (i.qty + 1) + ')">+</span>'
    + "</div></div>"
  ).join("");

  footEl.innerHTML =
    '<div class="flex justify-between font-semibold mb-3"><span>Subtotal</span><span>' + inr(Cart.subtotal()) + "</span></div>"
    + '<a href="cart.html" class="btn-brand w-full block text-center">Go to Cart →</a>';
}

function drawerQty(id, qty) {
  Cart.setQty(id, qty);
  renderDrawer();
}

/* ---------------- Page bootstrap ---------------- */

/** Call at the end of every page: builds navbar, mobile nav, drawer shell. */
function initCommon() {
  applyTheme();
  renderNavbar();
  renderMobileNav();
  renderFooter();
  ensureDrawer();
  updateCartBadge();
}

/* ---------------- Footer (injected on every page) ---------------- */

/** Brand SVG icon link (original logos, 24x24, currentColor — no emoji, no CDN). */
function socIcon(title, d) {
  return '<a href="#" title="' + title + '" aria-label="' + title + '" class="hover:opacity-70 transition-opacity">'
    + '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg></a>';
}

const SOC_ICONS = {
  instagram: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z",
  x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
};

function renderFooter() {
  if (document.getElementById("site-footer")) return;
  const f = document.createElement("footer");
  f.id = "site-footer";
  f.className = "mt-16 surface border-t";
  f.style.borderTop = "1px solid var(--border)";
  f.innerHTML =
    '<div class="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">'
    + '<div class="col-span-2 md:col-span-1">'
    + '<div class="flex items-center gap-2 font-display font-bold text-lg mb-3">'
    + '<span class="w-8 h-8 rounded-xl flex items-center justify-center text-white" style="background:var(--brand)">🍔</span>'
    + '<span>Food<span style="color:var(--brand)">Hub</span></span></div>'
    + '<p class="text-muted">Craving something delicious? Order from the best restaurants near you, delivered hot & fast.</p>'
    + '<div class="flex gap-4 mt-4 text-muted">'
    + socIcon("Instagram", SOC_ICONS.instagram)
    + socIcon("X", SOC_ICONS.x)
    + socIcon("Facebook", SOC_ICONS.facebook)
    + socIcon("YouTube", SOC_ICONS.youtube)
    + "</div></div>"
    + '<div><h4 class="font-display font-semibold mb-3">Company</h4>'
    + '<div class="space-y-2 text-muted">'
    + '<a href="about.html" class="block hover:opacity-70">About Us</a>'
    + '<a href="contact.html" class="block hover:opacity-70">Contact</a>'
    + '<a href="help.html" class="block hover:opacity-70">Help & FAQs</a>'
    + "</div></div>"
    + '<div><h4 class="font-display font-semibold mb-3">Explore</h4>'
    + '<div class="space-y-2 text-muted">'
    + '<a href="index.html" class="block hover:opacity-70">All Restaurants</a>'
    + '<a href="offers.html" class="block hover:opacity-70">Offers & Coupons</a>'
    + '<a href="orders.html" class="block hover:opacity-70">My Orders</a>'
    + '<a href="favorites.html" class="block hover:opacity-70">Favorites</a>'
    + "</div></div>"
    + '<div><h4 class="font-display font-semibold mb-3">Contact</h4>'
    + '<div class="space-y-2 text-muted">'
    + "<p>📧 hello@foodhub.in</p><p>📞 1800-419-0000</p><p>📍 Dehradun & Patna, India</p>"
    + "</div></div>"
    + "</div>"
    + '<div class="max-w-7xl mx-auto px-4 pb-8">'
    + '<h4 class="font-display font-semibold mb-3 text-sm">Delivering across Dehradun & Patna</h4>'
    + '<p class="text-xs text-muted mb-2 font-medium">Dehradun</p>'
    + '<div class="flex flex-wrap gap-2 mb-3">'
    + SERVICEABLE.Dehradun
        .map(c => '<button onclick="setLocality(\'' + c + '\')" class="text-xs px-3 py-1.5 rounded-full surface text-muted hover:opacity-70 hover:ring-1 hover:ring-orange-500" title="Set delivery location to ' + c + '">' + c + "</button>").join("")
    + '</div>'
    + '<p class="text-xs text-muted mb-2 font-medium">Patna</p>'
    + '<div class="flex flex-wrap gap-2">'
    + SERVICEABLE.Patna
        .map(c => '<button onclick="setPatnaLocality(\'' + c + '\')" class="text-xs px-3 py-1.5 rounded-full surface text-muted hover:opacity-70 hover:ring-1 hover:ring-orange-500" title="Set delivery location to ' + c + ", Patna" + '">' + c + ", Patna</button>").join("")
    + "</div></div>"
    + '<div class="border-t" style="border-color:var(--border)">'
    + '<div class="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-muted space-y-1">'
    + "<p>© 2026 FoodHub · All rights reserved</p>"
    + "<p>FSSAI Lic. No. 10012043001234</p>"
    + "<p>Built as a Frontend Engineering course project</p>"
    + "<p>Developed by "
    + '<span class="font-semibold" style="color:var(--brand)">Deep Sagar</span> & '
    + '<span class="font-semibold" style="color:var(--brand)">Ayush Gupta</span></p>'
    + "</div></div>";
  document.body.appendChild(f);
}
