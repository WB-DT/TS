exports.config = { transaction: false };

// Server-side sessions, so a restart no longer signs everyone out.
// auth.js keeps the session id in the quotes.sid cookie and the session body here.
exports.up = async function up(knex) {
  if (await knex.schema.hasTable("sessions")) return;
  await knex.schema.createTable("sessions", (table) => {
    table.string("id", 128).primary();  // the signed session id from the cookie
    table.text("sess").notNullable();   // JSON session body
    table.bigInteger("expires").notNullable();
    table.index(["expires"], "sessions_expires_index");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("sessions");
};
