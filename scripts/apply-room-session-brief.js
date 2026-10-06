require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

async function main() {
  await sql`
    alter table "rooms"
      add column if not exists "agenda" text[] not null default '{}',
      add column if not exists "skill_level" varchar(20),
      add column if not exists "session_notes" jsonb
  `;

  const columns = await sql`
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'rooms'
      and column_name in ('agenda', 'skill_level', 'session_notes')
    order by column_name
  `;

  console.log(JSON.stringify(columns, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
