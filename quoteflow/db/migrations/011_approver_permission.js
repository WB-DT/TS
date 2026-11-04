exports.config = { transaction: false };

// Turns the standalone Approver role into the "Can approve" permission.
// Users holding the Approver role keep the ability via users.can_approve.
const ROLE_ORDER = ["Manager", "Qualifier", "Quoter", "Reviser", "Rep"];

exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn("users", "can_approve"))) {
    await knex.schema.alterTable("users", (table) => {
      table.boolean("can_approve").notNullable().defaultTo(false);
    });
  }

  const approverRows = await knex("user_roles").where({ role: "Approver" }).select("user_id");
  for (const { user_id: userId } of approverRows) {
    await knex("users").where({ id: userId }).update({ can_approve: true });
  }
  await knex("user_roles").where({ role: "Approver" }).delete();

  const stranded = await knex("users").where({ role: "Approver" }).select("id");
  for (const { id } of stranded) {
    const remaining = await knex("user_roles").where({ user_id: id }).select("role");
    const roles = remaining.map((row) => row.role);
    const primary = ROLE_ORDER.find((role) => roles.includes(role)) || "Reviser";
    await knex("users").where({ id }).update({ role: primary });
  }
};

exports.down = async function down(knex) {
  if (await knex.schema.hasColumn("users", "can_approve")) {
    const permitted = await knex("users").where({ can_approve: true }).select("id");
    for (const { id } of permitted) {
      const existing = await knex("user_roles").where({ user_id: id, role: "Approver" }).first();
      if (!existing) await knex("user_roles").insert({ user_id: id, role: "Approver" });
    }
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("can_approve");
    });
  }
};
