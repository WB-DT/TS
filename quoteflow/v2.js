// QuoteFlow version 2: everything around the quote itself.
//   People      job titles, reporting lines, specialty tags, the reps' management contacts
//   Screening   the template, specialty and rep department picked for each quote
//   Workload    the pipeline and who is behind, for supervisors and managers
//   Notices     the bell: assigned, sent back, approved
//   Completed   after approval: exports, Confirm locked, the final email to the rep
//   Follow-ups  did the customer order? The rep answers with order numbers
//
// Rules worth knowing:
//   - Nobody revises or approves a quote they quoted themselves.
//   - The final email goes out only after the quoter confirms the prices are locked.
//   - The final email copies the quoter's reporting line and the rep's department contacts.

const { randomUUID, randomBytes } = require("node:crypto");
const templates = require("./quote-templates");
const quoteStagesModule = require("./quote-stages");

// ---------------------------------------------------------------- settings and defaults

const SETTING_DEFAULTS = {
  template_company_name: "",            // replaces {co} in template headers
  offer_percent: "10",                  // extra discount for ordering quickly
  offer_window: "24 to 48 hours",
  offer_enabled: "true",
  followup_business_days: "2",          // first follow-up after the final email
  reminder_days: "7",                   // second follow-up when the answer is Not yet
  inactivity_business_days: "2",        // workload: assigned quote with no activity
  email_signoff: "Quote Team",
};
const DEFAULT_TAGS = ["Food service", "Pack and ship", "Jan-San", "Furniture", "Tech", "Bids"];
const DEFAULT_DEPARTMENTS = ["AM1", "AM2", "AM3", "Key Accounts", "Schools", "Hunting", "Retention", "Jax office", "MDM"];

const OPEN_WITH_QUOTER = ["Assigned", "In progress", "Returned to quoter"];
const IN_REVISION = ["In revision", "Awaiting approval", "Returned to reviser"];
const REVIEW_STATUSES = ["Awaiting approval", "Returned to quoter", "Approved", "Returned to reviser"];
const ANSWERS = ["Ordered", "Partly ordered", "Not yet", "No answer"];

// ---------------------------------------------------------------- pure helpers (tested)

const DAY = 86400;

// Adds business days (Mon-Fri) to a time in seconds.
function addBusinessDays(fromSeconds, days) {
  const date = new Date(fromSeconds * 1000);
  let left = Math.max(0, Math.round(days));
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) left -= 1;
  }
  return Math.floor(date.getTime() / 1000);
}

// Business days between two times (whole days, Mon-Fri).
function businessDaysBetween(fromSeconds, toSeconds) {
  if (!fromSeconds || toSeconds <= fromSeconds) return 0;
  const date = new Date(fromSeconds * 1000);
  let count = 0;
  while (true) {
    date.setDate(date.getDate() + 1);
    if (date.getTime() / 1000 > toSeconds) break;
    if (date.getDay() !== 0 && date.getDay() !== 6) count += 1;
  }
  return count;
}

// Everyone up a person's reporting line (supervisor, their manager, ...), up to 5 levels.
function reportingLine(usersById, startId) {
  const line = [];
  const seen = new Set([startId]);
  let current = usersById.get(startId);
  while (current && current.reports_to_id && !seen.has(current.reports_to_id) && line.length < 5) {
    seen.add(current.reports_to_id);
    current = usersById.get(current.reports_to_id);
    if (current && current.active !== false && current.active !== 0) line.push(current);
  }
  return line;
}

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "there";
const money = (v) => (v === null || v === undefined ? "" : `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

// The final email to the rep. Plain text so it works in any mail program.
function buildFinalEmail({ quote, rep, quoter, ccPeople, settings, offerOn, followupDays }) {
  const percent = Number(settings.offer_percent || 0);
  const lines = [
    `Hi ${firstName(rep && rep.name)},`,
    "",
    `Your quote ${quote.number} for ${quote.accountName || "the customer"}${quote.accountNumber ? ` (${quote.accountNumber})` : ""} is approved, and the prices are now locked on the account.`,
    "",
    "The customer quote is attached as a PDF.",
    "",
    "Next steps:",
    "1. Review the attached quote with the customer.",
    "2. Confirm the items and quantities they want.",
    "3. Place the order. The new prices are already on their account.",
  ];
  if (offerOn && percent > 0) {
    lines.push("", `Special offer: if the customer places the order within the next ${settings.offer_window || "24 to 48 hours"}, they get an extra ${percent}% off.`);
  }
  lines.push(
    "",
    `We'll check back in ${followupDays} business day${Number(followupDays) === 1 ? "" : "s"} to see whether the customer ordered. Once the order is placed, please reply with the order number.`,
    "",
    "Thank you,",
    quoter ? quoter.name : "",
    settings.email_signoff || "Quote Team",
  );
  const to = rep && isEmail(rep.email) ? [rep.email.trim()] : [];
  const cc = [...new Set(ccPeople.filter((p) => isEmail(p.email)).map((p) => p.email.trim().toLowerCase()))].filter((e) => !to.map((t) => t.toLowerCase()).includes(e));
  return {
    to, cc, ccPeople: ccPeople.filter((p) => isEmail(p.email)),
    subject: `Quote ${quote.number} for ${quote.accountName || "your customer"} is ready`,
    body: lines.join("\n"),
  };
}

function buildFollowupEmail({ quote, rep, link, round }) {
  return {
    to: rep && isEmail(rep.email) ? [rep.email.trim()] : [],
    cc: [],
    subject: `${round > 1 ? "Reminder: " : ""}Did ${quote.accountName || "the customer"} order from quote ${quote.number}?`,
    body: [
      `Hi ${firstName(rep && rep.name)},`,
      "",
      `Did ${quote.accountName || "the customer"} place an order from quote ${quote.number}?`,
      "",
      "Answer with one click (no sign-in needed). If they ordered, the page asks for the order number:",
      link,
      "",
      "Thank you!",
    ].join("\n"),
  };
}

// mailto: link that opens the person's mail program with everything filled in.
function mailtoUrl({ to, cc, subject, body }) {
  const params = [];
  if (cc && cc.length) params.push(`cc=${encodeURIComponent(cc.join(","))}`);
  params.push(`subject=${encodeURIComponent(subject)}`);
  params.push(`body=${encodeURIComponent(body.replace(/\n/g, "\r\n"))}`);
  return `mailto:${(to || []).map(encodeURIComponent).join(",")}?${params.join("&")}`;
}

