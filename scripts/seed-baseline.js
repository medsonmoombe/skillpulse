require("dotenv").config({ path: ".env.local", override: true });
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

const TOPICS = [
  { name: "JavaScript", slug: "javascript" },
  { name: "TypeScript", slug: "typescript" },
  { name: "React", slug: "react" },
  { name: "Next.js", slug: "nextjs" },
  { name: "Node.js", slug: "nodejs" },
  { name: "Python", slug: "python" },
  { name: "SQL & Databases", slug: "sql-databases" },
  { name: "Web Design", slug: "web-design" },
  { name: "UI/UX Design", slug: "ui-ux-design" },
  { name: "Data Science", slug: "data-science" },
  { name: "Machine Learning", slug: "machine-learning" },
  { name: "DevOps & Cloud", slug: "devops-cloud" },
  { name: "Mobile Development", slug: "mobile-development" },
  { name: "Cybersecurity", slug: "cybersecurity" },
  { name: "Product Management", slug: "product-management" },
  { name: "Digital Marketing", slug: "digital-marketing" },
  { name: "Public Speaking", slug: "public-speaking" },
  { name: "Career Growth", slug: "career-growth" },
  { name: "Interview Prep", slug: "interview-prep" },
  { name: "Entrepreneurship", slug: "entrepreneurship" },
];

const ADMIN_EMAIL = process.argv[2] || "medsonmoombe21@gmail.com";

async function main() {
  let inserted = 0;
  for (const topic of TOPICS) {
    const rows = await sql`
      insert into topics (name, slug)
      values (${topic.name}, ${topic.slug})
      on conflict (name) do nothing
      returning id
    `;
    inserted += rows.length;
  }
  console.log(`Topics: ${inserted} inserted, ${TOPICS.length - inserted} already existed.`);

  const admins = await sql`
    update users set is_admin = true
    where email = ${ADMIN_EMAIL}
    returning id, email, is_admin
  `;
  if (admins.length === 0) {
    console.log(`No user found with email ${ADMIN_EMAIL} — no admin promoted.`);
  } else {
    console.log(`Admin promoted: ${admins[0].email} (is_admin=${admins[0].is_admin})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
