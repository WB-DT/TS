exports.config = { transaction: false };

// Remembers which Teams form response each quote came from,
// so the same form response is never imported twice.
exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn("quotes", "teams_response_id"))) {
    await knex.schema.alterTable("quotes", (table) => {
      table.string("teams_response_id", 64).nullable().unique();
    });
  }
};

exports.down = async function down(knex) {
  if (await knex.schema.hasColumn("quotes", "teams_response_id")) {
    await knex.schema.alterTable("quotes", (table) => {
      table.dropUnique(["teams_response_id"]);
      table.dropColumn("teams_response_id");
    });
  }
};