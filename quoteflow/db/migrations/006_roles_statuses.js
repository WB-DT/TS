exports.config = { transaction: false };

async function dropReportingViews(knex) {
  const sqlServer = knex.client.config.client === "mssql";
  for (const viewName of ["v_quote_cycle_times", "v_quoter_workload", "v_reviser_outcomes", "v_ocr_accuracy"]) {
    if (sqlServer) await knex.raw(`IF OBJECT_ID('${viewName}', 'V') IS NOT NULL DROP VIEW ${viewName}`);
    else await knex.raw(`DROP VIEW IF EXISTS ${viewName}`);
  }
}

// Maps each legacy status onto the new workflow so existing rows keep a
// sensible place in the revised pipeline.
const STATUS_MAP = {
  "Submitted": "Submitted",
  "In screening": "Qualifying",
  "Ready to assign": "Ready to assign",
  "Assigned": "Assigned",
  "In progress": "In progress",
  "In final review": "In revision",
  "Approved": "Approved",
  "Denied": "Declined",
  "Changes requested": "Returned to quoter",
  "Exported": "Sent to customer",
};

exports.up = async function up(knex) {
  await dropReportingViews(knex);

  if (!(await knex.schema.hasTable("user_roles"))) {
    await knex.schema.createTable("user_roles", (table) => {
      table.string("user_id", 36).notNullable();
      table.string("role", 24).notNullable();
      table.primary(["user_id", "role"], "user_roles_pk");
      table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    });
  }

  // Backfill user_roles from the single users.role column.
  const allUsers = await knex("users").select("id", "role");
  for (const user of allUsers) {
    const existing = await knex("user_roles").where({ user_id: user.id, role: user.role }).first();
    if (!existing) await knex("user_roles").insert({ user_id: user.id, role: user.role });
  }

  // Remap quote statuses and history onto the new workflow names.
  for (const [oldStatus, newStatus] of Object.entries(STATUS_MAP)) {
    if (oldStatus === newStatus) continue;
    await knex("quotes").where({ status: oldStatus }).update({ status: newStatus });
    await knex("quote_status_history").where({ from_status: oldStatus }).update({ from_status: newStatus });
    await knex("quote_status_history").where({ to_status: oldStatus }).update({ to_status: newStatus });
  }
};

exports.down = async function down(knex) {
  await dropReportingViews(knex);
  const reverse = Object.fromEntries(Object.entries(STATUS_MAP).map(([oldStatus, newStatus]) => [newStatus, oldStatus]));
  for (const [newStatus, oldStatus] of Object.entries(reverse)) {
    if (oldStatus === newStatus) continue;
    await knex("quotes").where({ status: newStatus }).update({ status: oldStatus });
    await knex("quote_status_history").where({ from_status: newStatus }).update({ from_status: oldStatus });
    await knex("quote_status_history").where({ to_status: newStatus }).update({ to_status: oldStatus });
  }
  await knex.schema.dropTableIfExists("user_roles");
};
