exports.config = { transaction: false };

// The locked-in price list: one row per account + item + unit of measure + locked-in date.
// Filled from CSV files for now; later, QuoteFlow adds rows when a quote is approved.
exports.up = async function up(knex) {
  if (await knex.schema.hasTable("locked_prices")) return;
  await knex.schema.createTable("locked_prices", (table) => {
    table.increments("id").primary();
    table.string("q_number", 48);
    table.string("account_number", 40).notNullable();
    table.string("company_name", 200);
    table.string("ppl", 40);
    table.string("item_number", 60).notNullable();
    table.string("item_description", 500);
    table.string("uom", 12).notNullable();
    table.decimal("sell_price", 12, 4).notNullable();
    table.decimal("cost", 12, 4);
    table.decimal("gp_percent", 7, 4);
    table.string("locked_in_date", 10).notNullable(); // YYYY-MM-DD
    table.string("approved_by", 160);
    table.string("source", 20).notNullable().defaultTo("csv"); // csv or quote
    table.string("source_file", 255);
    table.string("imported_by_id", 36);
    table.integer("imported_at").notNullable();
    table.unique(["account_number", "item_number", "uom", "locked_in_date"], { indexName: "locked_prices_row_unique" });
    table.index(["account_number"], "locked_prices_account_idx");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("locked_prices");
};
