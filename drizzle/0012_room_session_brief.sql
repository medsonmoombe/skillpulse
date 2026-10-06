alter table "rooms"
  add column if not exists "agenda" text[] not null default '{}',
  add column if not exists "skill_level" varchar(20),
  add column if not exists "session_notes" jsonb;