// Workload: one row per quoter plus the quotes that need attention.
function summarizeWorkload({ quotes, quoters, sentBack, approvedThisWeek, now, settings }) {
  const idleDays = Number(settings.inactivity_business_days || 2);
  const today = new Date(now * 1000).toISOString().slice(0, 10);
  const isOverdue = (q) => q.neededBy && String(q.neededBy).slice(0, 10) < today;
  const isDueToday = (q) => q.neededBy && String(q.neededBy).slice(0, 10) === today;
  const attention = [];
  for (const q of quotes) {
    if (!OPEN_WITH_QUOTER.includes(q.status) && !IN_REVISION.includes(q.status)) continue;
    const idle = OPEN_WITH_QUOTER.includes(q.status) ? businessDaysBetween(q.lastActivity, now) : 0;
    if (OPEN_WITH_QUOTER.includes(q.status) && idle >= idleDays) attention.push({ ...q, reason: `No activity for ${idle} business days` });
    else if (isOverdue(q)) attention.push({ ...q, reason: "Past its due date" });
  }
  const rows = quoters.map((person) => {
    const mine = quotes.filter((q) => q.assignedQuoterId === person.id);
    const open = mine.filter((q) => OPEN_WITH_QUOTER.includes(q.status));
    const back = sentBack.get(person.id) || 0;
    const done = approvedThisWeek.get(person.id) || 0;
    return {
      id: person.id, name: person.name, title: person.job_title || "Quoter", tags: person.tags || [],
      open: open.length,
      items: open.reduce((sum, q) => sum + Number(q.items || 0), 0),
      inRevision: mine.filter((q) => IN_REVISION.includes(q.status)).length,
      dueToday: open.filter(isDueToday).length,
      overdue: open.filter(isOverdue).length,
      idle: attention.filter((a) => a.assignedQuoterId === person.id && a.reason.startsWith("No activity")).length,
      sentBack: back,
      completedThisWeek: done,
      sendBackRate: back + done >= 3 ? back / (back + done) : null,
    };
  });
  for (const row of rows) {
    if (row.sendBackRate !== null && row.sendBackRate >= 0.3) attention.push({ quoter: row.name, reason: `${Math.round(row.sendBackRate * 100)}% of recent quotes sent back` });
  }
  return { rows: rows.sort((a, b) => b.open - a.open || a.name.localeCompare(b.name)), attention };
}

// ---------------------------------------------------------------- the routes

