/* ============================================================
   FoodHub — auth helpers
   Token + user profile live in localStorage:
     fh_token -> JWT string
     fh_user  -> { _id, name, email, role }
   role is "admin" for the restaurant owner, "user" otherwise.
   ============================================================ */

/** Sign up, save token + user, return the user object. */
async function signup(name, email, password) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
  localStorage.setItem("fh_token", data.token);
  localStorage.setItem("fh_user", JSON.stringify(data.user));
  return data.user;
}

/** Log in, save token + user, return the user object. */
async function login(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  localStorage.setItem("fh_token", data.token);
  localStorage.setItem("fh_user", JSON.stringify(data.user));
  return data.user;
}

/** Log out: tell the server (marks this login session as exited), clear session and go home. */
function logout() {
  try {
    const t = localStorage.getItem("fh_token");
    if (t && typeof API_BASE !== "undefined") {
      fetch(API_BASE + "/auth/logout", {
        method: "POST",
        headers: { Authorization: "Bearer " + t },
        keepalive: true,
      }).catch(() => {});
    }
  } catch (e) {}
  localStorage.removeItem("fh_token");
  localStorage.removeItem("fh_user");
  location.href = "index.html";
}

/** Logged-in user object, or null. */
function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("fh_user")) || null;
  } catch (e) {
    return null;
  }
}

function isLoggedIn() {
  return !!localStorage.getItem("fh_token");
}

function isAdmin() {
  const u = currentUser();
  return !!u && u.role === "admin";
}

/**
 * Page guard: bounce anonymous visitors to login.html,
 * remembering where they wanted to go (?next=...).
 * Returns the user object.
 */
function requireAuth() {
  if (!isLoggedIn()) {
    const back = encodeURIComponent(location.pathname.split("/").pop() + location.search);
    location.href = "login.html?next=" + back;
    throw new Error("redirecting to login");
  }
  return currentUser();
}

/** Page guard: only admins may view the page. */
function requireAdmin() {
  const user = requireAuth();
  if (user.role !== "admin") {
    location.href = "index.html";
    throw new Error("admin only");
  }
  return user;
}
