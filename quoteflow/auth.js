const crypto = require("node:crypto");
const session = require("express-session");
const database = require("./db");

const demoPasswords = new Map([
  ["qualifier1@demo.com", "demo"],
  ["qualifier2@demo.com", "demo"],
  ["manager@demo.com", "demo"],
  ["quoter1@demo.com", "demo"],
  ["quoter2@demo.com", "demo"],
  ["reviser1@demo.com", "demo"],
  ["reviser2@demo.com", "demo"],
  ["margin1@demo.com", "demo"],
]);

// TODO(identity): When Microsoft Entra ID sign-in replaces these demo accounts,
// map an Entra ID security group (for example "QuoteFlow Managers") to the
// Manager role at login. Group membership should then replace the
// MANAGER_EMAILS startup list in .env as the way the first Manager is named.

function registerDemoPassword(email, password = "demo") {
  demoPasswords.set(String(email || "").trim().toLowerCase(), password);
}

// Every page, by the role that owns its address. People see ONE menu built from all
// the roles their job title gives them (see navigationFor), grouped Work, Data, Admin.
// order = position in the menu. hidden = reachable by its address, not shown in the menu.
const navigation = {
  Manager: [
    { label: "Dashboard", href: "/manager/home", icon: "dashboard", group: "Work", order: 10 },
    { label: "Workload & assignments", href: "/manager/assignments", icon: "workload", group: "Work", order: 40 },
    { label: "Approval queue", href: "/manager/approval-queue", icon: "review", group: "Work", order: 60 },
    { label: "Request log", href: "/manager/request-log", icon: "list", group: "Data", order: 110 },
    { label: "Cross-reference", href: "/manager/cross-reference", icon: "templates", group: "Data", order: 130 },
    { label: "Reports", href: "/manager/reports", icon: "metrics", group: "Data", order: 140 },
    { label: "Settings", href: "/manager/settings", icon: "settings", group: "Admin", order: 200, managersOnly: true },
    { label: "Read a document", href: "/manager/read-document", icon: "upload", hidden: true },
    { label: "Coaching", href: "/manager/coaching", icon: "coaching", hidden: true },
    { label: "My settings", href: "/manager/my-settings", icon: "settings", hidden: true },
  ],
  "Margin Manager": [
    { label: "Locked prices", href: "/margin/locked-prices", icon: "metrics", group: "Data", order: 120 },
    { label: "Cross-reference", href: "/margin/cross-reference", icon: "templates", group: "Data", order: 130 },
    { label: "My settings", href: "/margin/my-settings", icon: "settings", hidden: true },
  ],
  Reviser: [
    { label: "Dashboard", href: "/reviser/home", icon: "dashboard", group: "Work", order: 10 },
    { label: "Revision queue", href: "/reviser/review-queue", icon: "review", group: "Work", order: 50 },
    // Shown only to people who can approve (see navigationFor).
    { label: "Approval queue", href: "/reviser/approval-queue", icon: "review", group: "Work", order: 60 },
    { label: "My settings", href: "/reviser/my-settings", icon: "settings", hidden: true },
  ],
  Qualifier: [
    { label: "Dashboard", href: "/qualifier/home", icon: "dashboard", group: "Work", order: 10 },
    { label: "Screening", href: "/qualifier/screening-queue", icon: "screening", group: "Work", order: 30 },
    { label: "Request log", href: "/qualifier/request-log", icon: "list", group: "Data", order: 110 },
    { label: "My settings", href: "/qualifier/my-settings", icon: "settings", hidden: true },
  ],
  Quoter: [
    { label: "Dashboard", href: "/quoter/home", icon: "dashboard", group: "Work", order: 10 },
    { label: "Quote workspace", href: "/quoter/quote-workspace", icon: "workspace", group: "Work", order: 20 },
    { label: "My quotes", href: "/quoter/my-quotes", icon: "quotes", group: "Work", order: 21 },
    { label: "Completed quotes", href: "/quoter/completed", icon: "assign", group: "Work", order: 22 },
    { label: "Read a document", href: "/quoter/read-document", icon: "upload", hidden: true },
    { label: "My settings", href: "/quoter/my-settings", icon: "settings", hidden: true },
  ],
};

