require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

async function main() {
  const dbInfo = await sql`
    select current_database() as db, current_schema() as schema
  `;

  const columns = await sql`
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'rooms'
    order by ordinal_position
  `;

  console.log(JSON.stringify({ dbInfo, columns }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
