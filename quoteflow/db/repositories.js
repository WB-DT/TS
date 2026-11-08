const { createHash, randomUUID } = require("node:crypto");
const fieldCatalog = require("../fields");

const ROLE_ORDER = ["Manager", "Margin Manager", "Qualifier", "Quoter", "Reviser", "Rep"];
const ALL_ROLES = [...ROLE_ORDER];
const USER_TEAMS = ["Quotes", "MDM"];

// "Can approve" permission: Managers approve by default; a Reviser can be
// granted the permission via users.can_approve.
function userCanApprove(user) {
  const roles = Array.isArray(user?.roles) && user.roles.length ? user.roles : [user?.role];
  if (roles.includes("Manager")) return true;
  return roles.includes("Reviser") && Boolean(user?.can_approve ?? user?.canApprove);
}

function sortRoles(roles) {
  return [...roles].sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
}

function normalizeRoleList(value) {
  const roles = Array.isArray(value) ? value : [];
  return sortRoles([...new Set(roles.map((role) => String(role).trim()).filter(Boolean))]);
}

function fieldValue(field) {
  if (field && typeof field === "object" && Object.hasOwn(field, "value")) {
    return field.value === null || field.value === undefined ? "" : String(field.value);
  }
  return field === null || field === undefined ? "" : String(field);
}

function scoreValue(field) {
  const score = Number(field?.confidence);
  return Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0;
}

function numericValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function sqlDate(value) {
  const date = String(value || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return date || null;
}

function fieldConfidenceMinimum(fields) {
  const scores = Object.values(fields || {}).map(scoreValue);
  return scores.length ? Math.min(...scores) : 0;
}

function lineItemRow(item, fileId, lineNumber, editedByQuoter) {
  const values = item || {};
  const get = (key) => fieldValue(values[key]);
  return {
    id: randomUUID(),
    file_id: fileId,
    line_number: lineNumber,
    competitor_item_no: get("competitorItemNumber") || null,
    manufacturer_part_no: get("manufacturerPartNumber") || null,
    brand: get("brand") || null,
    description_raw: get("description") || null,
    description_summary: get("descriptionSummary") || null,
    uom: get("unitOfMeasure") || null,
    count_per_unit: numericValue(get("countPerUnit")),
    price_per_uom: numericValue(get("pricePerUnitOfMeasure")),
    quantity: numericValue(get("quantityPurchased")),
    extended_price: numericValue(get("extendedPrice")),
    normalized_unit_price: numericValue(get("normalizedUnitPrice")),
    tax: numericValue(get("tax")),
    shipping: numericValue(get("shipping")),
    fees: numericValue(get("fees")),
    source_page: get("sourcePageLine") || null,
    confidence_min: fieldConfidenceMinimum(values),
    needs_review: Object.values(values).some((field) => (
      field && typeof field === "object" && Object.hasOwn(field, "needsReview")
        ? field.needsReview
        : scoreValue(field) < 0.8
    )),
    edited_by_quoter: editedByQuoter,
  };
}

function extractedFieldRow({ quoteFileId, lineItemId = null, fieldGroup, fieldName, template, field, extractedAt }) {
  const value = fieldValue(field);
  return {
    id: randomUUID(),
    quote_file_id: quoteFileId,
    line_item_id: lineItemId,
    field_group: fieldGroup,
    field_name: fieldName,
    template,
    original_value: value,
    current_value: value,
    confidence: scoreValue(field),
    needs_review: Boolean(field && typeof field === "object" && Object.hasOwn(field, "needsReview")
      ? field.needsReview
      : scoreValue(field) < 0.8),
    extracted_at: extractedAt,
  };
}

function createRepositories(knex) {
  async function findUserByEmail(email) {
    const user = await knex("users").where({ email: String(email).toLowerCase(), active: true }).first();
    if (!user) return null;
    const roleRows = await knex("user_roles").where({ user_id: user.id }).select("role");
    const roles = roleRows.length ? sortRoles(roleRows.map((row) => row.role)) : [user.role];
    return { ...user, roles };
  }

  async function listUsersWithRoles() {
    const allUsers = await knex("users").where({ active: true }).select("id", "email", "name", "team", "role").orderBy("name");
    const roleRows = await knex("user_roles").select("user_id", "role");
    const rolesByUser = new Map();
    for (const row of roleRows) {
      if (!rolesByUser.has(row.user_id)) rolesByUser.set(row.user_id, []);
      rolesByUser.get(row.user_id).push(row.role);
    }
    return allUsers.map((user) => ({ ...user, roles: rolesByUser.get(user.id) || [user.role] }));
  }

  async function listActiveQuoters() {
    return knex("users")
      .select("id", "email", "name", "team")
      .where({ role: "Quoter", active: true })
      .orderBy("name");
  }

  function userError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  async function rolesForUser(trx, user) {
    const roleRows = await trx("user_roles").where({ user_id: user.id }).select("role");
    return roleRows.length ? sortRoles(roleRows.map((row) => row.role)) : [user.role];
  }

  async function logUserAudit(trx, { userId, changedById = null, field, oldValue = null, newValue = null }) {
    await trx("user_audit").insert({
      id: randomUUID(),
      user_id: userId,
      changed_by_id: changedById,
      field,
      old_value: oldValue,
      new_value: newValue,
      changed_at: Math.floor(Date.now() / 1000),
    });
  }

  async function otherActiveManagerCount(trx, userId) {
    const row = await trx("user_roles")
      .join("users", "users.id", "user_roles.user_id")
      .where("user_roles.role", "Manager")
      .where("users.active", true)
      .whereNot("user_roles.user_id", userId)
      .count({ count: "user_roles.user_id" })
      .first();
    return Number(row.count);
  }

  async function listAllWithRoles() {
    const allUsers = await knex("users")
      .select("id", "email", "name", "team", "role", "active", "last_sign_in_at", "can_approve")
      .orderBy("name");
    const roleRows = await knex("user_roles").select("user_id", "role");
    const rolesByUser = new Map();
    for (const row of roleRows) {
      if (!rolesByUser.has(row.user_id)) rolesByUser.set(row.user_id, []);
      rolesByUser.get(row.user_id).push(row.role);
    }
    return allUsers.map((user) => ({
      ...user,
      active: Boolean(user.active),
      can_approve: Boolean(user.can_approve),
      roles: sortRoles(rolesByUser.get(user.id) || [user.role]),
    }));
  }

  async function getUserDetail(userId) {
    const user = await knex("users").where({ id: userId }).first();
    if (!user) return null;
    const roles = await rolesForUser(knex, user);
    const audit = await knex("user_audit as ua")
      .leftJoin("users as u", "u.id", "ua.changed_by_id")
      .select(
        "ua.id",
        "ua.field",
        "ua.old_value as oldValue",
        "ua.new_value as newValue",
        "ua.changed_at as changedAt",
        "u.name as changedByName",
        "u.email as changedByEmail",
      )
      .where("ua.user_id", userId)
      .orderBy("ua.changed_at", "desc");
    return { ...user, active: Boolean(user.active), can_approve: Boolean(user.can_approve), roles, audit };
  }

  function validateUserInput({ name, email, roles, team, canApprove }) {
    const normalized = {
      name: String(name || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      team: String(team || "").trim(),
      roles: normalizeRoleList(roles),
      canApprove: Boolean(canApprove),
    };
    if (!normalized.name || normalized.name.length > 160) {
      throw userError("A name is required (160 characters or fewer).", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
      throw userError("A valid work email is required.", 400);
    }
    if (!USER_TEAMS.includes(normalized.team)) {
      throw userError("Choose the Quotes or MDM team.", 400);
    }
    if (!normalized.roles.length || normalized.roles.some((role) => !ALL_ROLES.includes(role))) {
      throw userError("Choose at least one valid role.", 400);
    }
    if (normalized.canApprove && !normalized.roles.includes("Reviser") && !normalized.roles.includes("Manager")) {
      throw userError("Only a Reviser can be given the Can approve permission. Managers can approve by default.", 400);
    }
    return normalized;
  }

  async function createUser({ name, email, roles, team, canApprove }, changedBy) {
    const input = validateUserInput({ name, email, roles, team, canApprove });
    return knex.transaction(async (trx) => {
      const existing = await trx("users").where({ email: input.email }).first();
      if (existing) throw userError("A user with that email already exists.", 409);
      const user = {
        id: randomUUID(),
        email: input.email,
        name: input.name,
        role: input.roles[0],
        team: input.team,
        active: true,
        can_approve: input.canApprove,
      };
      await trx("users").insert(user);
      for (const role of input.roles) {
        await trx("user_roles").insert({ user_id: user.id, role });
      }
      await logUserAudit(trx, {
        userId: user.id,
        changedById: changedBy.id,
        field: "created",
        newValue: `${input.name} <${input.email}> · ${input.roles.join(", ")} · ${input.team}${input.canApprove ? " · Can approve" : ""}`,
      });
      return { ...user, can_approve: input.canApprove, roles: input.roles };
    });
  }

  async function updateUserRoles({ userId, roles, canApprove, changedBy }) {
    const nextRoles = normalizeRoleList(roles);
    if (!nextRoles.length || nextRoles.some((role) => !ALL_ROLES.includes(role))) {
      throw userError("Choose at least one valid role.", 400);
    }
    const nextCanApprove = canApprove === undefined ? null : Boolean(canApprove);
    if (nextCanApprove === true && !nextRoles.includes("Reviser") && !nextRoles.includes("Manager")) {
      throw userError("Only a Reviser can be given the Can approve permission. Managers can approve by default.", 400);
    }
    return knex.transaction(async (trx) => {
      const user = await trx("users").where({ id: userId }).first();
      if (!user) throw userError("User not found.", 404);
      const currentRoles = await rolesForUser(trx, user);
      const rolesChanged = currentRoles.join("|") !== nextRoles.join("|");
      const permissionChanged = nextCanApprove !== null && nextCanApprove !== Boolean(user.can_approve);
      if (!rolesChanged && !permissionChanged) {
        return { ...user, active: Boolean(user.active), can_approve: Boolean(user.can_approve), roles: currentRoles };
      }
      const removingManager = rolesChanged && currentRoles.includes("Manager") && !nextRoles.includes("Manager");
      if (removingManager && changedBy.id === userId) {
        throw userError("You can't remove your own Manager role. Ask another Manager to make this change.", 400);
      }
      if (removingManager && user.active && (await otherActiveManagerCount(trx, userId)) === 0) {
        throw userError("QuoteFlow must always have at least one active Manager. Give another active user the Manager role first.", 409);
      }
      let primaryRole = user.role;
      if (rolesChanged) {
        await trx("user_roles").where({ user_id: userId }).delete();
        for (const role of nextRoles) {
          await trx("user_roles").insert({ user_id: userId, role });
        }
        primaryRole = nextRoles.includes(user.role) ? user.role : nextRoles[0];
        if (primaryRole !== user.role) {
          await trx("users").where({ id: userId }).update({ role: primaryRole });
        }
        await logUserAudit(trx, {
          userId,
          changedById: changedBy.id,
          field: "roles",
          oldValue: currentRoles.join(", "),
          newValue: nextRoles.join(", "),
        });
      }
      if (permissionChanged) {
        await trx("users").where({ id: userId }).update({ can_approve: nextCanApprove });
        await logUserAudit(trx, {
          userId,
          changedById: changedBy.id,
          field: "can_approve",
          oldValue: user.can_approve ? "Yes" : "No",
          newValue: nextCanApprove ? "Yes" : "No",
        });
      }
      return { ...user, role: primaryRole, active: Boolean(user.active), can_approve: nextCanApprove ?? Boolean(user.can_approve), roles: nextRoles };
    });
  }

  async function setUserActive({ userId, active, changedBy }) {
    const nextActive = Boolean(active);
    return knex.transaction(async (trx) => {
      const user = await trx("users").where({ id: userId }).first();
      if (!user) throw userError("User not found.", 404);
      if (Boolean(user.active) === nextActive) {
        return { ...user, active: nextActive };
      }
      if (!nextActive) {
        const currentRoles = await rolesForUser(trx, user);
        if (currentRoles.includes("Manager") && (await otherActiveManagerCount(trx, userId)) === 0) {
          throw userError("QuoteFlow must always have at least one active Manager. Give another active user the Manager role first.", 409);
        }
      }
      await trx("users").where({ id: userId }).update({ active: nextActive });
      await logUserAudit(trx, {
        userId,
        changedById: changedBy.id,
        field: "status",
        oldValue: user.active ? "active" : "inactive",
        newValue: nextActive ? "active" : "inactive",
      });
      return { ...user, active: nextActive };
    });
  }

  async function recordSignIn(userId) {
    await knex("users").where({ id: userId }).update({ last_sign_in_at: Math.floor(Date.now() / 1000) });
  }

  // First-manager setup: on startup, every user whose email is listed in the
  // MANAGER_EMAILS environment variable is granted the Manager role.
  async function applyManagerEmails(value) {
    const emails = String(value || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const granted = [];
    for (const email of emails) {
      const user = await knex("users").where({ email }).first();
      if (!user) continue;
      const currentRoles = await rolesForUser(knex, user);
      if (currentRoles.includes("Manager")) continue;
      const nextRoles = sortRoles([...currentRoles, "Manager"]);
      await knex.transaction(async (trx) => {
        await trx("user_roles").insert({ user_id: user.id, role: "Manager" });
        await logUserAudit(trx, {
          userId: user.id,
          field: "roles",
          oldValue: currentRoles.join(", "),
          newValue: nextRoles.join(", "),
        });
      });
      granted.push(email);
    }
    return granted;
  }

  async function listRequestOptions(repId) {
    const [accounts, ppls, salesManagers, settings] = await Promise.all([
      knex("accounts").select("id", "account_number", "account_name").orderBy("account_name"),
      knex("ppls").select("id", "account_id", "name").orderBy("name"),
      knex("sales_managers").select("id", "name").orderBy("name"),
      getSettings(),
    ]);
    const repManager = repId
      ? await knex("rep_sales_managers").where({ rep_id: repId }).first("sales_manager_id")
      : null;
    return {
      accounts: accounts.map((account) => ({
        ...account,
        ppls: ppls.filter((ppl) => ppl.account_id === account.id),
      })),
      salesManagers: repManager
        ? salesManagers.filter((manager) => manager.id === repManager.sales_manager_id)
        : salesManagers,
      standardLeadTimeDays: Number(settings.standard_lead_time_days || 14),
    };
  }

  async function createPpl({ accountNumber, accountName, name }) {
    const normalizedNumber = String(accountNumber || "").trim().toUpperCase();
    const normalizedName = String(name || "").trim();
    if (!/^C\d+$/.test(normalizedNumber) || !normalizedName) {
      const error = new Error("A valid C account number and PPL name are required.");
      error.status = 400;
      throw error;
    }
    return knex.transaction(async (trx) => {
      let account = await trx("accounts").where({ account_number: normalizedNumber }).first();
      if (!account) {
        account = {
          id: randomUUID(),
          account_number: normalizedNumber,
          account_name: String(accountName || "Unknown account").trim(),
        };
        await trx("accounts").insert(account);
      }
      const existing = await trx("ppls").where({ account_id: account.id, name: normalizedName }).first();
      if (existing) return existing;
      const ppl = { id: randomUUID(), account_id: account.id, name: normalizedName };
      await trx("ppls").insert(ppl);
      return ppl;
    });
  }

  async function getSettings() {
    const rows = await knex("settings").select("key", "value");
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async function updateSettings(values) {
    await knex.transaction(async (trx) => {
      for (const [key, value] of Object.entries(values)) {
        const existing = await trx("settings").where({ key }).first("key");
        if (existing) {
          await trx("settings").where({ key }).update({ value: String(value) });
        } else {
          await trx("settings").insert({ key, value: String(value) });
        }
      }
    });
    return getSettings();
  }

  async function listWorkspaceQuotes(user) {
    const latestFiles = knex("quote_files")
      .select("quote_id")
      .max({ latest_uploaded_at: "uploaded_at" })
      .groupBy("quote_id")
      .as("latest_files");
    const totals = knex("quote_files as total_files")
      .join("line_items as total_items", "total_items.file_id", "total_files.id")
      .select("total_files.quote_id")
      .sum({ quote_total: "total_items.extended_price" })
      .groupBy("total_files.quote_id")
      .as("quote_totals");
    const query = knex("quotes as q")
      .leftJoin("accounts as a", "a.id", "q.account_id")
      .leftJoin(latestFiles, "latest_files.quote_id", "q.id")
      .leftJoin("quote_files as f", function joinLatestFile() {
        this.on("f.quote_id", "q.id").andOn("f.uploaded_at", "latest_files.latest_uploaded_at");
      })
      .leftJoin("users as submitter", "submitter.id", "q.submitted_by_rep")
      .leftJoin("users as assigned", "assigned.id", "q.assigned_quoter_id")
      .leftJoin(totals, "quote_totals.quote_id", "q.id")
      .select(
        "q.id as databaseId",
        "q.quote_number as id",
        "q.quote_number as quoteNumber",
        "q.quote_type as quoteType",
        "a.account_number as accountNumber",
        "a.account_name as accountName",
        "q.company_name as companyName",
        "q.submitter_role as submitterRole",
        "q.priority",
        "q.needed_by as neededBy",
        "f.invoice_source as supplier",
        "f.file_name as fileName",
        "q.status",
        "q.team",
        "q.template",
        "q.assigned_quoter_id as assignedQuoterId",
        "q.screened_by_id as screenedById",
        "q.final_reviewer_id as finalReviewerId",
        "submitter.email as submittedBy",
        "submitter.name as submittedByName",
        "assigned.email as assignedTo",
        "assigned.name as assignedToName",
        "q.created_at as createdAt",
        "q.updated_at as updatedAt",
        "quote_totals.quote_total as amount",
      )
      .orderBy("q.updated_at", "desc");

    if (user.role === "Reviser") {
      query.where("q.team", user.team).whereIn("q.status", [
        "In revision",
        "Returned to reviser",
        "Awaiting approval",
      ]);
    } else if (user.role === "Quoter") {
      query.where((builder) => builder
        .where("q.assigned_quoter_id", user.id)
        .orWhere("q.submitted_by_rep", user.id));
    } else if (user.role === "Rep") {
      query.where("q.submitted_by_rep", user.id);
    }

    const rows = await query;
    return rows.map((quote) => ({
      ...quote,
      quoteType: quote.quoteType || "Quote",
      priority: quote.priority || "Standard",
      owner: quote.assignedToName || quote.assignedTo || quote.submittedByName || quote.submittedBy || "Unassigned",
      rep: quote.submittedByName || quote.submittedBy || "",
      amount: Number(quote.amount) || 0,
      updated: quote.updatedAt ? new Date(Number(quote.updatedAt) * 1000).toLocaleDateString("en-US") : "",
      submitted: quote.createdAt ? new Date(Number(quote.createdAt) * 1000).toLocaleDateString("en-US") : "",
    }));
  }

  async function listRequestsForRep(user) {
    const rows = await knex("quotes as q")
      .leftJoin("accounts as a", "a.id", "q.account_id")
      .leftJoin("ppls as p", "p.id", "q.ppl_id")
      .select(
        "q.id as databaseId",
        "q.quote_number as id",
        "q.request_type as requestType",
        "q.company_name as companyName",
        "a.account_number as accountNumber",
        "a.account_name as accountName",
        "p.name as pplName",
        "q.customer_needs as customerNeeds",
        "q.priority",
        "q.needed_by as neededBy",
        "q.asap_reason as asapReason",
        "q.status",
        "q.created_at as createdAt",
        "q.updated_at as updatedAt",
      )
      .where("q.submitted_by_id", user.id)
      .orderBy("q.created_at", "desc");
    return rows.map((quote) => ({
      ...quote,
      supplier: quote.companyName || quote.accountName || "New request",
      owner: user.email,
      amount: 0,
      updated: quote.updatedAt ? new Date(Number(quote.updatedAt) * 1000).toLocaleDateString("en-US") : "",
    }));
  }

  // Open quotes owned by deactivated users, surfaced on the Manager dashboard
  // so the work can be reassigned.
  async function listNeedsReassignment() {
    const rows = await knex("quotes as q")
      .join("users as u", "u.id", "q.assigned_quoter_id")
      .leftJoin("accounts as a", "a.id", "q.account_id")
      .select(
        "q.id as databaseId",
        "q.quote_number as id",
        "q.status",
        "q.priority",
        "q.team",
        "q.company_name as companyName",
        "a.account_name as accountName",
        "u.name as assignedToName",
        "u.email as assignedTo",
        "q.updated_at as updatedAt",
      )
      .where("u.active", false)
      .whereNotIn("q.status", ["Approved", "Sent to customer", "Declined"])
      .orderBy("q.updated_at", "desc");
    return rows.map((quote) => ({
      ...quote,
      updated: quote.updatedAt ? new Date(Number(quote.updatedAt) * 1000).toLocaleDateString("en-US") : "",
    }));
  }

  async function getQuoteDetail(quoteId) {
    const quote = await knex("quotes as q")
      .leftJoin("accounts as a", "a.id", "q.account_id")
      .leftJoin("ppls as p", "p.id", "q.ppl_id")
      .leftJoin("sales_managers as sm", "sm.id", "q.asap_approved_by")
      .leftJoin("users as submitter", "submitter.id", "q.submitted_by_rep")
      .leftJoin("users as assigned", "assigned.id", "q.assigned_quoter_id")
      .select(
        "q.*",
        "a.account_number as accountNumber",
        "a.account_name as accountName",
        "p.name as pplName",
        "sm.name as asapApprovedByName",
        "submitter.name as submittedByName",
        "submitter.email as submittedByEmail",
        "assigned.name as assignedToName",
        "assigned.email as assignedToEmail",
      )
      .where("q.id", quoteId)
      .first();
    if (!quote) return null;

    const [files, history, lineItems, changeLog] = await Promise.all([
      knex("quote_files as f")
        .leftJoin("users as u", "u.id", "f.uploaded_by_id")
        .select("f.id", "f.file_name as fileName", "f.file_type as fileType", "f.file_hash as fileHash", "f.storage_key as storageKey", "f.uploaded_at as uploadedAt", "f.invoice_source as invoiceSource", "f.invoice_date as invoiceDate", "u.name as uploadedByName")
        .where("f.quote_id", quoteId)
        .orderBy("f.uploaded_at"),
      knex("quote_status_history as h")
        .leftJoin("users as u", "u.id", "h.changed_by_id")
        .select("h.id", "h.from_status as fromStatus", "h.to_status as toStatus", "h.changed_at as changedAt", "h.reason", "u.name as changedByName")
        .where("h.quote_id", quoteId)
        .orderBy("h.changed_at", "desc"),
      knex("line_items as li")
        .join("quote_files as qf", "qf.id", "li.file_id")
        .select("li.id", "li.line_number as lineNumber", "li.competitor_item_no as itemNumber", "li.manufacturer_part_no as partNumber", "li.brand", "li.description_raw as description", "li.uom", "li.quantity", "li.price_per_uom as price", "li.extended_price as extendedPrice", "li.needs_review as needsReview", "li.edited_by_quoter as editedByQuoter")
        .where("qf.quote_id", quoteId)
        .orderBy("li.line_number"),
      knex("field_edits as fe")
        .leftJoin("users as u", "u.id", "fe.edited_by_id")
        .leftJoin("line_items as li", "li.id", "fe.line_item_id")
        .select("fe.id", "fe.field_name as field", "fe.original_value as oldValue", "fe.new_value as newValue", "fe.reason", "fe.reason_note as reasonNote", "fe.coaching_opportunity as coaching", "fe.coaching_category as coachingCategory", "fe.edited_at as editedAt", "u.name as editorName", "li.line_number as lineNumber")
        .whereIn("fe.quote_file_id", knex("quote_files").select("id").where("quote_id", quoteId))
        .orderBy("fe.edited_at", "desc"),
    ]);

    return {
      ...quote,
      quoteType: quote.quote_type || "Quote",
      files: files.map((file) => ({
        ...file,
        uploadedAt: file.uploadedAt ? new Date(Number(file.uploadedAt) * 1000).toISOString() : null,
      })),
      history: history.map((entry) => ({
        ...entry,
        changedAt: entry.changedAt ? new Date(Number(entry.changedAt) * 1000).toISOString() : null,
      })),
      lineItems,
      changeLog: changeLog.map((entry) => ({
        ...entry,
        editedAt: entry.editedAt ? new Date(Number(entry.editedAt) * 1000).toISOString() : null,
      })),
    };
  }

  async function addQuoteFile({ quoteId, user, file }) {
    return knex.transaction(async (trx) => {
      const quote = await trx("quotes").where({ id: quoteId }).first();
      if (!quote) {
        const error = new Error("Quote not found.");
        error.status = 404;
        throw error;
      }
      const now = Math.floor(Date.now() / 1000);
      const fileId = file.id || randomUUID();
      const fileName = String(file.fileName || file.originalname).replace(/[\\/]/g, "_").slice(0, 255);
      await trx("quote_files").insert({
        id: fileId,
        quote_id: quoteId,
        file_name: fileName,
        file_type: file.fileType || file.mimetype,
        file_hash: file.fileHash,
        uploaded_by_id: user.id,
        uploaded_at: now,
        invoice_source: null,
        invoice_date: null,
        storage_key: file.storageKey || null,
      });
      await trx("quote_status_history").insert({
        id: randomUUID(),
        quote_id: quoteId,
        from_status: null,
        to_status: "File added",
        changed_by_id: user.id,
        changed_at: now,
        reason: `File "${fileName}" added.`,
      });
      return { fileId, fileName, fileHash: file.fileHash, storageKey: file.storageKey || null };
    });
  }

  async function replaceQuoteFile({ quoteId, fileId, user, file }) {
    return knex.transaction(async (trx) => {
      const existing = await trx("quote_files").where({ id: fileId, quote_id: quoteId }).first();
      if (!existing) {
        const error = new Error("File not found for this quote.");
        error.status = 404;
        throw error;
      }
      const now = Math.floor(Date.now() / 1000);
      const fileHash = file.fileHash || createHash("sha256").update(file.buffer).digest("hex");
      const fileName = String(file.fileName || file.originalname).replace(/[\\/]/g, "_").slice(0, 255);
      await trx("quote_files").where({ id: fileId }).update({
        file_name: fileName,
        file_type: file.fileType || file.mimetype,
        file_hash: fileHash,
        storage_key: file.storageKey || existing.storage_key,
        uploaded_by_id: user.id,
        uploaded_at: now,
      });
      await trx("quote_status_history").insert({
        id: randomUUID(),
        quote_id: quoteId,
        from_status: null,
        to_status: "File replaced",
        changed_by_id: user.id,
        changed_at: now,
        reason: `File "${existing.file_name}" replaced with "${fileName}".`,
      });
      return { fileId, fileHash, fileName, previousStorageKey: existing.storage_key };
    });
  }

  async function removeQuoteFile({ quoteId, fileId, user }) {
    return knex.transaction(async (trx) => {
      const existing = await trx("quote_files").where({ id: fileId, quote_id: quoteId }).first();
      if (!existing) {
        const error = new Error("File not found for this quote.");
        error.status = 404;
        throw error;
      }
      const now = Math.floor(Date.now() / 1000);
      await trx("quote_files").where({ id: fileId }).del();
      await trx("quote_status_history").insert({
        id: randomUUID(),
        quote_id: quoteId,
        from_status: null,
        to_status: "File removed",
        changed_by_id: user.id,
        changed_at: now,
        reason: `File "${existing.file_name}" removed.`,
      });
      return { fileId, removed: true, fileName: existing.file_name, storageKey: existing.storage_key };
    });
  }

  async function savePricingReport({ quoteId, reportType, fileName, userId, rows }) {
    const now = Math.floor(Date.now() / 1000);
    const existing = await knex("pricing_reports").where({ quote_id: quoteId, report_type: reportType }).first();
    const rowData = JSON.stringify(rows);
    if (existing) {
      await knex("pricing_reports").where({ id: existing.id }).update({
        file_name: fileName,
        uploaded_by_id: userId,
        uploaded_at: now,
        row_data: rowData,
      });
      return { id: existing.id, replaced: true };
    }
    const id = randomUUID();
    await knex("pricing_reports").insert({
      id,
      quote_id: quoteId,
      report_type: reportType,
      file_name: fileName,
      uploaded_by_id: userId,
      uploaded_at: now,
      row_data: rowData,
    });
    return { id, replaced: false };
  }

  async function getPricingReports(quoteId) {
    const rows = await knex("pricing_reports").where({ quote_id: quoteId }).select("id", "report_type as reportType", "file_name as fileName", "uploaded_at as uploadedAt", "row_data as rowData");
    return Object.fromEntries(rows.map((row) => [row.reportType, {
      ...row,
      rows: row.rowData ? JSON.parse(row.rowData) : [],
      rowData: undefined,
      uploadedAt: row.uploadedAt ? new Date(Number(row.uploadedAt) * 1000).toISOString() : null,
    }]));
  }

  async function getLinePricingForQuote(quoteId) {
    const rows = await knex("line_pricing as lp")
      .join("line_items as li", "li.id", "lp.line_item_id")
      .join("quote_files as qf", "qf.id", "li.file_id")
      .select("lp.*", "li.line_number as lineNumber", "li.description_raw as description", "li.uom", "li.competitor_item_no as itemNumber")
      .where("qf.quote_id", quoteId)
      .orderBy("li.line_number");
    return rows;
  }

  async function upsertLinePricing({ lineItemId, values, userId, quoteFileId }) {
    const existing = await knex("line_pricing").where({ line_item_id: lineItemId }).first();
    const now = Math.floor(Date.now() / 1000);
    if (existing) {
      // Log a final-price change to field_edits when it actually changes.
      if (values.final_price !== undefined && Number(existing.final_price) !== Number(values.final_price) && quoteFileId) {
        const extracted = await knex("quote_extracted_fields").where({ quote_file_id: quoteFileId, field_name: "finalPrice" }).first();
        if (extracted) {
          await knex("field_edits").insert({
            id: randomUUID(),
            line_item_id: lineItemId,
            quote_file_id: quoteFileId,
            extracted_field_id: extracted.id,
            field_name: "finalPrice",
            original_value: existing.final_price === null ? "" : String(existing.final_price),
            new_value: values.final_price === null ? "" : String(values.final_price),
            edited_by_id: userId,
            edited_at: now,
          });
          await knex("quote_extracted_fields").where({ id: extracted.id }).update({ current_value: String(values.final_price ?? "") });
        }
      }
      await knex("line_pricing").where({ line_item_id: lineItemId }).update(values);
      return { id: existing.id, updated: true };
    }
    const id = randomUUID();
    await knex("line_pricing").insert({ id, line_item_id: lineItemId, ...values });
    return { id, updated: false };
  }

  async function addComment({ quoteId, authorId, body, visibleToRep }) {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await knex("quote_comments").insert({
      id,
      quote_id: quoteId,
      author_id: authorId,
      body: String(body || "").trim(),
      visible_to_rep: Boolean(visibleToRep),
      created_at: now,
    });
    return { id, createdAt: new Date(now * 1000).toISOString() };
  }

  async function listComments(quoteId, { forRep = false } = {}) {
    const query = knex("quote_comments as c")
      .leftJoin("users as u", "u.id", "c.author_id")
      .select("c.id", "c.body", "c.visible_to_rep as visibleToRep", "c.created_at as createdAt", "u.name as authorName", "u.role as authorRole")
      .where("c.quote_id", quoteId)
      .orderBy("c.created_at", "asc");
    if (forRep) query.andWhere("c.visible_to_rep", true);
    const rows = await query;
    return rows.map((row) => ({ ...row, createdAt: row.createdAt ? new Date(Number(row.createdAt) * 1000).toISOString() : null }));
  }

  async function notify({ userId, quoteId, kind, message }) {
    const id = randomUUID();
    await knex("notifications").insert({
      id,
      user_id: userId,
      quote_id: quoteId || null,
      kind,
      message,
      read: false,
      created_at: Math.floor(Date.now() / 1000),
    });
    return { id };
  }

  async function listNotifications(userId) {
    const rows = await knex("notifications as n")
      .leftJoin("quotes as q", "q.id", "n.quote_id")
      .select("n.id", "n.kind", "n.message", "n.read", "n.created_at as createdAt", "q.quote_number as quoteNumber")
      .where("n.user_id", userId)
      .orderBy("n.created_at", "desc")
      .limit(50);
    return rows.map((row) => ({ ...row, createdAt: row.createdAt ? new Date(Number(row.createdAt) * 1000).toISOString() : null }));
  }

  async function markNotificationRead(userId, notificationId) {
    await knex("notifications").where({ id: notificationId, user_id: userId }).update({ read: true });
    return { id: notificationId, read: true };
  }

  async function addCoachingNote({ quoteId, lineItemId, quoterId, reviserId, category, note, visibility }) {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const shared = visibility === "shared";
    await knex("coaching_notes").insert({
      id,
      quote_id: quoteId,
      line_item_id: lineItemId || null,
      quoter_id: quoterId,
      reviser_id: reviserId,
      category,
      note: String(note || "").trim(),
      created_at: now,
      visibility: shared ? "shared" : "archived",
      shared_at: shared ? now : null,
      shared_by_id: null,
    });
    return { id, visibility: shared ? "shared" : "archived" };
  }

  async function listCoachingNotes(filter = {}) {
    const query = knex("coaching_notes as cn")
      .leftJoin("quotes as q", "q.id", "cn.quote_id")
      .leftJoin("users as quoter", "quoter.id", "cn.quoter_id")
      .leftJoin("users as reviser", "reviser.id", "cn.reviser_id")
      .select("cn.*", "q.quote_number as quoteNumber", "quoter.name as quoterName", "reviser.name as reviserName")
      .orderBy("cn.created_at", "desc");
    if (filter.quoterId) query.where("cn.quoter_id", filter.quoterId);
    if (filter.visibility) query.where("cn.visibility", filter.visibility);
    const rows = await query;
    return rows.map((row) => ({
      ...row,
      createdAt: row.created_at ? new Date(Number(row.created_at) * 1000).toISOString() : null,
      sharedAt: row.shared_at ? new Date(Number(row.shared_at) * 1000).toISOString() : null,
    }));
  }

  async function shareCoachingNote(noteId, sharedById) {
    const now = Math.floor(Date.now() / 1000);
    await knex("coaching_notes").where({ id: noteId }).update({ visibility: "shared", shared_at: now, shared_by_id: sharedById });
    const note = await knex("coaching_notes").where({ id: noteId }).first();
    return note;
  }

  async function archiveCoachingNote(noteId) {
    await knex("coaching_notes").where({ id: noteId }).update({ visibility: "archived", shared_at: null, shared_by_id: null });
    return { id: noteId, visibility: "archived" };
  }

  async function listTemplates({ includeInactive = false } = {}) {
    const query = knex("templates as t")
      .leftJoin("template_versions as tv", function joinLatest() {
        this.on("tv.template_id", "t.id").andOn("tv.version", knex("template_versions").max("version").whereRaw("template_id = t.id"));
      })
      .select("t.id", "t.name", "t.active", "tv.id as currentVersionId", "tv.version", "tv.published_at as publishedAt")
      .orderBy("t.name");
    if (!includeInactive) query.where("t.active", true);
    return query;
  }

  async function getTemplateVersion(versionId) {
    const version = await knex("template_versions").where({ id: versionId }).first();
    if (!version) return null;
    const columns = await knex("template_columns").where({ version_id: versionId }).orderBy("position");
    return { ...version, columns };
  }

  async function createTemplate({ name, createdById, fileName, columns }) {
    return knex.transaction(async (trx) => {
      const templateId = randomUUID();
      await trx("templates").insert({ id: templateId, name, active: true, created_by_id: createdById });
      const versionId = randomUUID();
      await trx("template_versions").insert({ id: versionId, template_id: templateId, version: 1, file_name: fileName || null, published_at: Math.floor(Date.now() / 1000) });
      for (let index = 0; index < columns.length; index += 1) {
        const column = columns[index];
        await trx("template_columns").insert({
          id: randomUUID(),
          version_id: versionId,
          position: index + 1,
          header: column.header,
          excel_column: column.excelColumn,
          source: column.source || "blank",
          field_key: column.fieldKey || null,
          formula: column.formula || null,
          internal_only: Boolean(column.internalOnly),
        });
      }
      return { id: templateId, versionId, version: 1 };
    });
  }

  async function createTemplateVersion({ templateId, fileName, columns }) {
    return knex.transaction(async (trx) => {
      const latest = await trx("template_versions").where({ template_id: templateId }).max({ max: "version" }).first();
      const nextVersion = Number(latest?.max || 0) + 1;
      const versionId = randomUUID();
      await trx("template_versions").insert({ id: versionId, template_id: templateId, version: nextVersion, file_name: fileName || null, published_at: Math.floor(Date.now() / 1000) });
      for (let index = 0; index < columns.length; index += 1) {
        const column = columns[index];
        await trx("template_columns").insert({
          id: randomUUID(),
          version_id: versionId,
          position: index + 1,
          header: column.header,
          excel_column: column.excelColumn,
          source: column.source || "blank",
          field_key: column.fieldKey || null,
          formula: column.formula || null,
          internal_only: Boolean(column.internalOnly),
        });
      }
      return { id: templateId, versionId, version: nextVersion };
    });
  }

  async function setTemplateActive(templateId, active) {
    await knex("templates").where({ id: templateId }).update({ active: Boolean(active) });
    return { id: templateId, active: Boolean(active) };
  }

  async function getUserSettings(userId) {
    const rows = await knex("user_settings").where({ user_id: userId }).select("key", "value");
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async function updateUserSettings(userId, values) {
    await knex.transaction(async (trx) => {
      for (const [key, value] of Object.entries(values)) {
        const existing = await trx("user_settings").where({ user_id: userId, key }).first();
        if (existing) await trx("user_settings").where({ user_id: userId, key }).update({ value: String(value) });
        else await trx("user_settings").insert({ user_id: userId, key, value: String(value) });
      }
    });
    return getUserSettings(userId);
  }

  async function globalSearch(query) {
    const term = String(query || "").trim();
    if (!term) return { quotes: [], items: [] };
    const like = `%${term}%`;
    const quotes = await knex("quotes as q")
      .leftJoin("accounts as a", "a.id", "q.account_id")
      .select("q.id as databaseId", "q.quote_number as id", "q.status", "q.quote_type as quoteType", "a.account_number as accountNumber", "a.account_name as accountName", "q.company_name as companyName")
      .where((builder) => builder
        .where("q.quote_number", "like", like)
        .orWhere("a.account_number", "like", like)
        .orWhere("a.account_name", "like", like)
        .orWhere("q.company_name", "like", like))
      .limit(20);
    const items = await knex("line_items as li")
      .join("quote_files as qf", "qf.id", "li.file_id")
      .join("quotes as q", "q.id", "qf.quote_id")
      .select("q.id as databaseId", "q.quote_number as id", "li.description_raw as description", "li.competitor_item_no as itemNumber", "li.manufacturer_part_no as partNumber")
      .where((builder) => builder
        .where("li.competitor_item_no", "like", like)
        .orWhere("li.manufacturer_part_no", "like", like)
        .orWhere("li.description_raw", "like", like))
      .limit(20);
    return { quotes, items };
  }

  async function createRepQuoteRequest({ user, request, files }) {
    if (!Array.isArray(files) || files.length === 0) {
      const error = new Error("Attach at least one supporting document.");
      error.status = 400;
      throw error;
    }

    return knex.transaction(async (trx) => {
      let account = null;
      const accountNumber = String(request.accountNumber || "").trim().toUpperCase();
      if (accountNumber) {
        account = await trx("accounts").where({ account_number: accountNumber }).first();
        if (!account) {
          account = {
            id: randomUUID(),
            account_number: accountNumber,
            account_name: String(request.companyName || "").trim(),
          };
          await trx("accounts").insert(account);
        }
      }

      let ppl = null;
      if (request.pplId) {
        ppl = await trx("ppls").where({ id: request.pplId }).first();
        if (!ppl || !account || ppl.account_id !== account.id) {
          const error = new Error("Choose a PPL that belongs to the selected account.");
          error.status = 400;
          throw error;
        }
      }

      let manager = null;
      if (request.asapApprovedBy) {
        manager = await trx("sales_managers").where({ id: request.asapApprovedBy }).first();
        if (!manager) {
          const error = new Error("Choose a valid approving sales manager.");
          error.status = 400;
          throw error;
        }
        const rep = await trx("rep_sales_managers").where({ rep_id: user.id }).first("sales_manager_id");
        if (rep?.sales_manager_id && rep.sales_manager_id !== manager.id) {
          const error = new Error("Choose your assigned sales manager.");
          error.status = 403;
          throw error;
        }
      }

      const quoteType = request.quoteType === "MDM" ? "MDM" : "Quote";
      const numberPrefix = quoteType === "MDM" ? "MDM" : "Q";
      const numberPattern = new RegExp(`^${numberPrefix}-(\\d{6})$`);
      const existingNumbers = await trx("quotes").where("quote_number", "like", `${numberPrefix}-%`).select("quote_number");
      const maxSequence = existingNumbers.reduce((maximum, row) => {
        const match = row.quote_number.match(numberPattern);
        return match ? Math.max(maximum, Number(match[1])) : maximum;
      }, 0);
      const quoteNumber = `${numberPrefix}-${String(maxSequence + 1).padStart(6, "0")}`;
      const quoteId = randomUUID();
      const now = Math.floor(Date.now() / 1000);
      const asapItems = Array.isArray(request.asapItems) ? request.asapItems.join("\n") : String(request.asapItems || "");
      const quote = {
        id: quoteId,
        quote_number: quoteNumber,
        quote_type: quoteType,
        account_id: account?.id || null,
        submitted_by_rep: user.id,
        submitted_by_id: user.id,
        submitter_role: String(request.submitterRole || "Rep"),
        request_type: request.requestType,
        company_name: String(request.companyName || "").trim() || null,
        customer_needs: String(request.customerNeeds).trim(),
        ship_city: String(request.shipCity || "").trim() || null,
        ship_state: String(request.shipState || "").trim() || null,
        ship_zip: String(request.shipZip || "").trim() || null,
        ppl_id: ppl?.id || null,
        priority: request.priority,
        needed_by: request.neededBy || null,
        asap_reason: request.asapReason || null,
        asap_items: asapItems || null,
        asap_approved_by: manager?.id || null,
        notes: String(request.notes || "").trim() || null,
        team: quoteType === "MDM" ? "MDM" : "Quotes",
        template: request.template || "invoice",
        status: "Submitted",
        assigned_quoter_id: null,
        screened_by_id: null,
        final_reviewer_id: null,
        contract_pricing: false,
        created_at: now,
        updated_at: now,
      };
      await trx("quotes").insert(quote);
      await trx("quote_status_history").insert({
        id: randomUUID(),
        quote_id: quoteId,
        from_status: null,
        to_status: "Submitted",
        changed_by_id: user.id,
        changed_at: now,
        reason: "Rep submitted a new quote request.",
      });

      for (const file of files) {
        await trx("quote_files").insert({
          id: file.id || randomUUID(),
          quote_id: quoteId,
          file_name: file.fileName,
          file_type: file.fileType,
          file_hash: file.fileHash,
          uploaded_by_id: user.id,
          uploaded_at: now,
          invoice_source: null,
          invoice_date: null,
          storage_key: file.storageKey,
        });
      }

      return { id: quoteNumber, databaseId: quoteId, status: quote.status, quoteType, submittedAt: new Date(now * 1000).toISOString() };
    });
  }

  async function reportingData() {
    const [cycleTimes, workload, reviserOutcomes, ocrAccuracy] = await Promise.all([
      knex("v_quote_cycle_times").select("quote_number", "status", "screening_seconds", "waiting_to_assign_seconds", "quoting_seconds", "final_review_seconds", "total_seconds"),
      knex("v_quoter_workload").select("quoter_id", "quoter_name", "quoter_email", "team", "open_quotes"),
      knex("v_reviser_outcomes").select("reviser_id", "reviser_name", "reviser_email", "team", "decisions", "approved_count", "denied_count", "changes_requested_count", "approved_rate_percent", "denied_rate_percent", "changes_requested_rate_percent"),
      knex("v_ocr_accuracy").select("template", "field_name", "extracted_field_count", "edited_field_count", "edited_percent", "unchanged_percent"),
    ]);
    return { cycleTimes, workload, reviserOutcomes, ocrAccuracy };
  }

  async function duplicateExists(accountNumber, fileHash, transaction = knex) {
    if (!accountNumber || !fileHash) return false;
    const match = await transaction("quote_files as files")
      .join("quotes", "quotes.id", "files.quote_id")
      .join("accounts", "accounts.id", "quotes.account_id")
      .where("accounts.account_number", String(accountNumber).toUpperCase())
      .andWhere("files.file_hash", fileHash)
      .first("files.id");
    return Boolean(match);
  }

  async function createFromAnalysis({ user, file, result }) {
    const fileHash = createHash("sha256").update(file.buffer).digest("hex");
    const now = Math.floor(Date.now() / 1000);
    const accountNumber = fieldValue(result.fields.accountNumber).toUpperCase();
    const accountName = fieldValue(result.fields.accountName);
    const quoteId = randomUUID();
    const quoteFileId = randomUUID();
    const duplicate = await knex.transaction(async (trx) => {
      const isDuplicate = await duplicateExists(accountNumber, fileHash, trx);
      result.fields.duplicateWarning = {
        value: isDuplicate ? "Possible duplicate: this account and file were uploaded before." : accountNumber ? "No duplicate found." : "Unable to check: account details are missing.",
        confidence: accountNumber ? 1 : 0.5,
        needsReview: isDuplicate || !accountNumber,
      };

      let account = null;
      if (/^C\d+$/i.test(accountNumber)) {
        account = await trx("accounts").where({ account_number: accountNumber }).first();
        if (!account) {
          account = { id: randomUUID(), account_number: accountNumber, account_name: accountName || "Unknown account" };
          await trx("accounts").insert(account);
        }
      }

      const quoteNumber = fieldValue(result.fields.quoteId) || `Q-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      await trx("quotes").insert({
        id: quoteId,
        quote_number: quoteNumber,
        account_id: account?.id || null,
        submitted_by_rep: user.id,
        team: user.team,
        template: result.template,
        status: "In progress",
        assigned_quoter_id: user.id,
        screened_by_id: null,
        final_reviewer_id: null,
        contract_pricing: fieldValue(result.fields.contractPricing).toLowerCase() === "yes",
        created_at: now,
        updated_at: now,
      });

      await trx("quote_status_history").insert({
        id: randomUUID(),
        quote_id: quoteId,
        from_status: null,
        to_status: "In progress",
        changed_by_id: user.id,
        changed_at: now,
        reason: "Quote created from uploaded source document.",
      });

      const invoiceDate = sqlDate(fieldValue(result.fields.invoiceDate));
      await trx("quote_files").insert({
        id: quoteFileId,
        quote_id: quoteId,
        file_name: String(file.originalname).replace(/[\\/]/g, "_").slice(0, 255),
        file_type: file.mimetype,
        file_hash: fileHash,
        uploaded_by_id: user.id,
        uploaded_at: now,
        invoice_source: fieldValue(result.fields.invoiceSource) || null,
        invoice_date: invoiceDate,
      });

      const headerRows = Object.entries(result.fields).map(([fieldName, field]) => extractedFieldRow({
        quoteFileId,
        fieldGroup: "header",
        fieldName,
        template: result.template,
        field,
        extractedAt: now,
      }));
      const templateFields = fieldCatalog.fieldsForTemplate(result.template);
      const detailRows = templateFields.detailFields.map((definition) => extractedFieldRow({
        quoteFileId,
        fieldGroup: "detail",
        fieldName: definition.key,
        template: result.template,
        field: result.details?.[definition.key],
        extractedAt: now,
      }));
      const lineFieldRows = [];
      for (let index = 0; index < result.lineItems.length; index += 1) {
        const line = result.lineItems[index];
        const row = lineItemRow(line, quoteFileId, index + 1, false);
        await trx("line_items").insert(row);
        for (const definition of templateFields.lineItemFields) {
          lineFieldRows.push(extractedFieldRow({
            quoteFileId,
            lineItemId: row.id,
            fieldGroup: "line",
            fieldName: definition.key,
            template: result.template,
            field: line[definition.key],
            extractedAt: now,
          }));
        }
      }
      await trx("quote_extracted_fields").insert([...headerRows, ...detailRows, ...lineFieldRows]);
      return isDuplicate;
    });

    return { duplicate, databaseQuoteId: quoteId, databaseFileId: quoteFileId, fileHash };
  }

  async function editExtractedField(trx, { quoteFileId, lineItemId = null, fieldGroup, fieldName, template, value, confidence = 0, needsReview = false, userId, editedAt }) {
    let extracted = await trx("quote_extracted_fields")
      .where({ quote_file_id: quoteFileId, line_item_id: lineItemId, field_group: fieldGroup, field_name: fieldName })
      .first();
    const nextValue = fieldValue(value);
    if (!extracted) {
      if (lineItemId) return false;
      extracted = extractedFieldRow({
        quoteFileId,
        lineItemId,
        fieldGroup,
        fieldName,
        template,
        field: { value: nextValue, confidence, needsReview },
        extractedAt: editedAt,
      });
      await trx("quote_extracted_fields").insert(extracted);
      return false;
    }

    const currentValue = fieldValue(extracted.current_value);
    if (currentValue === nextValue) return false;
    await trx("field_edits").insert({
      id: randomUUID(),
      line_item_id: lineItemId,
      quote_file_id: quoteFileId,
      extracted_field_id: extracted.id,
      field_name: fieldName,
      original_value: extracted.original_value ?? currentValue,
      new_value: nextValue,
      edited_by_id: userId,
      edited_at: editedAt,
    });
    await trx("quote_extracted_fields").where({ id: extracted.id }).update({ current_value: nextValue, needs_review: false });
    return true;
  }

  // A Reviser edits a line item's values. Every changed field is written to
  // field_edits with the reason, note, and optional coaching flag, and the
  // line_items row is updated to match.
  async function reviserEditLine({ quoteId, lineItemId, user, changes, reason, reasonNote, coaching, coachingCategory }) {
    if (!String(reason || "").trim() || !String(reasonNote || "").trim()) {
      const error = new Error("A reason and a note are required for every edit.");
      error.status = 400;
      throw error;
    }
    return knex.transaction(async (trx) => {
      const line = await trx("line_items as li")
        .join("quote_files as qf", "qf.id", "li.file_id")
        .select("li.*", "qf.id as quoteFileId", "qf.quote_id")
        .where("li.id", lineItemId)
        .andWhere("qf.quote_id", quoteId)
        .first();
      if (!line) {
        const error = new Error("Line item not found for this quote.");
        error.status = 404;
        throw error;
      }

      const now = Math.floor(Date.now() / 1000);
      const fieldMap = {
        description: "description_raw",
        uom: "uom",
        quantity: "quantity",
        price: "price_per_uom",
      };
      const lineUpdates = {};
      let editedAny = false;

      for (const [fieldName, column] of Object.entries(fieldMap)) {
        if (changes[fieldName] === undefined) continue;
        const nextValue = String(changes[fieldName] ?? "").trim();
        const currentValue = line[column] === null || line[column] === undefined ? "" : String(line[column]);
        if (nextValue === currentValue) continue;

        // Find or create the extracted-field baseline for this line/field.
        let extracted = await trx("quote_extracted_fields")
          .where({ quote_file_id: line.quoteFileId, line_item_id: lineItemId, field_group: "line", field_name: fieldName })
          .first();
        if (!extracted) {
          extracted = extractedFieldRow({
            quoteFileId: line.quoteFileId,
            lineItemId,
            fieldGroup: "line",
            fieldName,
            template: "invoice",
            field: { value: currentValue, confidence: 0, needsReview: false },
            extractedAt: now,
          });
          await trx("quote_extracted_fields").insert(extracted);
        }

        await trx("field_edits").insert({
          id: randomUUID(),
          line_item_id: lineItemId,
          quote_file_id: line.quoteFileId,
          extracted_field_id: extracted.id,
          field_name: fieldName,
          original_value: extracted.original_value ?? currentValue,
          new_value: nextValue,
          edited_by_id: user.id,
          edited_at: now,
          reason: String(reason).trim(),
          reason_note: String(reasonNote).trim(),
          coaching_opportunity: Boolean(coaching),
          coaching_category: coaching ? String(coachingCategory || "other") : null,
        });
        await trx("quote_extracted_fields").where({ id: extracted.id }).update({ current_value: nextValue, needs_review: false });

        lineUpdates[column] = ["quantity", "price"].includes(fieldName) ? numericValue(nextValue) : nextValue || null;
        editedAny = true;
      }

      if (editedAny) {
        lineUpdates.edited_by_quoter = false;
        await trx("line_items").where({ id: lineItemId }).update(lineUpdates);
      }

      let coachingNote = null;
      if (coaching) {
        const quote = await trx("quotes").where({ id: quoteId }).first();
        const settingRows = await trx("settings").select("key", "value");
        const settings = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));
        const shareImmediately = String(settings.coaching_visibility || "manager") === "immediate";
        const noteId = randomUUID();
        await trx("coaching_notes").insert({
          id: noteId,
          quote_id: quoteId,
          line_item_id: lineItemId,
          quoter_id: quote?.assigned_quoter_id || null,
          reviser_id: user.id,
          category: String(coachingCategory || "other"),
          note: `${String(reason).trim()}: ${String(reasonNote).trim()}`,
          created_at: now,
          visibility: shareImmediately ? "shared" : "archived",
          shared_at: shareImmediately ? now : null,
        });
        coachingNote = { id: noteId, visibility: shareImmediately ? "shared" : "archived" };
      }

      return { lineItemId, edited: editedAny, coaching: coachingNote };
    });
  }

  async function applyQuoteStatus(trx, quote, nextStatus, changedById, reason, extraUpdates = {}) {
    const now = Math.floor(Date.now() / 1000);
    const updates = { ...extraUpdates, updated_at: now };
    if (quote.status !== nextStatus) {
      updates.status = nextStatus;
      await trx("quote_status_history").insert({
        id: randomUUID(),
        quote_id: quote.id,
        from_status: quote.status,
        to_status: nextStatus,
        changed_by_id: changedById,
        changed_at: now,
        reason: reason || null,
      });
    }
    await trx("quotes").where({ id: quote.id }).update(updates);
    return { ...quote, ...updates };
  }

  async function submitReview({ user, review }) {
    if (!review.databaseQuoteId || !review.databaseFileId) {
      const error = new Error("This quote draft is missing its database reference. Analyze the source document again.");
      error.status = 400;
      throw error;
    }

    return knex.transaction(async (trx) => {
      const quote = await trx("quotes").where({ id: review.databaseQuoteId }).first();
      if (!quote || quote.assigned_quoter_id !== user.id) {
        const error = new Error("This quote is not assigned to your account.");
        error.status = 404;
        throw error;
      }
      const quoteFile = await trx("quote_files").where({ id: review.databaseFileId, quote_id: quote.id }).first();
      if (!quoteFile) {
        const error = new Error("The source file record could not be found.");
        error.status = 404;
        throw error;
      }

      const now = Math.floor(Date.now() / 1000);
      const fields = review.fields || {};
      const details = review.details || {};
      const lineItems = Array.isArray(review.lineItems) ? review.lineItems : [];
      const template = fieldCatalog.fieldsForTemplate(review.template).template.key;
      let editedAny = false;

      for (const [fieldName, field] of Object.entries(fields)) {
        editedAny = await editExtractedField(trx, {
          quoteFileId: quoteFile.id,
          fieldGroup: "header",
          fieldName,
          template,
          value: field,
          confidence: scoreValue(field),
          needsReview: field?.needsReview,
          userId: user.id,
          editedAt: now,
        }) || editedAny;
      }
      for (const [fieldName, field] of Object.entries(details)) {
        editedAny = await editExtractedField(trx, {
          quoteFileId: quoteFile.id,
          fieldGroup: "detail",
          fieldName,
          template,
          value: field,
          confidence: scoreValue(field),
          needsReview: field?.needsReview,
          userId: user.id,
          editedAt: now,
        }) || editedAny;
      }

      for (let index = 0; index < lineItems.length; index += 1) {
        const lineNumber = index + 1;
        const line = lineItems[index];
        let persisted = await trx("line_items").where({ file_id: quoteFile.id, line_number: lineNumber }).first();
        if (!persisted) {
          persisted = lineItemRow(line, quoteFile.id, lineNumber, true);
          await trx("line_items").insert(persisted);
          continue;
        }

        let lineEdited = false;
        for (const [fieldName, field] of Object.entries(line)) {
          const didEdit = await editExtractedField(trx, {
            quoteFileId: quoteFile.id,
            lineItemId: persisted.id,
            fieldGroup: "line",
            fieldName,
            template,
            value: field,
            confidence: scoreValue(field),
            needsReview: field?.needsReview,
            userId: user.id,
            editedAt: now,
          });
          if (didEdit) {
            lineEdited = true;
            field.needsReview = false;
          }
          editedAny = didEdit || editedAny;
        }
        await trx("line_items").where({ id: persisted.id }).update({
          ...lineItemRow(line, quoteFile.id, lineNumber, lineEdited || persisted.edited_by_quoter),
          id: persisted.id,
        });
      }

      const accountNumber = fieldValue(fields.accountNumber).toUpperCase();
      const accountName = fieldValue(fields.accountName);
      let accountId = quote.account_id;
      if (/^C\d+$/i.test(accountNumber)) {
        let account = await trx("accounts").where({ account_number: accountNumber }).first();
        if (!account) {
          account = { id: randomUUID(), account_number: accountNumber, account_name: accountName || "Unknown account" };
          await trx("accounts").insert(account);
        } else if (accountName) {
          await trx("accounts").where({ id: account.id }).update({ account_name: accountName });
        }
        accountId = account.id;
      }

      const quoteNumber = fieldValue(fields.quoteId) || quote.quote_number;
      const invoiceDate = sqlDate(fieldValue(fields.invoiceDate));
      await trx("quote_files").where({ id: quoteFile.id }).update({
        invoice_source: fieldValue(fields.invoiceSource) || null,
        invoice_date: invoiceDate,
      });
      const toStatus = quote.screened_by_id ? "In final review" : "Submitted";
      const updatedQuote = await applyQuoteStatus(trx, quote, toStatus, user.id, "Quoter submitted edited extracted values for review.", {
        account_id: accountId,
        quote_number: quoteNumber,
        template,
        contract_pricing: fieldValue(fields.contractPricing).toLowerCase() === "yes",
      });
      return { id: updatedQuote.quote_number, status: updatedQuote.status, submittedAt: new Date(now * 1000).toISOString(), edited: editedAny };
    });
  }

  async function assignQuote({ quoteId, quoterId, changedBy }) {
    return knex.transaction(async (trx) => {
      const quote = await trx("quotes").where({ id: quoteId }).first();
      if (!quote) {
        const error = new Error("Quote not found.");
        error.status = 404;
        throw error;
      }
      const quoter = await trx("users").where({ id: quoterId, role: "Quoter", active: true }).first();
      if (!quoter) {
        const error = new Error("Choose an active Quoter.");
        error.status = 400;
        throw error;
      }
      const currentAssignee = quote.assigned_quoter_id
        ? await trx("users").where({ id: quote.assigned_quoter_id }).first()
        : null;
      // Reassigning work left behind by a deactivated user keeps the quote's
      // current status instead of moving it back to Assigned.
      const reassignment = Boolean(currentAssignee) && !currentAssignee.active
        && !["Approved", "Sent to customer", "Declined"].includes(quote.status);
      if (!["Ready to assign", "Assigned"].includes(quote.status) && !reassignment) {
        const error = new Error("Only ready or already assigned quotes can be assigned.");
        error.status = 409;
        throw error;
      }
      return applyQuoteStatus(
        trx,
        quote,
        reassignment ? quote.status : "Assigned",
        changedBy.id,
        reassignment ? "Manager reassigned quote from a deactivated user." : "Manager assigned quote to a Quoter.",
        {
          assigned_quoter_id: quoter.id,
          team: quoter.team,
        },
      );
    });
  }

  // Who may move a quote into each status, and from which statuses.
  const STATUS_RULES = {
    Qualifying: { roles: ["Qualifier"], from: ["Submitted", "Needs info"] },
    "Needs info": { roles: ["Qualifier"], from: ["Qualifying"], reason: true },
    "Ready to assign": { roles: ["Qualifier"], from: ["Qualifying", "Needs info"] },
    Declined: { roles: ["Qualifier", "Manager"], from: ["Submitted", "Qualifying", "Needs info"], reason: true },
    Assigned: { roles: ["Manager"], from: ["Ready to assign", "Assigned"] },
    "In progress": { roles: ["Quoter"], from: ["Assigned", "Returned to quoter"] },
    "In revision": { roles: ["Quoter"], from: ["In progress"] },
    "Returned to quoter": { roles: ["Reviser"], from: ["In revision"], reason: true },
    "Awaiting approval": { roles: ["Reviser"], from: ["In revision", "Returned to reviser"] },
    "Returned to reviser": { permission: "approve", from: ["Awaiting approval"], reason: true },
    Approved: { permission: "approve", from: ["Awaiting approval"] },
    "Sent to customer": { roles: ["Rep"], from: ["Approved"] },
  };
  const ALL_STATUSES = ["Submitted", "Qualifying", "Needs info", "Ready to assign", "Assigned", "In progress", "In revision", "Awaiting approval", "Approved", "Sent to customer", "Declined", "Returned to quoter", "Returned to reviser"];

  async function changeStatus({ quoteId, nextStatus, user, reason }) {
    return knex.transaction(async (trx) => {
      const quote = await trx("quotes").where({ id: quoteId }).first();
      if (!quote) {
        const error = new Error("Quote not found.");
        error.status = 404;
        throw error;
      }
      if (!ALL_STATUSES.includes(nextStatus)) {
        const error = new Error("That status is not recognized.");
        error.status = 400;
        throw error;
      }

      // Managers may override any status, but must give a reason.
      const rule = STATUS_RULES[nextStatus];
      const ruleAllows = (ruleToCheck, userToCheck) => ruleToCheck.permission === "approve"
        ? userCanApprove(userToCheck)
        : ruleToCheck.roles.includes(userToCheck.role);
      const isManagerOverride = user.role === "Manager" && (!rule || !ruleAllows(rule, user) || !rule.from.includes(quote.status));
      if (user.role === "Manager" && isManagerOverride && !String(reason || "").trim()) {
        const error = new Error("A reason is required to override a status.");
        error.status = 400;
        throw error;
      }

      if (rule && !isManagerOverride) {
        if (!ruleAllows(rule, user)) {
          const error = new Error(rule.permission === "approve"
            ? `You need the Can approve permission to move a quote to ${nextStatus}.`
            : `Only ${rule.roles.join(" or ")} can move a quote to ${nextStatus}.`);
          error.status = 403;
          throw error;
        }
        if (!rule.from.includes(quote.status)) {
          const error = new Error(`A quote in ${quote.status} cannot move to ${nextStatus}.`);
          error.status = 409;
          throw error;
        }
        if (rule.reason && !String(reason || "").trim()) {
          const error = new Error(`A reason is required to move a quote to ${nextStatus}.`);
          error.status = 400;
          throw error;
        }
      }

      // Separation of duties: the person who revised a quote cannot also approve it.
      if (["Approved", "Returned to reviser"].includes(nextStatus)
        && quote.final_reviewer_id
        && quote.final_reviewer_id === user.id) {
        const error = new Error("The person who revised this quote cannot also approve it.");
        error.status = 403;
        throw error;
      }

      const updates = {};
      if (user.role === "Qualifier" && ["Qualifying", "Ready to assign", "Declined", "Needs info"].includes(nextStatus)) updates.screened_by_id = user.id;
      if (user.role === "Reviser" && ["Awaiting approval", "Returned to quoter"].includes(nextStatus)) updates.final_reviewer_id = user.id;
      if (userCanApprove(user) && ["Approved", "Returned to reviser"].includes(nextStatus)) updates.final_reviewer_id = user.id;
      return applyQuoteStatus(trx, quote, nextStatus, user.id, reason, updates);
    });
  }

  return {
    users: {
      findActiveByEmail: findUserByEmail,
      listActiveQuoters,
      listRequestOptions,
      createPpl,
      listWithRoles: listUsersWithRoles,
      listAllWithRoles,
      getDetail: getUserDetail,
      createUser,
      updateUserRoles,
      setUserActive,
      recordSignIn,
      applyManagerEmails,
      allRoles: ALL_ROLES,
      teams: USER_TEAMS,
    },
    settings: { get: getSettings, update: updateSettings },
    quotes: {
      listForWorkspace: listWorkspaceQuotes,
      listRequestsForRep,
      listNeedsReassignment,
      getDetail: getQuoteDetail,
      addFile: addQuoteFile,
      replaceFile: replaceQuoteFile,
      removeFile: removeQuoteFile,
      reportingData,
      duplicateExists,
      createFromAnalysis,
      createRepRequest: createRepQuoteRequest,
      submitReview,
      assign: assignQuote,
      changeStatus,
      savePricingReport,
      getPricingReports,
      getLinePricingForQuote,
      upsertLinePricing,
      addComment,
      listComments,
      notify,
      listNotifications,
      markNotificationRead,
      addCoachingNote,
      listCoachingNotes,
      shareCoachingNote,
      archiveCoachingNote,
      listTemplates,
      getTemplateVersion,
      createTemplate,
      createTemplateVersion,
      setTemplateActive,
      getUserSettings,
      updateUserSettings,
      globalSearch,
      reviserEditLine,
    },
  };
}

module.exports = createRepositories;
