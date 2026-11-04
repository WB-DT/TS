exports.config = { transaction: false };

exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable("quote_comments"))) {
    await knex.schema.createTable("quote_comments", (table) => {
      table.string("id", 36).primary();
      table.string("quote_id", 36).notNullable();
      table.string("author_id", 36).notNullable();
      table.text("body").notNullable();
      table.boolean("visible_to_rep").notNullable().defaultTo(false);
      table.bigInteger("created_at").notNullable();
      table.foreign("quote_id").references("id").inTable("quotes").onDelete("CASCADE");
      table.foreign("author_id").references("id").inTable("users").onDelete("RESTRICT");
      table.index(["quote_id", "created_at"], "quote_comments_quote_idx");
    });
  }

  if (!(await knex.schema.hasTable("notifications"))) {
    await knex.schema.createTable("notifications", (table) => {
      table.string("id", 36).primary();
      table.string("user_id", 36).notNullable();
      table.string("quote_id", 36).nullable();
      table.string("kind", 40).notNullable();
      table.text("message").notNullable();
      table.boolean("read").notNullable().defaultTo(false);
      table.bigInteger("created_at").notNullable();
      table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
      table.foreign("quote_id").references("id").inTable("quotes").onDelete("CASCADE");
      table.index(["user_id", "read"], "notifications_user_read_idx");
    });
  }

  if (!(await knex.schema.hasTable("coaching_notes"))) {
    await knex.schema.createTable("coaching_notes", (table) => {
      table.string("id", 36).primary();
      table.string("quote_id", 36).notNullable();
      table.string("line_item_id", 36).nullable();
      table.string("quoter_id", 36).notNullable();
      table.string("reviser_id", 36).notNullable();
      table.string("category", 80).notNullable();
      table.text("note").notNullable();
      table.bigInteger("created_at").notNullable();
      table.string("visibility", 16).notNullable().defaultTo("archived");
      table.bigInteger("shared_at").nullable();
      table.string("shared_by_id", 36).nullable();
      table.foreign("quote_id").references("id").inTable("quotes").onDelete("CASCADE");
      table.foreign("line_item_id").references("id").inTable("line_items").onDelete("SET NULL");
      table.foreign("quoter_id").references("id").inTable("users").onDelete("CASCADE");
      table.foreign("reviser_id").references("id").inTable("users").onDelete("CASCADE");
      table.foreign("shared_by_id").references("id").inTable("users").onDelete("SET NULL");
      table.index(["quoter_id", "visibility"], "coaching_notes_quoter_idx");
    });
  }

  if (!(await knex.schema.hasColumn("field_edits", "reason"))) {
    await knex.schema.alterTable("field_edits", (table) => {
      table.string("reason", 80).nullable();
      table.text("reason_note").nullable();
      table.boolean("coaching_opportunity").notNullable().defaultTo(false);
      table.string("coaching_category", 80).nullable();
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("field_edits", (table) => {
    table.dropColumn("reason");
    table.dropColumn("reason_note");
    table.dropColumn("coaching_opportunity");
    table.dropColumn("coaching_category");
  });
  await knex.schema.dropTableIfExists("coaching_notes");
  await knex.schema.dropTableIfExists("notifications");
  await knex.schema.dropTableIfExists("quote_comments");
};
