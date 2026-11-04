exports.config = { transaction: false };

exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable("pricing_reports"))) {
    await knex.schema.createTable("pricing_reports", (table) => {
      table.string("id", 36).primary();
      table.string("quote_id", 36).notNullable();
      table.string("report_type", 32).notNullable();
      table.string("file_name", 255).notNullable();
      table.string("uploaded_by_id", 36).notNullable();
      table.bigInteger("uploaded_at").notNullable();
      table.text("row_data").nullable();
      table.foreign("quote_id").references("id").inTable("quotes").onDelete("CASCADE");
      table.foreign("uploaded_by_id").references("id").inTable("users").onDelete("RESTRICT");
      table.index(["quote_id", "report_type"], "pricing_reports_quote_type_idx");
    });
  }

  if (!(await knex.schema.hasTable("line_pricing"))) {
    await knex.schema.createTable("line_pricing", (table) => {
      table.string("id", 36).primary();
      table.string("line_item_id", 36).notNullable();
      table.decimal("account_price", 19, 4).nullable();
      table.decimal("financial_cost", 19, 4).nullable();
      table.string("cost_source", 32).nullable();
      table.decimal("current_margin", 8, 4).nullable();
      table.decimal("target_margin", 8, 4).nullable();
      table.decimal("price_at_target", 19, 4).nullable();
      table.string("deviation_needed", 8).nullable();
      table.decimal("ctlge_price", 19, 4).nullable();
      table.decimal("final_price", 19, 4).nullable();
      table.boolean("unavailable").notNullable().defaultTo(false);
      table.text("comment").nullable();
      table.foreign("line_item_id").references("id").inTable("line_items").onDelete("CASCADE");
      table.unique(["line_item_id"], "line_pricing_line_unique");
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("line_pricing");
  await knex.schema.dropTableIfExists("pricing_reports");
};
