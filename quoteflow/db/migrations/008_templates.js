exports.config = { transaction: false };

exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable("templates"))) {
    await knex.schema.createTable("templates", (table) => {
      table.string("id", 36).primary();
      table.string("name", 200).notNullable();
      table.boolean("active").notNullable().defaultTo(true);
      table.string("created_by_id", 36).notNullable();
      table.foreign("created_by_id").references("id").inTable("users").onDelete("RESTRICT");
    });
  }

  if (!(await knex.schema.hasTable("template_versions"))) {
    await knex.schema.createTable("template_versions", (table) => {
      table.string("id", 36).primary();
      table.string("template_id", 36).notNullable();
      table.integer("version").notNullable();
      table.string("file_name", 255).nullable();
      table.bigInteger("published_at").nullable();
      table.foreign("template_id").references("id").inTable("templates").onDelete("CASCADE");
      table.unique(["template_id", "version"], "template_versions_unique");
    });
  }

  if (!(await knex.schema.hasTable("template_columns"))) {
    await knex.schema.createTable("template_columns", (table) => {
      table.string("id", 36).primary();
      table.string("version_id", 36).notNullable();
      table.integer("position").notNullable();
      table.string("header", 255).notNullable();
      table.string("excel_column", 8).notNullable();
      table.string("source", 24).notNullable().defaultTo("blank");
      table.string("field_key", 100).nullable();
      table.text("formula").nullable();
      table.boolean("internal_only").notNullable().defaultTo(false);
      table.foreign("version_id").references("id").inTable("template_versions").onDelete("CASCADE");
      table.index(["version_id", "position"], "template_columns_version_idx");
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("template_columns");
  await knex.schema.dropTableIfExists("template_versions");
  await knex.schema.dropTableIfExists("templates");
};