// When a page appears for more than one role (Dashboard, Request log...), the first role here wins.
const ROLE_PRIORITY = ["Manager", "Margin Manager", "Reviser", "Qualifier", "Quoter"];

// Job titles. Each title gives a set of roles; the roles decide which pages and actions are open.
// Supervisors and managers get the same tools; only managers see Settings.
const TITLES = {
  Quoter: { roles: ["Quoter"], canApprove: false },
  "Quotes Supervisor": { roles: ["Manager", "Qualifier", "Reviser", "Quoter"], canApprove: true },
  "Bids Supervisor": { roles: ["Manager", "Qualifier", "Reviser", "Quoter"], canApprove: true },
  "Quotes Manager": { roles: ["Manager", "Qualifier", "Reviser", "Quoter"], canApprove: true },
  "Bids Manager": { roles: ["Manager", "Qualifier", "Reviser", "Quoter"], canApprove: true },
  "Margin Manager": { roles: ["Margin Manager", "Quoter"], canApprove: false },
  "Senior management": { roles: ["Margin Manager"], canApprove: false },
};
const isSupervisor = (user) => /supervisor/i.test(user.title || "");

// One menu for everyone: every page from every role the person holds, in process order.
// Pages that repeat across roles are kept (so their addresses still work) but hidden.
function navigationFor(user) {
  const roles = ROLE_PRIORITY.filter((role) => (user.roles || [user.role]).includes(role));
  const shown = new Set();
  const items = [];
  for (const role of roles) {
    for (const item of navigation[role] || []) {
      let hidden = Boolean(item.hidden);
      if (item.href === "/reviser/approval-queue" && !user.canApprove) hidden = true;
      if (item.managersOnly && isSupervisor(user)) hidden = true;
      if (!hidden && shown.has(item.label)) hidden = true;
      if (!hidden) shown.add(item.label);
      items.push({ ...item, role, hidden });
    }
  }
  return items.sort((a, b) => (a.order || 999) - (b.order || 999));
}

const sessionMiddleware = session({
  name: "quotes.sid",
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
  },
});

function safeUser(user, activeRole) {
  const roles = (Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role]).filter((role) => role !== "Rep");
  const role = activeRole && roles.includes(activeRole) ? activeRole : roles[0];
  const canApprove = roles.includes("Manager") || (roles.includes("Reviser") && Boolean(user.can_approve));
  return { id: user.id, email: user.email, name: user.name, role, roles, team: user.team, canApprove, title: user.job_title || null };
}
// After sign-in: the first page in the person's menu (usually their Dashboard).
function landingPath(user) {
  return navigationFor(user).find((item) => !item.hidden)?.href || "/login";
}

function redirectIfAuthenticated(request, response, next) {
  if (request.session?.user) {
    response.redirect(landingPath(request.session.user));
    return;
  }
  next();
}

function redirectHome(request, response) {
  response.redirect(request.session?.user ? landingPath(request.session.user) : "/login");
}

function findPage(pathname) {
  for (const [role, items] of Object.entries(navigation)) {
    const page = items.find((item) => item.href === pathname);
    if (page) return { ...page, role };
  }
  return null;
}

function unauthorized(request, response) {
  if (request.path.startsWith("/api/")) {
    response.status(401).json({ error: "Sign in to continue." });
    return;
  }
  response.redirect("/login");
}

// Each browser tab says which page it's on (X-QuoteFlow-Page, added by workspace.js).
// When the person holds that page's role, the request runs as that role, so two tabs
// on different pages (Workload and the quote workspace, say) never get in each other's way.
const PAGE_ROLE = { manager: "Manager", qualifier: "Qualifier", reviser: "Reviser", quoter: "Quoter", margin: "Margin Manager" };
function effectiveUser(request, user) {
  const page = typeof request.get === "function" ? String(request.get("x-quoteflow-page") || "") : "";
  const wanted = PAGE_ROLE[page.split("/")[1]];
  if (wanted && wanted !== user.role && (user.roles || []).includes(wanted)) return { ...user, role: wanted };
  return user;
}

