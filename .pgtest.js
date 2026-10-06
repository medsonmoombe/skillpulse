const path = require("path");
const fs = require("fs");
const postgres = require(path.join(process.cwd(), "node_modules", "postgres"));
const file = process.argv[2] || ".env.local";
const u = fs.readFileSync(file, "utf8").match(/DATABASE_URL=(.*)/)[1].trim();
const host = u.split("@")[1].split("/")[0];
console.log("testing DB host:", host, "from", file);
const sql = postgres(u, { prepare: false, max: 1, connect_timeout: 8, ssl: "require", onnotice: () => {} });
const t = Date.now();
sql.unsafe("select 1 as ok")
  .then((r) => { console.log("PG OK in", Date.now() - t, "ms", r); return sql.end(); })
  .catch((e) => { console.log("PG FAIL in", Date.now() - t, "ms:", e.message, "code:", e.code || (e.cause && e.cause.code)); process.exit(1); });
