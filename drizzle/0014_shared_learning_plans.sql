do $$ begin
  create type learning_plan_visibility as enum ('private', 'invite_only', 'public');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type learning_plan_member_status as enum ('invited', 'active', 'removed', 'completed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type learning_plan_member_role as enum ('learner');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type learning_plan_lesson_progress_status as enum ('not_started', 'in_progress', 'completed');
exception
  when duplicate_object then null;
end $$;

alter table "learning_plans"
  alter column "learner_id" drop not null;

alter table "learning_plans"
  add column if not exists "visibility" learning_plan_visibility not null default 'private';

create table if not exists "learning_plan_members" (
  "id" uuid primary key default gen_random_uuid(),
  "plan_id" uuid not null references "learning_plans"("id") on delete cascade,
  "user_id" uuid not null references "users"("id") on delete cascade,
  "added_by" uuid references "users"("id") on delete set null,
  "role" learning_plan_member_role not null default 'learner',
  "status" learning_plan_member_status not null default 'invited',
  "joined_at" timestamp with time zone not null default now(),
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create unique index if not exists "learning_plan_member_unique_idx" on "learning_plan_members" ("plan_id", "user_id");
create index if not exists "learning_plan_member_plan_idx" on "learning_plan_members" ("plan_id");
create index if not exists "learning_plan_member_user_idx" on "learning_plan_members" ("user_id");

create table if not exists "learning_plan_lesson_progress" (
  "id" uuid primary key default gen_random_uuid(),
  "plan_member_id" uuid not null references "learning_plan_members"("id") on delete cascade,
  "lesson_id" uuid not null references "learning_plan_lessons"("id") on delete cascade,
  "status" learning_plan_lesson_progress_status not null default 'not_started',
  "notes" text,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create unique index if not exists "learning_plan_lesson_progress_unique_idx" on "learning_plan_lesson_progress" ("plan_member_id", "lesson_id");
create index if not exists "learning_plan_lesson_progress_member_idx" on "learning_plan_lesson_progress" ("plan_member_id");
create index if not exists "learning_plan_lesson_progress_lesson_idx" on "learning_plan_lesson_progress" ("lesson_id");

insert into "learning_plan_members" (
  "plan_id",
  "user_id",
  "added_by",
  "status",
  "joined_at",
  "created_at",
  "updated_at"
)
select
  lp."id",
  lp."learner_id",
  lp."expert_id",
  case
    when lp."status" in ('completed', 'archived') then 'completed'::learning_plan_member_status
    when lp."status" = 'active' then 'active'::learning_plan_member_status
    else 'invited'::learning_plan_member_status
  end,
  lp."created_at",
  lp."created_at",
  lp."updated_at"
from "learning_plans" lp
where lp."learner_id" is not null
on conflict ("plan_id", "user_id") do nothing;
