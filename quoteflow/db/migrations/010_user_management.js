exports.config = { transaction: false };

exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn("users", "last_sign_in_at"))) {
    await knex.schema.alterTable("users", (table) => {
      table.bigInteger("last_sign_in_at").nullable();
    });
  }

  if (!(await knex.schema.hasTable("user_audit"))) {
    await knex.schema.createTable("user_audit", (table) => {
      table.string("id", 36).primary();
      table.string("user_id", 36).notNullable();
      table.string("changed_by_id", 36).nullable();
      table.string("field", 60).notNullable();
      table.text("old_value").nullable();
      table.text("new_value").nullable();
      table.bigInteger("changed_at").notNullable();
      table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
      table.foreign("changed_by_id").references("id").inTable("users").onDelete("SET NULL");
      table.index(["user_id", "changed_at"], "user_audit_user_changed_idx");
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("user_audit");
  if (await knex.schema.hasColumn("users", "last_sign_in_at")) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("last_sign_in_at");
    });
  }
};
