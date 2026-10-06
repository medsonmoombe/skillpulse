require("dotenv").config({ path: ".env.local", override: true });
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

async function getColumns(tableName) {
  return sql`
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = ${tableName}
    order by ordinal_position
  `;
}

async function main() {
  const dbInfo = await sql`
    select current_database() as db, current_schema() as schema
  `;

  const result = {
    dbInfo,
    articles: await getColumns("articles"),
    users: await getColumns("users"),
    topics: await getColumns("topics"),
    expert_profiles: await getColumns("expert_profiles"),
    user_settings: await getColumns("user_settings"),
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
