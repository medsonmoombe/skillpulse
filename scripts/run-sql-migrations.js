require("dotenv").config({ path: ".env.local", override: true });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const postgres = require("postgres");

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
}

function readMigrationFile(filename) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  return fs.readFileSync(fullPath, "utf8");
}

function getChecksum(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function ensureMigrationsTable() {
  await sql`
    create table if not exists schema_sql_migrations (
      filename text primary key,
      checksum text not null,
      applied_at timestamp with time zone not null default now()
    )
  `;
}

async function getAppliedMigrations() {
  const rows = await sql`
    select filename, checksum
    from schema_sql_migrations
  `;
  return new Map(rows.map((row) => [row.filename, row.checksum]));
}

async function applyMigration(filename, content, checksum) {
  await sql.begin(async (tx) => {
    await tx.unsafe(content);
    await tx`
      insert into schema_sql_migrations (filename, checksum)
      values (${filename}, ${checksum})
    `;
  });
}

async function recordMigration(filename, checksum) {
  await sql`
    insert into schema_sql_migrations (filename, checksum)
    values (${filename}, ${checksum})
    on conflict (filename) do nothing
  `;
}

async function main() {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const filenames = listMigrationFiles();
  const pending = [];
  const shouldBaseline = process.argv.includes("--baseline");

  for (const filename of filenames) {
    const content = readMigrationFile(filename);
    const checksum = getChecksum(content);
    const appliedChecksum = applied.get(filename);

    if (appliedChecksum && appliedChecksum !== checksum) {
      throw new Error(`Migration changed after apply: ${filename}`);
    }

    if (!appliedChecksum) {
      pending.push({ filename, content, checksum });
    }
  }

  if (shouldBaseline) {
    if (pending.length === 0) {
      console.log("No migrations needed baselining.");
      return;
    }

    for (const migration of pending) {
      console.log(`Baselining ${migration.filename}...`);
      await recordMigration(migration.filename, migration.checksum);
    }

    console.log(`Baselined ${pending.length} SQL migration(s) without executing them.`);
    return;
  }

  if (pending.length === 0) {
    console.log("No pending SQL migrations.");
    return;
  }

  for (const migration of pending) {
    console.log(`Applying ${migration.filename}...`);
    await applyMigration(migration.filename, migration.content, migration.checksum);
  }

  console.log(`Applied ${pending.length} SQL migration(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
