exports.config = { transaction: false };

// Version 2: job titles and reporting lines, specialty tags, the reps' management contacts,
// the template on each quote, and what happens after approval (exports, lock-in, the final
// email to the rep, follow-ups with order numbers). Nothing existing is removed.
exports.up = async function up(knex) {
  const addColumns = async (tableName, columns) => {
    const missing = [];
    for (const [name, add] of columns) if (!(await knex.schema.hasColumn(tableName, name))) missing.push(add);
    if (missing.length) await knex.schema.alterTable(tableName, (table) => missing.forEach((add) => add(table)));
  };

  await addColumns("users", [
    ["job_title", (table) => table.string("job_title", 40)],          // Quoter, Quotes Supervisor, ... (see auth.js TITLES)
    ["reports_to_id", (table) => table.string("reports_to_id", 36)],  // their supervisor or manager
    ["department", (table) => table.string("department", 60)],        // for reps: AM1, Schools, ... (who to copy)
  ]);
  await addColumns("quotes", [
    ["template_key", (table) => table.string("template_key", 60)],    // the template picked at screening
    ["specialty", (table) => table.string("specialty", 60)],          // Food service, Pack and ship, ...
    ["rep_department", (table) => table.string("rep_department", 60)],
  ]);

  if (!(await knex.schema.hasTable("specialty_tags"))) {
    await knex.schema.createTable("specialty_tags", (table) => {
      table.string("id", 36).primary();
      table.string("name", 60).notNullable().unique();
      table.integer("sort").notNullable().defaultTo(0);
    });
  }
  if (!(await knex.schema.hasTable("user_specialties"))) {
    await knex.schema.createTable("user_specialties", (table) => {
      table.string("user_id", 36).notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.string("tag_id", 36).notNullable().references("id").inTable("specialty_tags").onDelete("CASCADE");
      table.primary(["user_id", "tag_id"], "user_specialties_pk");
    });
  }

  // The reps' supervisors and managers. They don't sign in; they're copied on the final email.
  if (!(await knex.schema.hasTable("department_contacts"))) {
    await knex.schema.createTable("department_contacts", (table) => {
      table.string("id", 36).primary();
      table.string("department", 60).notNullable();
      table.string("name", 160);
      table.string("email", 255);
      table.string("title", 60);
      table.boolean("cc").notNullable().defaultTo(true);
      table.integer("sort").notNullable().defaultTo(0);
    });
  }

  // Every export click, so Completed quotes can show what's been downloaded.
  if (!(await knex.schema.hasTable("quote_exports"))) {
    await knex.schema.createTable("quote_exports", (table) => {
      table.string("id", 36).primary();
      table.string("quote_id", 36).notNullable().references("id").inTable("quotes").onDelete("CASCADE");
      table.string("kind", 20).notNullable();                         // customer, internal, favorites, load-form
      table.string("exported_by_id", 36);
      table.integer("exported_at").notNullable();
      table.index(["quote_id"], "quote_exports_quote_idx");
    });
  }

  // After approval: lock-in confirmed, then the final email to the rep.
  if (!(await knex.schema.hasTable("quote_completion"))) {
    await knex.schema.createTable("quote_completion", (table) => {
      table.string("quote_id", 36).primary().references("id").inTable("quotes").onDelete("CASCADE");
      table.integer("locked_at");
      table.string("locked_by_id", 36);
      table.integer("email_at");
      table.string("email_by_id", 36);
      table.text("email_to");
      table.text("email_cc");
      table.text("email_subject");
      table.decimal("offer_percent", 7, 4);
    });
  }

  // Did the customer order? Asked of the rep after the final email; answered with order numbers.
  if (!(await knex.schema.hasTable("quote_followups"))) {
    await knex.schema.createTable("quote_followups", (table) => {
      table.string("id", 36).primary();
      table.string("quote_id", 36).notNullable().references("id").inTable("quotes").onDelete("CASCADE");
      table.string("token", 64).notNullable().unique();              // the rep's one-click link
      table.integer("round").notNullable().defaultTo(1);              // 1 = first ask, 2 = reminder
      table.integer("due_at").notNullable();
      table.integer("sent_at");
      table.string("answer", 20);                                     // Ordered, Partly ordered, Not yet, No answer
      table.text("order_numbers");
      table.decimal("order_amount", 19, 2);
      table.text("note");
      table.integer("answered_at");
      table.string("answered_via", 20);                               // rep link, or recorded by the quoter
      table.string("recorded_by_id", 36);
      table.index(["quote_id"], "quote_followups_quote_idx");
      table.index(["due_at"], "quote_followups_due_idx");
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("quote_followups");
  await knex.schema.dropTableIfExists("quote_completion");
  await knex.schema.dropTableIfExists("quote_exports");
  await knex.schema.dropTableIfExists("department_contacts");
  await knex.schema.dropTableIfExists("user_specialties");
  await knex.schema.dropTableIfExists("specialty_tags");
};