function register(app, { auth, database, quoteStages }) {
  const knex = database.connection;
  const now = () => Math.floor(Date.now() / 1000);
  const fail = (response, status, message) => response.status(status).json({ error: message });
  const leads = auth.requireRole("Manager", "Qualifier", "Reviser");
  const managers = auth.requireRole("Manager");
  const quoterOnly = auth.requireRole("Quoter");
  const anyone = auth.requireAuth;
  const wrap = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);

  // ---- defaults, applied once on the first request after start-up
  let ready = null;
  async function ensureDefaults() {
    const existing = new Set((await knex("settings").select("key")).map((r) => r.key));
    for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
      if (!existing.has(key)) await knex("settings").insert({ key, value });
    }
    if (!(await knex("specialty_tags").first())) {
      let sort = 0;
      for (const name of DEFAULT_TAGS) await knex("specialty_tags").insert({ id: randomUUID(), name, sort: (sort += 1) });
    }
    if (!(await knex("department_contacts").first())) {
      let sort = 0;
      for (const department of DEFAULT_DEPARTMENTS) {
        await knex("department_contacts").insert({ id: randomUUID(), department, name: null, email: null, title: "Supervisor", cc: true, sort: (sort += 1) });
      }
    }
    // Give a job title to everyone on the team who doesn't have one yet, from the roles they hold.
    const users = await knex("users").whereNull("job_title").where({ active: true });
    const roleRows = await knex("user_roles").select("user_id", "role");
    for (const user of users) {
      const roles = roleRows.filter((r) => r.user_id === user.id).map((r) => r.role);
      if (!roles.length || roles.every((r) => r === "Rep")) continue;
      const bids = /mdm|bid/i.test(user.team || "");
      const title = roles.includes("Manager") ? (bids ? "Bids Manager" : "Quotes Manager")
        : roles.includes("Reviser") || roles.includes("Qualifier") ? (bids ? "Bids Supervisor" : "Quotes Supervisor")
          : roles.includes("Margin Manager") ? "Margin Manager" : "Quoter";
      const preset = auth.TITLES[title];
      for (const role of preset.roles) {
        if (!roles.includes(role)) await knex("user_roles").insert({ user_id: user.id, role });
      }
      await knex("users").where({ id: user.id }).update({ job_title: title, can_approve: preset.canApprove || Boolean(user.can_approve) });
    }
    // A starting reporting line: quoters to a supervisor on their team, supervisors to a manager.
    const team = await knex("users").where({ active: true }).whereNotNull("job_title");
    const manager = team.find((u) => /manager/i.test(u.job_title) && u.job_title !== "Margin Manager");
    for (const user of team.filter((u) => !u.reports_to_id)) {
      let boss = null;
      if (user.job_title === "Quoter") boss = team.find((u) => /supervisor/i.test(u.job_title) && u.team === user.team) || team.find((u) => /supervisor/i.test(u.job_title)) || manager;
      else if (/supervisor/i.test(user.job_title)) boss = manager;
      if (boss && boss.id !== user.id) await knex("users").where({ id: user.id }).update({ reports_to_id: boss.id });
    }
  }
  const ensure = () => {
    if (!ready) ready = ensureDefaults().catch((error) => { ready = null; throw error; });
    return ready;
  };
  app.use("/api", (request, response, next) => { ensure().then(() => next(), next); });

  async function getSettings() {
    const rows = await knex("settings").select("key", "value");
    const out = { ...SETTING_DEFAULTS };
    for (const row of rows) out[row.key] = row.value;
    return out;
  }

  async function usersById() {
    const users = await knex("users").select("id", "name", "email", "team", "job_title", "reports_to_id", "department", "active");
    return new Map(users.map((u) => [u.id, u]));
  }

  async function quoteRow(id) {
    return knex("quotes as q").leftJoin("accounts as a", "a.id", "q.account_id")
      .where("q.id", id)
      .select("q.*", "a.account_number as accountNumber", "a.account_name as accountName")
      .first();
  }

  // ---- the "never your own quote" rule and the bell, around the existing status and assign routes
  app.use(["/api/quotes/:id/status", "/api/quotes/:id/assign"], (request, response, next) => {
    if (request.method !== "POST") return next();
    const id = request.params.id;
    const user = request.session && request.session.user;
    if (!user) return next();
    const run = async () => {
      const before = await knex("quotes").where({ id }).first();
      if (!before) return next();
      const nextStatus = request.body && request.body.status;
      if (request.path.endsWith("status") || request.originalUrl.includes("/status")) {
        if (REVIEW_STATUSES.includes(nextStatus) && before.assigned_quoter_id && before.assigned_quoter_id === user.id) {
          return fail(response, 403, "You can't revise or approve a quote you quoted. Another supervisor or manager needs to do it.");
        }
      }
      response.on("finish", () => {
        if (response.statusCode >= 300) return;
        notifyAfterChange(before, user).catch(() => {});
      });
      return next();
    };
    run().catch(next);
  });

  async function notifyAfterChange(before, user) {
    const after = await quoteRow(before.id);
    if (!after) return;
    const number = after.quote_number;
    const account = after.accountName || after.company_name || "";
    const notify = (userId, kind, message) => (userId && userId !== user.id ? database.quotes.notify({ userId, quoteId: after.id, kind, message }) : null);
    if (after.assigned_quoter_id && after.assigned_quoter_id !== before.assigned_quoter_id) {
      await notify(after.assigned_quoter_id, "assigned", `${number} · ${account} was assigned to you.`);
    }
    if (after.status === before.status) return;
    const lastReason = await knex("quote_status_history").where({ quote_id: after.id, to_status: after.status }).orderBy("changed_at", "desc").first();
    if (after.status === "Returned to quoter") {
      await notify(after.assigned_quoter_id, "sent-back", `${number} was sent back for changes${lastReason && lastReason.reason ? `: ${lastReason.reason}` : "."}`);
    }
    if (after.status === "Approved") {
      await notify(after.assigned_quoter_id, "approved", `${number} · ${account} is approved. Open Completed quotes to export the load form and favorites list.`);
    }
    if (after.status === "In revision") {
      const people = await usersById();
      const boss = people.get(after.assigned_quoter_id) && people.get(after.assigned_quoter_id).reports_to_id;
      await notify(boss, "revision", `${number} · ${account} is waiting for revision.`);
    }
  }

  app.get("/api/v2/notifications", anyone, wrap(async (request, response) => {
    const rows = await knex("notifications").where({ user_id: request.user.id }).orderBy("created_at", "desc").limit(30)
      .select("id", "kind", "message", "read", "quote_id", "created_at");
    response.set("Cache-Control", "no-store");
    response.json({ notifications: rows.map((r) => ({ ...r, read: Boolean(r.read) })), unread: rows.filter((r) => !r.read).length });
  }));

  app.post("/api/v2/notifications/read-all", anyone, wrap(async (request, response) => {
    await knex("notifications").where({ user_id: request.user.id, read: false }).update({ read: true });
    response.json({ ok: true });
  }));

  // ---- options for screening and the quote workspace
  app.get("/api/v2/options", anyone, wrap(async (_request, response) => {
    const tags = await knex("specialty_tags").orderBy("sort");
    const departments = [...new Set((await knex("department_contacts").orderBy("sort")).map((c) => c.department))];
    response.set("Cache-Control", "no-store");
    response.json({
      templates: templates.TEMPLATES.map((t) => ({ key: t.key, name: t.name, when: t.when })),
      defaultTemplate: templates.DEFAULT_TEMPLATE,
      specialties: tags.map((t) => t.name),
      departments,
    });
  }));

  app.get("/api/v2/quotes/:id/screening", leads, wrap(async (request, response) => {
    const q = await knex("quotes").where({ id: request.params.id }).first();
    if (!q) return fail(response, 404, "Quote not found.");
    const rep = q.submitted_by_rep ? await knex("users").where({ id: q.submitted_by_rep }).first() : null;
    response.json({ templateKey: q.template_key || "", specialty: q.specialty || "", repDepartment: q.rep_department || (rep && rep.department) || "" });
  }));

  app.post("/api/v2/quotes/:id/screening", leads, wrap(async (request, response) => {
    const q = await knex("quotes").where({ id: request.params.id }).first();
    if (!q) return fail(response, 404, "Quote not found.");
    const b = request.body || {};
    const changes = {};
    if (typeof b.templateKey === "string") {
      if (b.templateKey && !templates.TEMPLATES.some((t) => t.key === b.templateKey)) return fail(response, 400, "Choose a template from the list.");
      changes.template_key = b.templateKey || null;
    }
    if (typeof b.specialty === "string") changes.specialty = b.specialty.trim().slice(0, 60) || null;
    if (typeof b.repDepartment === "string") changes.rep_department = b.repDepartment.trim().slice(0, 60) || null;
    if (Object.keys(changes).length) await knex("quotes").where({ id: q.id }).update({ ...changes, updated_at: now() });
    response.json({ ok: true });
  }));

  // ---- people and settings (managers)
  app.get("/api/v2/people", managers, wrap(async (_request, response) => {
    const users = await knex("users").where({ active: true }).orderBy("name")
      .select("id", "name", "email", "team", "job_title", "reports_to_id", "department");
    const roleRows = await knex("user_roles").select("user_id", "role");
    const tagRows = await knex("user_specialties").select("user_id", "tag_id");
    const tags = await knex("specialty_tags").orderBy("sort");
    const contacts = await knex("department_contacts").orderBy("sort");
    const team = []; const reps = [];
    for (const u of users) {
      const roles = roleRows.filter((r) => r.user_id === u.id).map((r) => r.role);
      const entry = { ...u, roles, specialties: tagRows.filter((t) => t.user_id === u.id).map((t) => t.tag_id) };
      if (roles.length && roles.every((r) => r === "Rep")) reps.push(entry); else team.push(entry);
    }
    response.set("Cache-Control", "no-store");
    response.json({ team, reps, titles: Object.keys(auth.TITLES), tags, contacts, settings: await getSettings(),
      departments: [...new Set(contacts.map((c) => c.department))] });
  }));

  app.put("/api/v2/people/:id", managers, wrap(async (request, response) => {
    const user = await knex("users").where({ id: request.params.id }).first();
    if (!user) return fail(response, 404, "User not found.");
    const b = request.body || {};
    if (typeof b.title === "string" && b.title && b.title !== user.job_title) {
      const preset = auth.TITLES[b.title];
      if (!preset) return fail(response, 400, "Choose a job title from the list.");
      await database.users.updateUserRoles({ userId: user.id, roles: preset.roles, canApprove: preset.canApprove, changedBy: request.user });
      await knex("users").where({ id: user.id }).update({ job_title: b.title });
    }
    if (b.reportsToId !== undefined) {
      const bossId = b.reportsToId || null;
      if (bossId === user.id) return fail(response, 400, "Someone can't report to themselves.");
      if (bossId) {
        const people = await usersById();
        people.set(user.id, { ...people.get(user.id), reports_to_id: bossId });
        if (reportingLine(people, bossId).some((p) => p.id === user.id)) return fail(response, 400, "That would make a loop in the reporting line.");
      }
      await knex("users").where({ id: user.id }).update({ reports_to_id: bossId });
    }
    if (typeof b.department === "string") await knex("users").where({ id: user.id }).update({ department: b.department.trim().slice(0, 60) || null });
    if (Array.isArray(b.specialties)) {
      const valid = new Set((await knex("specialty_tags").select("id")).map((t) => t.id));
      await knex("user_specialties").where({ user_id: user.id }).delete();
      for (const tagId of [...new Set(b.specialties)].filter((t) => valid.has(t))) await knex("user_specialties").insert({ user_id: user.id, tag_id: tagId });
    }
    response.json({ ok: true, note: "Changes to someone's title take effect the next time they sign in." });
  }));

  app.put("/api/v2/tags", managers, wrap(async (request, response) => {
    const incoming = (Array.isArray(request.body?.tags) ? request.body.tags : [])
      .map((t) => ({ id: t.id || null, name: String(t.name || "").trim().slice(0, 60) })).filter((t) => t.name);
    const names = incoming.map((t) => t.name.toLowerCase());
    if (new Set(names).size !== names.length) return fail(response, 400, "Each tag needs a different name.");
    await knex.transaction(async (trx) => {
      const existing = await trx("specialty_tags");
      const keep = new Set(incoming.filter((t) => t.id).map((t) => t.id));
      for (const old of existing.filter((t) => !keep.has(t.id))) {
        await trx("user_specialties").where({ tag_id: old.id }).delete();
        await trx("specialty_tags").where({ id: old.id }).delete();
      }
      let sort = 0;
      for (const t of incoming) {
        sort += 1;
        if (t.id && existing.some((e) => e.id === t.id)) await trx("specialty_tags").where({ id: t.id }).update({ name: t.name, sort });
        else await trx("specialty_tags").insert({ id: randomUUID(), name: t.name, sort });
      }
    });
    response.json({ tags: await knex("specialty_tags").orderBy("sort") });
  }));

  app.put("/api/v2/contacts", managers, wrap(async (request, response) => {
    const incoming = (Array.isArray(request.body?.contacts) ? request.body.contacts : []).map((c, i) => ({
      id: randomUUID(), department: String(c.department || "").trim().slice(0, 60), name: String(c.name || "").trim().slice(0, 160) || null,
      email: String(c.email || "").trim().slice(0, 255) || null, title: String(c.title || "").trim().slice(0, 60) || null,
      cc: c.cc !== false, sort: i + 1,
    })).filter((c) => c.department);
    const bad = incoming.find((c) => c.email && !isEmail(c.email));
    if (bad) return fail(response, 400, `${bad.email} isn't a valid email address.`);
    await knex.transaction(async (trx) => {
      await trx("department_contacts").delete();
      for (const c of incoming) await trx("department_contacts").insert(c);
    });
    response.json({ contacts: await knex("department_contacts").orderBy("sort") });
  }));

  app.put("/api/v2/settings", managers, wrap(async (request, response) => {
    const b = request.body || {};
    for (const key of Object.keys(SETTING_DEFAULTS)) {
      if (b[key] === undefined) continue;
      const value = String(b[key]).slice(0, 400);
      if (["offer_percent", "followup_business_days", "reminder_days", "inactivity_business_days"].includes(key) && !(Number(value) >= 0)) {
        return fail(response, 400, "Use numbers for the percent and the day counts.");
      }
      const existing = await knex("settings").where({ key }).first();
      if (existing) await knex("settings").where({ key }).update({ value });
      else await knex("settings").insert({ key, value });
    }
    response.json({ settings: await getSettings() });
  }));

  // ---- workload (supervisors and managers)
  app.get("/api/v2/workload", managers, wrap(async (_request, response) => {
    const settings = await getSettings();
    const t = now();
    const quotes = await knex("quotes as q")
      .leftJoin("accounts as a", "a.id", "q.account_id")
      .leftJoin("qs_quotes as s", "s.quote_id", "q.id")
      .whereIn("q.status", ["Ready to assign", ...OPEN_WITH_QUOTER, ...IN_REVISION])
      .select("q.id", "q.quote_number as number", "q.status", "q.assigned_quoter_id as assignedQuoterId", "q.needed_by as neededBy",
        "q.priority", "q.template_key as templateKey", "q.specialty", "q.quote_type as quoteType", "q.updated_at as updatedAt",
        "q.created_at as createdAt", "s.updated_at as stageUpdatedAt",
        "a.account_name as accountName", "q.company_name as companyName");
    const ids = quotes.map((q) => q.id);
    const history = ids.length ? await knex("quote_status_history").whereIn("quote_id", ids).select("quote_id").max({ last: "changed_at" }).groupBy("quote_id") : [];
    const lastChange = new Map(history.map((h) => [h.quote_id, Number(h.last)]));
    const lineCounts = ids.length ? await knex("qs_lines").whereIn("quote_id", ids).select("quote_id").count({ n: "id" }).groupBy("quote_id") : [];
    const linesBy = new Map(lineCounts.map((r) => [r.quote_id, Number(r.n)]));
    for (const q of quotes) {
      q.lastActivity = Math.max(Number(q.updatedAt || 0), Number(q.stageUpdatedAt || 0), lastChange.get(q.id) || 0, Number(q.createdAt || 0));
      q.items = linesBy.get(q.id) || 0;
      q.account = q.accountName || q.companyName || "";
      q.template = q.templateKey ? templates.getTemplate(q.templateKey).name : "";
    }
    const quoterIds = (await knex("user_roles").where({ role: "Quoter" }).select("user_id")).map((r) => r.user_id);
    const quoters = quoterIds.length ? await knex("users").whereIn("id", quoterIds).where({ active: true }).select("id", "name", "job_title") : [];
    const tagRows = await knex("user_specialties as us").join("specialty_tags as t", "t.id", "us.tag_id").select("us.user_id", "t.name");
    for (const p of quoters) p.tags = tagRows.filter((r) => r.user_id === p.id).map((r) => r.name);
    const monthAgo = t - 30 * DAY;
    const weekStart = (() => { const d = new Date(t * 1000); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Math.floor(d.getTime() / 1000); })();
    const outcomeRows = await knex("quote_status_history as h").join("quotes as q", "q.id", "h.quote_id")
      .whereIn("h.to_status", ["Returned to quoter", "Approved"]).where("h.changed_at", ">=", monthAgo)
      .select("q.assigned_quoter_id as quoterId", "h.to_status as status", "h.changed_at as changedAt");
    const sentBack = new Map(); const approvedThisWeek = new Map();
    for (const r of outcomeRows) {
      if (r.status === "Returned to quoter") sentBack.set(r.quoterId, (sentBack.get(r.quoterId) || 0) + 1);
      if (r.status === "Approved" && Number(r.changedAt) >= weekStart) approvedThisWeek.set(r.quoterId, (approvedThisWeek.get(r.quoterId) || 0) + 1);
    }
    const summary = summarizeWorkload({ quotes, quoters, sentBack, approvedThisWeek, now: t, settings });
    response.set("Cache-Control", "no-store");
    response.json({
      unassigned: quotes.filter((q) => q.status === "Ready to assign").sort((a, b) => String(a.neededBy || "9").localeCompare(String(b.neededBy || "9"))),
      quoters: summary.rows,
      attention: summary.attention,
      inactivityDays: Number(settings.inactivity_business_days),
    });
  }));

  // ---- my quotes and completed quotes (quoters)
  async function completionFor(ids) {
    if (!ids.length) return { completion: new Map(), exports: new Map(), followups: new Map() };
    const completion = new Map((await knex("quote_completion").whereIn("quote_id", ids)).map((c) => [c.quote_id, c]));
    const exports = new Map();
    for (const e of await knex("quote_exports").whereIn("quote_id", ids)) {
      if (!exports.has(e.quote_id)) exports.set(e.quote_id, new Set());
      exports.get(e.quote_id).add(e.kind);
    }
    const followups = new Map();
    for (const f of await knex("quote_followups").whereIn("quote_id", ids).orderBy("round")) {
      if (!followups.has(f.quote_id)) followups.set(f.quote_id, []);
      followups.get(f.quote_id).push(f);
    }
    return { completion, exports, followups };
  }

  function stepOf(quote, info) {
    const c = info.completion.get(quote.id);
    const ex = info.exports.get(quote.id) || new Set();
    const f = info.followups.get(quote.id) || [];
    const answered = f.find((x) => x.answer && x.answer !== "Not yet");
    if (answered) return { step: "done", label: answered.answer === "No answer" ? "No answer from the rep" : `${answered.answer}${answered.order_numbers ? ` · ${answered.order_numbers}` : ""}` };
    if (c && c.email_at) return { step: "followup", label: "Waiting to hear if the customer ordered" };
    if (c && c.locked_at) return { step: "email", label: "Send the email to the rep" };
    if (ex.has("load-form") && ex.has("favorites")) return { step: "lock", label: "Lock in, then confirm" };
    return { step: "export", label: "Export the load form and favorites list" };
  }

  app.get("/api/v2/my-quotes", quoterOnly, wrap(async (request, response) => {
    const quotes = await knex("quotes as q").leftJoin("accounts as a", "a.id", "q.account_id")
      .where("q.assigned_quoter_id", request.user.id)
      .whereIn("q.status", [...OPEN_WITH_QUOTER, ...IN_REVISION, "Approved"])
      .orderBy("q.updated_at", "desc")
      .select("q.id", "q.quote_number as number", "q.status", "q.needed_by as neededBy", "q.updated_at as updatedAt", "q.template_key as templateKey",
        "a.account_name as accountName", "a.account_number as accountNumber", "q.company_name as companyName");
    const info = await completionFor(quotes.filter((q) => q.status === "Approved").map((q) => q.id));
    for (const q of quotes) {
      q.account = q.accountName || q.companyName || "";
      q.template = q.templateKey ? templates.getTemplate(q.templateKey).name : "";
      q.tab = OPEN_WITH_QUOTER.includes(q.status) ? "progress" : IN_REVISION.includes(q.status) ? "revision" : "completed";
      if (q.tab === "completed") q.next = stepOf(q, info);
    }
    response.set("Cache-Control", "no-store");
    response.json({ quotes });
  }));

  async function completedDetail(id, request) {
    const quote = await quoteRow(id);
    if (!quote) return null;
    const people = await usersById();
    const settings = await getSettings();
    const rep = quote.submitted_by_rep ? people.get(quote.submitted_by_rep) : null;
    const quoter = quote.assigned_quoter_id ? people.get(quote.assigned_quoter_id) : null;
    const department = quote.rep_department || (rep && rep.department) || "";
    const contacts = department ? await knex("department_contacts").where({ department, cc: true }) : [];
    const quoterLine = quoter ? reportingLine(people, quoter.id) : [];
    const ccPeople = [
      ...quoterLine.map((p) => ({ name: p.name, email: p.email, why: `${quoter.name}'s reporting line (${p.job_title || ""})` })),
      ...contacts.map((c) => ({ name: c.name || c.department, email: c.email, why: `${department} ${c.title || "contact"}` })),
    ];
    const info = await completionFor([quote.id]);
    const c = info.completion.get(quote.id) || {};
    const state = quoteStages ? await quoteStages.fullState(quote.id) : null;
    const s = state ? state.summary : null;
    const percent = Number(settings.offer_percent || 0) / 100;
    const afterOffer = s && s.sellTotal ? (s.sellTotal * (1 - percent) - s.costTotal) / (s.sellTotal * (1 - percent)) : null;
    const offerOn = c.offer_percent !== undefined && c.offer_percent !== null ? Number(c.offer_percent) > 0 : settings.offer_enabled !== "false";
    const followupDays = Number(settings.followup_business_days || 2);
    const email = buildFinalEmail({
      quote: { number: quote.quote_number, accountName: quote.accountName || quote.company_name, accountNumber: quote.accountNumber },
      rep, quoter, ccPeople, settings, offerOn, followupDays,
    });
    const origin = `${request.protocol}://${request.get("host")}`;
    const followups = (info.followups.get(quote.id) || []).map((f) => {
      const link = `${origin}/f/${f.token}`;
      const mail = buildFollowupEmail({ quote: { number: quote.quote_number, accountName: quote.accountName || quote.company_name }, rep, link, round: f.round });
      return { id: f.id, round: f.round, dueAt: f.due_at, sentAt: f.sent_at, answer: f.answer, orderNumbers: f.order_numbers, orderAmount: f.order_amount,
        note: f.note, answeredAt: f.answered_at, answeredVia: f.answered_via, link, mailto: mailtoUrl(mail), due: f.due_at <= now() && !f.answer };
    });
    return {
      quote: { id: quote.id, number: quote.quote_number, status: quote.status, account: quote.accountName || quote.company_name || "", accountNumber: quote.accountNumber,
        template: templates.getTemplate(quote.template_key).name, repName: rep ? rep.name : null, repEmail: rep ? rep.email : null, department },
      exports: [...(info.exports.get(quote.id) || [])],
      lockedAt: c.locked_at || null, emailAt: c.email_at || null,
      step: stepOf(quote, info),
      totals: s ? { sell: s.sellTotal, cost: s.costTotal, margin: s.margin, marginAfterOffer: afterOffer } : null,
      offer: { on: offerOn, percent: Number(settings.offer_percent || 0), window: settings.offer_window },
      email: { ...email, mailto: mailtoUrl(email) },
      followups,
      missing: [
        !(rep && isEmail(rep.email)) && "The rep's email address is missing.",
        !department && "No rep department is set, so no rep management is copied. Set it at screening.",
        department && !contacts.some((x) => isEmail(x.email)) && `No contacts with an email are set up for ${department} (Settings).`,
        quoter && !quoterLine.length && `${quoter.name} has no reporting line set (Settings).`,
      ].filter(Boolean),
    };
  }

  const canSeeQuote = (user, quote) => quote && (quote.assigned_quoter_id === user.id || (user.roles || []).some((r) => ["Manager", "Margin Manager"].includes(r)));

  app.get("/api/v2/completed", quoterOnly, wrap(async (request, response) => {
    const quotes = await knex("quotes as q").leftJoin("accounts as a", "a.id", "q.account_id")
      .where({ "q.assigned_quoter_id": request.user.id, "q.status": "Approved" }).orderBy("q.updated_at", "desc")
      .select("q.id", "q.quote_number as number", "q.updated_at as updatedAt", "a.account_name as accountName", "q.company_name as companyName", "q.template_key as templateKey");
    const info = await completionFor(quotes.map((q) => q.id));
    const due = await knex("quote_followups as f").join("quotes as q", "q.id", "f.quote_id")
      .where("q.assigned_quoter_id", request.user.id).whereNull("f.answer").where("f.due_at", "<=", now()).count({ n: "f.id" }).first();
    response.set("Cache-Control", "no-store");
    response.json({
      quotes: quotes.map((q) => ({ id: q.id, number: q.number, account: q.accountName || q.companyName || "", template: templates.getTemplate(q.templateKey).name, updatedAt: q.updatedAt, next: stepOf(q, info) })),
      followupsDue: Number(due ? due.n : 0),
    });
  }));

  app.get("/api/v2/completed/:id", quoterOnly, wrap(async (request, response) => {
    const q = await knex("quotes").where({ id: request.params.id }).first();
    if (!canSeeQuote(request.user, q)) return fail(response, 404, "Quote not found.");
    if (q.status !== "Approved") return fail(response, 409, "This quote isn't approved yet.");
    response.set("Cache-Control", "no-store");
    response.json(await completedDetail(q.id, request));
  }));

  async function upsertCompletion(quoteId, values) {
    const existing = await knex("quote_completion").where({ quote_id: quoteId }).first();
    if (existing) await knex("quote_completion").where({ quote_id: quoteId }).update(values);
    else await knex("quote_completion").insert({ quote_id: quoteId, ...values });
  }

  app.post("/api/v2/completed/:id/offer", quoterOnly, wrap(async (request, response) => {
    const q = await knex("quotes").where({ id: request.params.id }).first();
    if (!canSeeQuote(request.user, q)) return fail(response, 404, "Quote not found.");
    const settings = await getSettings();
    await upsertCompletion(q.id, { offer_percent: request.body && request.body.on ? Number(settings.offer_percent || 0) : 0 });
    response.json(await completedDetail(q.id, request));
  }));

  app.post("/api/v2/completed/:id/confirm-locked", quoterOnly, wrap(async (request, response) => {
    const q = await knex("quotes").where({ id: request.params.id }).first();
    if (!canSeeQuote(request.user, q) || q.status !== "Approved") return fail(response, 404, "Quote not found.");
    const undo = request.body && request.body.undo === true;
    const existing = await knex("quote_completion").where({ quote_id: q.id }).first();
    if (undo && existing && existing.email_at) return fail(response, 409, "The email has already been sent, so the lock-in can't be undone.");
    await upsertCompletion(q.id, undo ? { locked_at: null, locked_by_id: null } : { locked_at: now(), locked_by_id: request.user.id });
    response.json(await completedDetail(q.id, request));
  }));

  // The quoter opened the pre-filled email: record it and plan the first follow-up.
  app.post("/api/v2/completed/:id/email-sent", quoterOnly, wrap(async (request, response) => {
    const q = await knex("quotes").where({ id: request.params.id }).first();
    if (!canSeeQuote(request.user, q) || q.status !== "Approved") return fail(response, 404, "Quote not found.");
    const c = await knex("quote_completion").where({ quote_id: q.id }).first();
    if (!c || !c.locked_at) return fail(response, 409, "Confirm the prices are locked before sending the email.");
    const detail = await completedDetail(q.id, request);
    const settings = await getSettings();
    await upsertCompletion(q.id, { email_at: now(), email_by_id: request.user.id, email_to: detail.email.to.join(", "), email_cc: detail.email.cc.join(", "),
      email_subject: detail.email.subject, offer_percent: detail.offer.on ? detail.offer.percent : 0 });
    if (!(await knex("quote_followups").where({ quote_id: q.id }).first())) {
      await knex("quote_followups").insert({ id: randomUUID(), quote_id: q.id, token: randomBytes(24).toString("hex"), round: 1,
        due_at: addBusinessDays(now(), Number(settings.followup_business_days || 2)) });
    }
    response.json(await completedDetail(q.id, request));
  }));

  // Customer quote as a printable page: Save as PDF from the print window.
  app.get("/api/v2/completed/:id/print", quoterOnly, wrap(async (request, response) => {
    const q = await knex("quotes").where({ id: request.params.id }).first();
    if (!canSeeQuote(request.user, q)) return fail(response, 404, "Quote not found.");
    const state = await quoteStages.fullState(q.id);
    response.set("Cache-Control", "no-store");
    response.type("html").send(printPage(state));
  }));

  // ---- follow-ups
  async function answerFollowup(followup, { answer, orderNumbers, amount, note }, via, userId) {
    if (!ANSWERS.includes(answer)) throw Object.assign(new Error("Choose Ordered, Partly ordered, Not yet or No answer."), { status: 400 });
    const numbers = String(orderNumbers || "").split(/[\s,;]+/).map((n) => n.trim()).filter(Boolean).slice(0, 20).join(", ");
    if (["Ordered", "Partly ordered"].includes(answer) && !numbers) throw Object.assign(new Error("Add the order number."), { status: 400 });
    const value = amount === undefined || amount === null || amount === "" ? null : Number(String(amount).replace(/[$,\s]/g, ""));
    await knex("quote_followups").where({ id: followup.id }).update({
      answer, order_numbers: numbers || null, order_amount: Number.isFinite(value) ? value : null, note: note ? String(note).slice(0, 1000) : null,
      answered_at: now(), answered_via: via, recorded_by_id: userId || null,
    });
    if (answer === "Not yet" && followup.round === 1) {
      const settings = await getSettings();
      await knex("quote_followups").insert({ id: randomUUID(), quote_id: followup.quote_id, token: randomBytes(24).toString("hex"), round: 2,
        due_at: now() + Number(settings.reminder_days || 7) * DAY });
    }
  }

  app.get("/api/v2/followups", quoterOnly, wrap(async (request, response) => {
    const lead = (request.user.roles || []).includes("Manager");
    let query = knex("quote_followups as f").join("quotes as q", "q.id", "f.quote_id").leftJoin("accounts as a", "a.id", "q.account_id")
      .leftJoin("users as u", "u.id", "q.assigned_quoter_id")
      .select("f.*", "q.quote_number as number", "a.account_name as accountName", "q.company_name as companyName", "u.name as quoterName", "q.assigned_quoter_id as quoterId")
      .orderBy("f.due_at");
    if (!lead || request.query.mine === "1") query = query.where("q.assigned_quoter_id", request.user.id);
    const rows = await query;
    response.set("Cache-Control", "no-store");
    response.json({ followups: rows.map((f) => ({ id: f.id, quoteId: f.quote_id, number: f.number, account: f.accountName || f.companyName || "", quoter: f.quoterName,
      round: f.round, dueAt: f.due_at, due: !f.answer && f.due_at <= now(), answer: f.answer, orderNumbers: f.order_numbers, orderAmount: f.order_amount })) });
  }));

  app.post("/api/v2/followups/:id/sent", quoterOnly, wrap(async (request, response) => {
    await knex("quote_followups").where({ id: request.params.id }).whereNull("sent_at").update({ sent_at: now() });
    response.json({ ok: true });
  }));

  app.post("/api/v2/followups/:id/answer", quoterOnly, wrap(async (request, response) => {
    const f = await knex("quote_followups").where({ id: request.params.id }).first();
    if (!f) return fail(response, 404, "Follow-up not found.");
    const q = await knex("quotes").where({ id: f.quote_id }).first();
    if (!canSeeQuote(request.user, q)) return fail(response, 404, "Follow-up not found.");
    try { await answerFollowup(f, request.body || {}, "quoter", request.user.id); } catch (error) { return fail(response, error.status || 400, error.message); }
    response.json(await completedDetail(q.id, request));
  }));

  // The rep's one-click page. No sign-in: the long random link is the key, and it shows nothing internal.
  app.get("/f/:token", wrap(async (request, response) => {
    const f = await knex("quote_followups").where({ token: request.params.token }).first();
    const q = f ? await quoteRow(f.quote_id) : null;
    response.set("Cache-Control", "no-store");
    response.type("html").send(followupPage(f, q, request.query.answer));
  }));

  app.post("/f/:token", wrap(async (request, response) => {
    const f = await knex("quote_followups").where({ token: request.params.token }).first();
    if (!f) return fail(response, 404, "This link isn't valid.");
    if (f.answer && f.answer !== "Not yet") return fail(response, 409, "Thanks, we already have an answer for this quote.");
    try { await answerFollowup(f, request.body || {}, "rep link", null); } catch (error) { return fail(response, error.status || 400, error.message); }
    const q = await knex("quotes").where({ id: f.quote_id }).first();
    if (q && q.assigned_quoter_id) {
      await database.quotes.notify({ userId: q.assigned_quoter_id, quoteId: q.id, kind: "followup",
        message: `${q.quote_number}: the rep answered "${request.body.answer}"${request.body.orderNumbers ? ` (order ${request.body.orderNumbers})` : ""}.` });
    }
    response.json({ ok: true });
  }));

  return { ready: ensure };
}

