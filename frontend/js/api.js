/* ============================================================
   FoodHub — API client
   Single place that knows the backend address. Every page talks
   to the server through apiFetch(), so auth headers and error
   handling stay consistent.
   ============================================================ */

// 👇 Deploy karne ke baad apne Render backend ka URL yahan likho,
//    e.g. "https://foodhub-backend-xyz.onrender.com/api"
const DEPLOYED_API = "https://foodhub-project-l5x9.onrender.com/api";

// Local machine par localhost:5000, internet par (deployed site) DEPLOYED_API
const IS_LOCAL = ["localhost", "127.0.0.1", ""].includes(location.hostname) || location.protocol === "file:";
const API_BASE = IS_LOCAL ? "http://localhost:5000/api" : DEPLOYED_API;
// Origin of the backend server (used for uploaded images served at /uploads/...)
const API_ORIGIN = IS_LOCAL ? "http://localhost:5000" : DEPLOYED_API.replace(/\/api$/, "");

/**
 * Resolve an image path to a full URL. Uploaded dish photos are stored
 * as "/uploads/xyz.jpg" (served by the backend), so they need the
 * backend origin prefix; absolute URLs are returned unchanged.
 */
function imgUrl(u) {
  u = String(u || "");
  return u.startsWith("/uploads/") ? API_ORIGIN + u : u;
}

/**
 * fetch wrapper for the backend.
 * @param {string} path   e.g. "/restaurants?search=pizza"
 * @param {object} opts   { method, body, auth }
 *   - auth: true  -> attach "Authorization: Bearer <token>"
 * On 401 the user is logged out and sent to login.html.
 * On other errors it throws an Error with the server's message.
 */
async function apiFetch(path, { method = "GET", body = null, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  // Attach JWT from localStorage when the endpoint needs login
  if (auth) {
    const token = localStorage.getItem("fh_token");
    if (token) headers["Authorization"] = "Bearer " + token;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token expired / invalid -> force re-login
  if (res.status === 401) {
    localStorage.removeItem("fh_token");
    localStorage.removeItem("fh_user");
    location.href = "login.html";
    throw new Error("Session expired. Please log in again.");
  }

  // Backend always replies JSON (even for errors)
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || ("Request failed (" + res.status + ")"));
  }
  return data;
}

/** Build a URL query string from an object, skipping empty values. */
function qs(params) {
  const sp = new URLSearchParams();
  for (const k of Object.keys(params || {})) {
    if (params[k] !== undefined && params[k] !== "" && params[k] !== null) sp.set(k, params[k]);
  }
  const s = sp.toString();
  return s ? "?" + s : "";
}

/** Read a query param from the current page URL, e.g. getParam("id"). */
function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

/** Format a number as Indian rupees, e.g. 299 -> "₹299". */
function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

/** Escape user text before injecting into HTML (prevents XSS). */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
