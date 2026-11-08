exports.config = { transaction: false };

// Cross-reference runs: each run is one pricing exercise (an account, a quote, a what-if).
// Its four uploaded files are kept with it, so anyone can see what the numbers were based on.
exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable("xref_runs"))) {
    await knex.schema.createTable("xref_runs", (table) => {
      table.string("id", 36).primary();
      table.string("name", 160).notNullable();
      table.string("cost_column", 80);            // costing report column used for cost; "" = don't use costing
      table.text("targets_json");                 // target margin per line, entered by the person pricing
      table.string("created_by_id", 36);
      table.string("created_by_name", 160);
      table.integer("created_at").notNullable();
      table.integer("updated_at").notNullable();
    });
  }
  if (!(await knex.schema.hasTable("xref_files"))) {
    await knex.schema.createTable("xref_files", (table) => {
      table.increments("id").primary();
      table.string("run_id", 36).notNullable().references("id").inTable("xref_runs").onDelete("CASCADE");
      table.string("kind", 16).notNullable();     // items, account, house, costing
      table.string("file_name", 255);
      table.string("sheet_name", 120);
      table.integer("row_count");
      table.text("headers_json");
      table.text("rows_json");                    // the rows as uploaded
      table.string("uploaded_by_id", 36);
      table.integer("uploaded_at").notNullable();
      table.unique(["run_id", "kind"], { indexName: "xref_files_run_kind_unique" });
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("xref_files");
  await knex.schema.dropTableIfExists("xref_runs");
};
