exports.up = async function up(knex) {
  await knex.schema.createTable("users", (table) => {
    table.string("id", 36).primary();
    table.string("email", 255).notNullable().unique();
    table.string("name", 160).notNullable();
    table.string("role", 24).notNullable();
    table.string("team", 24).notNullable();
    table.boolean("active").notNullable().defaultTo(true);
  });

  await knex.schema.createTable("accounts", (table) => {
    table.string("id", 36).primary();
    table.string("account_number", 40).notNullable().unique();
    table.string("account_name", 200).notNullable();
  });

  await knex.schema.createTable("quotes", (table) => {
    table.string("id", 36).primary();
    table.string("quote_number", 48).notNullable().unique();
    table.string("account_id", 36).nullable();
    table.string("submitted_by_rep", 36).notNullable();
    table.string("team", 24).notNullable();
    table.string("template", 24).notNullable();
    table.string("status", 32).notNullable();
    table.string("assigned_quoter_id", 36).nullable();
    table.string("screened_by_id", 36).nullable();
    table.string("final_reviewer_id", 36).nullable();
    table.boolean("contract_pricing").notNullable().defaultTo(false);
    table.bigInteger("created_at").notNullable();
    table.bigInteger("updated_at").notNullable();
    table.foreign("account_id").references("id").inTable("accounts").onDelete("SET NULL");
    table.foreign("submitted_by_rep").references("id").inTable("users").onDelete("RESTRICT");
    table.foreign("assigned_quoter_id").references("id").inTable("users").onDelete("SET NULL");
    table.foreign("screened_by_id").references("id").inTable("users").onDelete("SET NULL");
    table.foreign("final_reviewer_id").references("id").inTable("users").onDelete("SET NULL");
    table.index(["status", "team"], "quotes_status_team_idx");
    table.index(["assigned_quoter_id", "status"], "quotes_quoter_status_idx");
  });

  await knex.schema.createTable("quote_files", (table) => {
    table.string("id", 36).primary();
    table.string("quote_id", 36).notNullable();
    table.string("file_name", 255).notNullable();
    table.string("file_type", 120).notNullable();
    table.string("file_hash", 64).notNullable();
    table.string("uploaded_by_id", 36).notNullable();
    table.bigInteger("uploaded_at").notNullable();
    table.string("invoice_source", 255).nullable();
    table.date("invoice_date").nullable();
    table.foreign("quote_id").references("id").inTable("quotes").onDelete("CASCADE");
    table.foreign("uploaded_by_id").references("id").inTable("users").onDelete("RESTRICT");
    table.index(["file_hash"], "quote_files_hash_idx");
    table.index(["quote_id", "uploaded_at"], "quote_files_quote_uploaded_idx");
  });

  await knex.schema.createTable("line_items", (table) => {
    table.string("id", 36).primary();
    table.string("file_id", 36).notNullable();
    table.integer("line_number").notNullable();
    table.string("competitor_item_no", 120).nullable();
    table.string("manufacturer_part_no", 120).nullable();
    table.string("brand", 160).nullable();
    table.text("description_raw").nullable();
    table.text("description_summary").nullable();
    table.string("uom", 80).nullable();
    table.decimal("count_per_unit", 18, 4).nullable();
    table.decimal("price_per_uom", 19, 4).nullable();
    table.decimal("quantity", 18, 4).nullable();
    table.decimal("extended_price", 19, 4).nullable();
    table.decimal("normalized_unit_price", 19, 4).nullable();
    table.string("source_page", 120).nullable();
    table.decimal("confidence_min", 5, 4).notNullable().defaultTo(0);
    table.boolean("needs_review").notNullable().defaultTo(false);
    table.boolean("edited_by_quoter").notNullable().defaultTo(false);
    table.foreign("file_id").references("id").inTable("quote_files").onDelete("CASCADE");
    table.unique(["file_id", "line_number"], "line_items_file_line_unique");
  });

  await knex.schema.createTable("quote_status_history", (table) => {
    table.string("id", 36).primary();
    table.string("quote_id", 36).notNullable();
    table.string("from_status", 32).nullable();
    table.string("to_status", 32).notNullable();
    table.string("changed_by_id", 36).nullable();
    table.bigInteger("changed_at").notNullable();
    table.text("reason").nullable();
    table.foreign("quote_id").references("id").inTable("quotes").onDelete("CASCADE");
    table.foreign("changed_by_id").references("id").inTable("users").onDelete("SET NULL");
    table.index(["quote_id", "changed_at"], "quote_status_history_timeline_idx");
  });

  await knex.schema.createTable("quote_extracted_fields", (table) => {
    table.string("id", 36).primary();
    table.string("quote_file_id", 36).notNullable();
    table.string("line_item_id", 36).nullable();
    table.string("field_group", 16).notNullable();
    table.string("field_name", 100).notNullable();
    table.string("template", 24).notNullable();
    table.text("original_value").nullable();
    table.text("current_value").nullable();
    table.decimal("confidence", 5, 4).notNullable().defaultTo(0);
    table.boolean("needs_review").notNullable().defaultTo(false);
    table.bigInteger("extracted_at").notNullable();
    table.foreign("quote_file_id").references("id").inTable("quote_files").onDelete("CASCADE");
    table.foreign("line_item_id").references("id").inTable("line_items").onDelete("CASCADE");
    table.index(["template", "field_name"], "quote_extracted_fields_template_idx");
    table.index(["quote_file_id", "field_group"], "quote_extracted_fields_file_group_idx");
  });

  await knex.schema.createTable("field_edits", (table) => {
    table.string("id", 36).primary();
    table.string("line_item_id", 36).nullable();
    table.string("quote_file_id", 36).notNullable();
    table.string("extracted_field_id", 36).notNullable();
    table.string("field_name", 100).notNullable();
    table.text("original_value").nullable();
    table.text("new_value").nullable();
    table.string("edited_by_id", 36).notNullable();
    table.bigInteger("edited_at").notNullable();
    table.foreign("line_item_id").references("id").inTable("line_items").onDelete("CASCADE");
    table.foreign("quote_file_id").references("id").inTable("quote_files").onDelete("CASCADE");
    table.foreign("extracted_field_id").references("id").inTable("quote_extracted_fields").onDelete("CASCADE");
    table.foreign("edited_by_id").references("id").inTable("users").onDelete("RESTRICT");
    table.index(["extracted_field_id", "edited_at"], "field_edits_extracted_field_idx");
  });
};

exports.down = async function down(knex) {
  for (const tableName of [
    "field_edits",
    "quote_extracted_fields",
    "quote_status_history",
    "line_items",
    "quote_files",
    "quotes",
    "accounts",
    "users",
  ]) {
    await knex.schema.dropTableIfExists(tableName);
  }
};
