require("dotenv").config();

const path = require("node:path");
const knexFactory = require("knex");
const configuration = require("./config");
const createRepositories = require("./repositories");
const { config } = require("../config");
const { logger } = require("../logger");
const { installViews } = require("./views");
const { seed } = require("./seed");

const connection = knexFactory(configuration);
const repositories = createRepositories(connection);
let initialized = false;

async function initialize() {
  if (initialized) return;
  if (configuration.client === "better-sqlite3") {
    await connection.raw("PRAGMA foreign_keys = ON");
    await connection.raw("PRAGMA journal_mode = WAL");
  }
  await connection.migrate.latest({ directory: path.join(__dirname, "migrations") });
  await installViews(connection);
  await seed(connection);
  const granted = await repositories.users.applyManagerEmails(config.managerEmails);
  if (granted.length) logger.info("Manager role granted via MANAGER_EMAILS", { emails: granted.join(", ") });
  initialized = true;
}

async function shutdown() {
  await connection.destroy();
}

module.exports = { connection, initialize, shutdown, ...repositories };
