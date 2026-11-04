exports.config = { transaction: false };

const reportingViewNames = [
  "v_quote_cycle_times",
  "v_quoter_workload",
  "v_reviser_outcomes",
  "v_ocr_accuracy",
];

async function dropReportingViews(knex) {
  const sqlServer = knex.client.config.client === "mssql";
  for (const viewName of reportingViewNames) {
    if (sqlServer) await knex.raw(`IF OBJECT_ID('${viewName}', 'V') IS NOT NULL DROP VIEW ${viewName}`);
    else await knex.raw(`DROP VIEW IF EXISTS ${viewName}`);
  }
}

exports.up = async function up(knex) {
  const sqlite = knex.client.config.client === "better-sqlite3";
  if (sqlite) await knex.raw("PRAGMA foreign_keys = OFF");
  await dropReportingViews(knex);

  if (!(await knex.schema.hasTable("sales_managers"))) {
    await knex.schema.createTable("sales_managers", (table) => {
      table.string("id", 36).primary();
      table.string("name", 160).notNullable();
    });
  }

  if (!(await knex.schema.hasTable("ppls"))) {
    await knex.schema.createTable("ppls", (table) => {
      table.string("id", 36).primary();
      table.string("account_id", 36).notNullable();
      table.string("name", 160).notNullable();
      table.foreign("account_id").references("id").inTable("accounts").onDelete("CASCADE");
      table.unique(["account_id", "name"], "ppls_account_name_unique");
    });
  }

  if (!(await knex.schema.hasTable("rep_sales_managers"))) {
    await knex.schema.createTable("rep_sales_managers", (table) => {
      table.string("rep_id", 36).primary();
      table.string("sales_manager_id", 36).notNullable();
      table.foreign("rep_id").references("id").inTable("users").onDelete("CASCADE");
      table.foreign("sales_manager_id").references("id").inTable("sales_managers").onDelete("RESTRICT");
    });
  }

  const quoteColumns = [
    ["submitted_by_id", (table) => { table.string("submitted_by_id", 36).nullable(); table.foreign("submitted_by_id").references("id").inTable("users").onDelete("RESTRICT"); }],
    ["submitter_role", (table) => table.string("submitter_role", 24).notNullable().defaultTo("Quoter")],
    ["request_type", (table) => table.string("request_type", 32).notNullable().defaultTo("Existing customer")],
    ["company_name", (table) => table.string("company_name", 200).nullable()],
    ["customer_needs", (table) => table.text("customer_needs").nullable()],
    ["ship_city", (table) => table.string("ship_city", 120).nullable()],
    ["ship_state", (table) => table.string("ship_state", 32).nullable()],
    ["ship_zip", (table) => table.string("ship_zip", 20).nullable()],
    ["ppl_id", (table) => { table.string("ppl_id", 36).nullable(); table.foreign("ppl_id").references("id").inTable("ppls").onDelete("SET NULL"); }],
    ["priority", (table) => table.string("priority", 24).notNullable().defaultTo("Standard")],
    ["needed_by", (table) => table.date("needed_by").nullable()],
    ["asap_reason", (table) => table.string("asap_reason", 100).nullable()],
    ["asap_items", (table) => table.text("asap_items").nullable()],
    ["asap_approved_by", (table) => { table.string("asap_approved_by", 36).nullable(); table.foreign("asap_approved_by").references("id").inTable("sales_managers").onDelete("SET NULL"); }],
    ["notes", (table) => table.text("notes").nullable()],
  ];
  const missingQuoteColumns = [];
  for (const [columnName, addColumn] of quoteColumns) {
    if (!(await knex.schema.hasColumn("quotes", columnName))) missingQuoteColumns.push(addColumn);
  }
  if (missingQuoteColumns.length) {
    await knex.schema.alterTable("quotes", (table) => {
      for (const addColumn of missingQuoteColumns) addColumn(table);
      if (missingQuoteColumns.length === quoteColumns.length) table.index(["submitted_by_id", "created_at"], "quotes_submitter_created_idx");
    });
  }

  if (!(await knex.schema.hasColumn("quote_files", "storage_key"))) {
    await knex.schema.alterTable("quote_files", (table) => table.string("storage_key", 500).nullable());
  }
  for (const columnName of ["tax", "shipping", "fees"]) {
    if (!(await knex.schema.hasColumn("line_items", columnName))) {
      await knex.schema.alterTable("line_items", (table) => table.decimal(columnName, 19, 4).nullable());
    }
  }

  const existingQuotes = await knex("quotes").select("id", "submitted_by_rep", "account_id", "company_name");
  for (const quote of existingQuotes) {
    const submitter = await knex("users").where({ id: quote.submitted_by_rep }).first("role");
    const account = quote.account_id ? await knex("accounts").where({ id: quote.account_id }).first("account_name") : null;
    await knex("quotes").where({ id: quote.id }).update({
      submitted_by_id: quote.submitted_by_rep,
      submitter_role: submitter?.role || "Quoter",
      company_name: quote.company_name || account?.account_name || null,
    });
  }
  if (sqlite) await knex.raw("PRAGMA foreign_keys = ON");
};

exports.down = async function down(knex) {
  const sqlite = knex.client.config.client === "better-sqlite3";
  if (sqlite) await knex.raw("PRAGMA foreign_keys = OFF");
  await dropReportingViews(knex);
  await knex.schema.alterTable("quote_files", (table) => {
    table.dropColumn("storage_key");
  });
  await knex.schema.alterTable("line_items", (table) => {
    table.dropColumn("tax");
    table.dropColumn("shipping");
    table.dropColumn("fees");
  });
  await knex.schema.alterTable("quotes", (table) => {
    table.dropForeign(["submitted_by_id"]);
    table.dropForeign(["ppl_id"]);
    table.dropForeign(["asap_approved_by"]);
    table.dropIndex(["submitted_by_id", "created_at"], "quotes_submitter_created_idx");
    table.dropColumn("submitted_by_id");
    table.dropColumn("submitter_role");
    table.dropColumn("request_type");
    table.dropColumn("company_name");
    table.dropColumn("customer_needs");
    table.dropColumn("ship_city");
    table.dropColumn("ship_state");
    table.dropColumn("ship_zip");
    table.dropColumn("ppl_id");
    table.dropColumn("priority");
    table.dropColumn("needed_by");
    table.dropColumn("asap_reason");
    table.dropColumn("asap_items");
    table.dropColumn("asap_approved_by");
    table.dropColumn("notes");
  });
  await knex.schema.alterTable("users", (table) => {
    table.dropForeign(["sales_manager_id"]);
    table.dropColumn("sales_manager_id");
  });
  await knex.schema.dropTableIfExists("rep_sales_managers");
  await knex.schema.dropTableIfExists("ppls");
  await knex.schema.dropTableIfExists("sales_managers");
  if (sqlite) await knex.raw("PRAGMA foreign_keys = ON");
};