// ---------------------------------------------------------------- small pages served as HTML

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function followupPage(f, q, preset) {
  const head = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Did the customer order?</title>
  <style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f4f5f7;color:#1d2433;margin:0;padding:24px}main{max-width:520px;margin:40px auto;background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
  h1{font-size:20px;margin:0 0 6px}p{line-height:1.5;color:#4a5568}.choices{display:grid;gap:10px;margin:18px 0}button{font:inherit;padding:12px;border-radius:8px;border:1px solid #c9ced8;background:#fff;cursor:pointer;text-align:left}
  button.is-on{border-color:#2457d6;background:#eef3ff}label{display:block;font-weight:600;margin-top:12px}input{font:inherit;width:100%;box-sizing:border-box;padding:10px;border:1px solid #c9ced8;border-radius:8px;margin-top:4px}
  .send{background:#2457d6;color:#fff;border:0;text-align:center;margin-top:16px;width:100%}.msg{margin-top:12px;font-weight:600}</style></head><body><main>`;
  if (!f || !q) return `${head}<h1>This link isn't valid</h1><p>Ask the quote team for a new one.</p></main></body></html>`;
  if (f.answer && f.answer !== "Not yet") return `${head}<h1>Thank you!</h1><p>We have your answer for quote ${escapeHtml(q.quote_number)}: <b>${escapeHtml(f.answer)}</b>${f.order_numbers ? ` · order ${escapeHtml(f.order_numbers)}` : ""}.</p></main></body></html>`;
  return `${head}<h1>Did ${escapeHtml(q.accountName || q.company_name || "the customer")} order?</h1>
  <p>Quote <b>${escapeHtml(q.quote_number)}</b>. Pick an answer. If they ordered, add the order number so we can match it to this quote.</p>
  <div class="choices">${["Ordered", "Partly ordered", "Not yet"].map((a) => `<button type="button" data-answer="${a}"${preset === a ? ' class="is-on"' : ""}>${a === "Ordered" ? "Yes, they ordered" : a === "Partly ordered" ? "They ordered some of the items" : "Not yet"}</button>`).join("")}</div>
  <div id="order" hidden><label for="numbers">Order number(s)</label><input id="numbers" autocomplete="off" placeholder="For example 4821337, separate several with commas"/>
  <label for="amount">Order amount (optional)</label><input id="amount" inputmode="decimal" placeholder="$"/></div>
  <button type="button" class="send" id="send">Send answer</button><p class="msg" id="msg" role="status"></p>
  <script>
    let answer = ${JSON.stringify(["Ordered", "Partly ordered", "Not yet"].includes(preset) ? preset : "")};
    const order = document.getElementById("order"), msg = document.getElementById("msg");
    const show = () => { order.hidden = !(answer === "Ordered" || answer === "Partly ordered"); document.querySelectorAll("[data-answer]").forEach((b) => b.classList.toggle("is-on", b.dataset.answer === answer)); };
    document.querySelectorAll("[data-answer]").forEach((b) => b.addEventListener("click", () => { answer = b.dataset.answer; show(); }));
    show();
    document.getElementById("send").addEventListener("click", async () => {
      if (!answer) { msg.textContent = "Pick an answer first."; return; }
      const res = await fetch(location.pathname, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, orderNumbers: document.getElementById("numbers").value, amount: document.getElementById("amount").value }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { msg.textContent = data.error || "That didn't work. Try again."; return; }
      document.querySelector("main").innerHTML = "<h1>Thank you!</h1><p>Your answer was sent to the quote team.</p>";
    });
  </script></main></body></html>`;
}

function printPage(state) {
  const t = state.template;
  const fmt = (field, v) => {
    if (v === null || v === undefined || v === "") return "";
    if (templates.PERCENT_FIELDS.has(field)) return `${(Number(v) * 100).toFixed(1)}%`;
    if (templates.MONEY_FIELDS.has(field)) return money(v);
    return escapeHtml(v);
  };
  const rows = state.lines.map((line) => {
    const colors = quoteStagesModule.lineColors(line, "customer");
    return `<tr${colors.row ? ` style="background:#${colors.row}"` : ""}>${t.customer.map((c) => `<td${colors.cells[c.field] ? ` style="background:#${colors.cells[c.field]}"` : ""}>${fmt(c.field, line.view[c.field])}</td>`).join("")}</tr>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(state.quote.number)} customer quote</title>
  <style>@page{size:landscape;margin:12mm}body{font-family:Calibri,Arial,sans-serif;color:#111;margin:16px}h1{font-size:18px;margin:0}p{margin:2px 0;font-size:12px}
  table{border-collapse:collapse;width:100%;margin-top:12px;font-size:10.5px}th,td{border:1px solid #9aa3b2;padding:4px 5px;vertical-align:top}th{background:#ddebf7;text-align:left}
  .bar{margin:0 0 12px;font:14px system-ui}.bar button{font:inherit;padding:6px 12px}@media print{.bar{display:none}}</style></head><body>
  <div class="bar"><button onclick="window.print()">Save as PDF</button> Choose "Save as PDF" as the printer, then attach the file to the email.</div>
  <h1>Order with us today! Here are our Amazingly Low Prices!</h1>
  <p>${escapeHtml([state.quote.accountNumber, state.quote.accountName].filter(Boolean).join(" - "))}</p>
  <p>Date of Quote: ${new Date().toLocaleDateString("en-US")}</p>
  ${state.quote.repName ? `<p>Personal Sales Representative: ${escapeHtml(state.quote.repName)}${state.quote.repEmail ? ` · ${escapeHtml(state.quote.repEmail)}` : ""}</p>` : ""}
  <table><thead><tr>${t.customer.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
  <script>setTimeout(() => window.print(), 400);</script></body></html>`;
}

module.exports = { register, addBusinessDays, businessDaysBetween, reportingLine, buildFinalEmail, buildFollowupEmail, mailtoUrl, summarizeWorkload,
  followupPage, printPage, SETTING_DEFAULTS, ANSWERS };
