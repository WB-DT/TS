exports.config = { transaction: false };

exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable("user_settings"))) {
    await knex.schema.createTable("user_settings", (table) => {
      table.string("user_id", 36).notNullable();
      table.string("key", 100).notNullable();
      table.text("value").notNullable();
      table.primary(["user_id", "key"], "user_settings_pk");
      table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("user_settings");
};
