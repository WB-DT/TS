exports.up = async function up(knex) {
  await knex.schema.createTable("settings", (table) => {
    table.string("key", 100).primary();
    table.text("value").notNullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("settings");
};
