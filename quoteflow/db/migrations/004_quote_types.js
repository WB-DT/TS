exports.config = { transaction: false };

async function dropReportingViews(knex) {
  const sqlServer = knex.client.config.client === "mssql";
  for (const viewName of ["v_quote_cycle_times", "v_quoter_workload", "v_reviser_outcomes", "v_ocr_accuracy"]) {
    if (sqlServer) await knex.raw(`IF OBJECT_ID('${viewName}', 'V') IS NOT NULL DROP VIEW ${viewName}`);
    else await knex.raw(`DROP VIEW IF EXISTS ${viewName}`);
  }
}

exports.up = async function up(knex) {
  await dropReportingViews(knex);

  if (!(await knex.schema.hasColumn("quotes", "quote_type"))) {
    await knex.schema.alterTable("quotes", (table) => {
      table.string("quote_type", 16).notNullable().defaultTo("Quote");
    });
  }

  // Backfill: any existing row whose number does not match the Q-000001 or
  // MDM-000001 sequence format gets renumbered into the Quote sequence so the
  // per-type counters stay consistent.
  const rows = await knex("quotes").select("id", "quote_number").orderBy("created_at");
  let quoteSequence = 0;
  let mdmSequence = 0;
  for (const row of rows) {
    const quoteMatch = String(row.quote_number).match(/^Q-(\d{6})$/);
    const mdmMatch = String(row.quote_number).match(/^MDM-(\d{6})$/);
    if (mdmMatch) {
      mdmSequence = Math.max(mdmSequence, Number(mdmMatch[1]));
      await knex("quotes").where({ id: row.id }).update({ quote_type: "MDM" });
    } else if (quoteMatch) {
      quoteSequence = Math.max(quoteSequence, Number(quoteMatch[1]));
    } else {
      quoteSequence += 1;
      await knex("quotes").where({ id: row.id }).update({
        quote_number: `Q-${String(quoteSequence).padStart(6, "0")}`,
        quote_type: "Quote",
      });
    }
  }
};

exports.down = async function down(knex) {
  await dropReportingViews(knex);
  await knex.schema.alterTable("quotes", (table) => {
    table.dropColumn("quote_type");
  });
};
