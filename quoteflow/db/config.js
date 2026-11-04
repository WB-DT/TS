const path = require("node:path");

const client = process.env.DB_CLIENT || "better-sqlite3";

if (client === "mssql") {
  module.exports = {
    client,
    connection: {
      server: process.env.AZURE_SQL_SERVER,
      port: Number(process.env.AZURE_SQL_PORT || 1433),
      database: process.env.AZURE_SQL_DATABASE,
      user: process.env.AZURE_SQL_USER,
      password: process.env.AZURE_SQL_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    },
    pool: { min: 0, max: 10 },
    migrations: { tableName: "knex_migrations" },
  };
} else {
  module.exports = {
    client: "better-sqlite3",
    connection: {
      filename: process.env.SQLITE_PATH || path.join(__dirname, "quotes.sqlite"),
      options: { readonly: false, fileMustExist: false },
    },
    useNullAsDefault: true,
    migrations: { tableName: "knex_migrations" },
  };
}
