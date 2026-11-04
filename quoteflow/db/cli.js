const database = require("./index");

async function run() {
  try {
    await database.initialize();
    const [{ quoteCount }] = await database.connection("quotes").count({ quoteCount: "id" });
    const [{ userCount }] = await database.connection("users").count({ userCount: "id" });
    console.log(`Database ready: ${Number(userCount)} users, ${Number(quoteCount)} quotes.`);
  } finally {
    await database.shutdown();
  }
}

run().catch((error) => {
  console.error("Database setup failed:", error.message);
  process.exitCode = 1;
});
