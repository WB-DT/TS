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

const navigation = {
  Qualifier: [
    { label: "Dashboard", href: "/qualifier/home", icon: "dashboard" },
    { label: "Screening queue", href: "/qualifier/screening-queue", icon: "screening" },
    { label: "Quote Log", href: "/qualifier/request-log", icon: "list" },
    { label: "My settings", href: "/qualifier/my-settings", icon: "settings", hidden: true },
  ],
  Manager: [
    { label: "Dashboard", href: "/manager/home", icon: "dashboard" },
    { label: "Quote Log", href: "/manager/request-log", icon: "list" },
    { label: "Assignments", href: "/manager/assignments", icon: "assign" },
    { label: "Approval queue", href: "/manager/approval-queue", icon: "review" },
    { label: "Reports", href: "/manager/reports", icon: "metrics" },
    { label: "Settings", href: "/manager/settings", icon: "settings" },
    { label: "My settings", href: "/manager/my-settings", icon: "settings", hidden: true },
  ],
  "Margin Manager": [
    { label: "Locked prices", href: "/margin/locked-prices", icon: "metrics" },
    { label: "My settings", href: "/margin/my-settings", icon: "settings", hidden: true },
  ],
  Quoter: [
    { label: "Dashboard", href: "/quoter/home", icon: "dashboard" },
    { label: "My quotes", href: "/quoter/my-quotes", icon: "quotes" },
    { label: "My settings", href: "/quoter/my-settings", icon: "settings", hidden: true },
  ],
  Reviser: [
    { label: "Dashboard", href: "/reviser/home", icon: "dashboard" },
    { label: "Review queue", href: "/reviser/review-queue", icon: "review" },
    // Shown only when the Reviser holds the Can approve permission (see navigationFor).
    { label: "Approval queue", href: "/reviser/approval-queue", icon: "review" },
    { label: "My settings", href: "/reviser/my-settings", icon: "settings", hidden: true },
  ],
};

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
  return { id: user.id, email: user.email, name: user.name, role, roles, team: user.team, canApprove };
}
function landingPath(user) {
  return navigation[user.role]?.[0]?.href || "/login";
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

function requireAuth(request, response, next) {
  const user = request.session?.user;
  if (!user) {
    unauthorized(request, response);
    return;
  }
  request.user = user;
  next();
}

function requireRole(...roles) {
  return (request, response, next) => {
    const user = request.session?.user;
    if (!user) {
      unauthorized(request, response);
      return;
    }
    if (!roles.includes(user.role)) {
      response.status(403).json({ error: "You do not have access to this feature." });
      return;
    }
    request.user = user;
    next();
  };
}

function requirePageAccess(request, response, next) {
  const user = request.session?.user;
  if (!user) {
    unauthorized(request, response);
    return;
  }

  const page = findPage(request.path);
  if (!page) {
    response.status(404).send("Page not found.");
    return;
  }
  if (page.role !== user.role) {
    response.status(403).send("This page is not available for your role.");
    return;
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
      next(error)
      return;
    }
    if (!record) {
      response.status(401).json({ error: "That email and password combination was not recognized." });
      return;
    }

        if (!record.roles.some((role) => role !== "Rep")) {
      response.status(403).json({ error: "Reps send requests through the Teams form. QuoteFlow sign-in is for the quotes team." });
      return;
    }request.session.regenerate((error) => {
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
  navigationFor: (user) => {
    const items = navigation[user.role] || [];
    if (user.role === "Reviser" && !user.canApprove) {
      return items.filter((item) => item.href !== "/reviser/approval-queue");
    }
    return items;
  },
  findPage,
};
