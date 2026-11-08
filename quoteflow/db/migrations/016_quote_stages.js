exports.config = { transaction: false };

// The stage-by-stage quote: its lines, its three pricing files, the remembered item matches,
// and a flag so files are archived instead of deleted.
exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn("quote_files", "archived_at"))) {
    await knex.schema.alterTable("quote_files", (table) => {
      table.integer("archived_at");          // set instead of deleting; the file stays on disk
      table.string("archived_by_id", 36);
    });
  }
  if (!(await knex.schema.hasTable("qs_quotes"))) {
    await knex.schema.createTable("qs_quotes", (table) => {
      table.string("quote_id", 36).primary().references("id").inTable("quotes").onDelete("CASCADE");
      table.integer("stage").notNullable().defaultTo(1);
      table.string("cost_column", 80);      // costing report column used for cost; "" = don't use costing
      table.text("submit_note");
      table.integer("updated_at").notNullable();
    });
  }
  if (!(await knex.schema.hasTable("qs_lines"))) {
    await knex.schema.createTable("qs_lines", (table) => {
      table.string("id", 36).primary();
      table.string("quote_id", 36).notNullable().references("id").inTable("quotes").onDelete("CASCADE");
      table.integer("position").notNullable();
      table.string("file_id", 36);           // the file it was read from (blank if typed in)
      table.text("source_text");             // the line exactly as OCR read it
      table.string("their_item", 120);
      table.text("description");
      table.decimal("qty", 18, 4);
      table.string("their_uom", 24);
      table.decimal("their_price", 19, 4);
      table.decimal("their_extended", 19, 4);
      table.boolean("confirmed").notNullable().defaultTo(false);
      table.string("our_item", 120);
      table.string("our_uom", 24);
      table.string("line_status", 40);       // Need more info, Furniture, Tech, Custom print, Exception, We don't carry
      table.decimal("sell_price", 19, 4);
      table.decimal("target_margin", 7, 4);
      table.text("tags_json");               // ["Combo pack", "Blind", ...]
      table.text("comment");                 // internal, for the reviser
      table.string("customer_note", 160);
      table.string("updated_by_id", 36);
      table.integer("updated_at").notNullable();
      table.index(["quote_id", "position"], "qs_lines_quote_idx");
    });
  }
  if (!(await knex.schema.hasTable("qs_pricing_files"))) {
    await knex.schema.createTable("qs_pricing_files", (table) => {
      table.increments("id").primary();
      table.string("quote_id", 36).notNullable().references("id").inTable("quotes").onDelete("CASCADE");
      table.string("kind", 16).notNullable(); // account, house, costing
      table.string("file_name", 255);
      table.integer("row_count");
      table.text("headers_json");
      table.text("rows_json");
      table.string("uploaded_by_id", 36);
      table.integer("uploaded_at").notNullable();
      table.unique(["quote_id", "kind"], { indexName: "qs_pricing_files_unique" });
    });
  }
  if (!(await knex.schema.hasTable("item_matches"))) {
    await knex.schema.createTable("item_matches", (table) => {
      table.increments("id").primary();
      table.string("their_item", 120).notNullable();
      table.string("their_uom", 24).notNullable().defaultTo("");
      table.string("our_item", 120).notNullable();
      table.string("our_uom", 24);
      table.integer("times_used").notNullable().defaultTo(1);
      table.string("last_used_by", 160);
      table.integer("last_used_at").notNullable();
      table.unique(["their_item", "their_uom"], { indexName: "item_matches_unique" });
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("item_matches");
  await knex.schema.dropTableIfExists("qs_pricing_files");
  await knex.schema.dropTableIfExists("qs_lines");
  await knex.schema.dropTableIfExists("qs_quotes");
};
