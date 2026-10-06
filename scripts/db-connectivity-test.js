// Temporary diagnostic: tests raw connectivity to the configured DATABASE_URL.
// Run with: node scripts/db-connectivity-test.js
const postgres = require("postgres");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const started = Date.now();
const sql = postgres(url, {
  prepare: false,
  connect_timeout: 10,
  ssl: "require",
  onnotice: () => {},
});

sql`select 1`
  .then((rows) => {
    console.log(`query OK in ${Date.now() - started}ms`, rows);
    return sql.end();
  })
  .catch((err) => {
    console.error(
      `query FAIL in ${Date.now() - started}ms`,
      "\n message:", err.message,
      "\n code:", err.code,
      "\n cause:", err.cause
    );
    return sql.end();
  });
