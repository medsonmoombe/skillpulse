alter table "learning_plans"
  add column if not exists "completion_mode" varchar(32) not null default 'fixed_curriculum',
  add column if not exists "required_lesson_count" integer,
  add column if not exists "ends_at" timestamp with time zone;