function requireAuth(request, response, next) {
  const user = request.session?.user;
  if (!user) {
    unauthorized(request, response);
    return;
  }
  request.user = effectiveUser(request, user);
  next();
}

function requireRole(...roles) {
  return (request, response, next) => {
    const user = request.session?.user;
    if (!user) {
      unauthorized(request, response);
      return;
    }
    let acting = effectiveUser(request, user);
    if (!roles.includes(acting.role)) {
      const held = (user.roles || []).find((role) => roles.includes(role));
      if (held) acting = { ...user, role: held };
    }
    if (!roles.includes(acting.role)) {
      response.status(403).json({ error: "You do not have access to this feature." });
      return;
    }
    request.user = acting;
    next();
  };
}

function requirePageAccess(request, response, next) {
  let user = request.session?.user;
  if (!user) {
    unauthorized(request, response);
    return;
  }

  const page = findPage(request.path);
  if (!page) {
    response.status(404).send("Page not found.");
    return;
  }
  if (!(user.roles || [user.role]).includes(page.role)) {
    response.status(403).send("This page is not available for your job title.");
    return;
  }
  // One menu, no role switcher: opening a page makes its role the active one,
  // so the page and the actions on it work the same as before.
  if (user.role !== page.role) {
    user = { ...user, role: page.role };
    request.session.user = user;
  }
  const canApprove = user.canApprove ?? user.roles?.includes("Manager");
  if (page.href.endsWith("/approval-queue") && !canApprove) {
    response.status(403).send("This page requires the Can approve permission.");
    return;
  }

  request.user = user;
  request.page = page;
  response.set("Cache-Control", "no-store");
  next();
}

function registerAuthRoutes(app) {
  app.get("/api/auth/session", (request, response) => {
    response.set("Cache-Control", "no-store");
    response.json({ user: request.session?.user || null });
  });

  app.post("/api/auth/login", async (request, response, next) => {
    const email = String(request.body?.email || "").trim().toLowerCase();
    const password = String(request.body?.password || "");
    if (demoPasswords.get(email) !== password) {
      response.status(401).json({ error: "That email and password combination was not recognized." });
      return;
    }

    let record;
    try {
      record = await database.users.findActiveByEmail(email);
      if (record) await database.users.recordSignIn(record.id);
    } catch (error) {
      next(error);
      return;
    }
    if (!record) {
      response.status(401).json({ error: "That email and password combination was not recognized." });
      return;
    }

    if (!record.roles.some((role) => role !== "Rep")) {
      response.status(403).json({ error: "Reps send requests through the Teams form. QuoteFlow sign-in is for the quotes team." });
      return;
    }

    request.session.regenerate((error) => {
      if (error) return next(error);
      request.session.user = safeUser(record);
      request.session.save((saveError) => {
        if (saveError) return next(saveError);
        response.json({ user: request.session.user, redirect: landingPath(request.session.user) });
      });
    });
  });

  app.post("/api/auth/switch-role", (request, response) => {
    const user = request.session?.user;
    if (!user) {
      response.status(401).json({ error: "Sign in to continue." });
      return;
    }
    const nextRole = String(request.body?.role || "");
    if (!user.roles.includes(nextRole)) {
      response.status(403).json({ error: "You do not hold that role." });
      return;
    }
    request.session.user = { ...user, role: nextRole };
    request.session.save((saveError) => {
      if (saveError) {
        response.status(500).json({ error: "Could not switch role." });
        return;
      }
      response.json({ user: request.session.user, redirect: landingPath(request.session.user) });
    });
  });

  app.post("/api/auth/logout", (request, response, next) => {
    if (!request.session) {
      response.json({ ok: true });
      return;
    }
    request.session.destroy((error) => {
      if (error) return next(error);
      response.clearCookie("quotes.sid", { httpOnly: true, sameSite: "lax" });
      response.json({ ok: true });
    });
  });
}

module.exports = {
  sessionMiddleware,
  registerAuthRoutes,
  registerDemoPassword,
  safeUser,
  requireAuth,
  requireRole,
  requirePageAccess,
  redirectIfAuthenticated,
  redirectHome,
  landingPath,
  navigationFor,
  findPage,
  TITLES,
};
