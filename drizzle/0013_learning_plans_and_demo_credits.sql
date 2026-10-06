do $$ begin
  create type learning_plan_status as enum ('draft', 'active', 'completed', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type lesson_status as enum ('planned', 'published', 'completed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type resource_type as enum ('doc', 'link', 'recording', 'note', 'file');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type credit_transaction_type as enum (
    'bonus',
    'session_booking_debit',
    'session_booking_credit',
    'session_refund',
    'manual_adjustment'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type credit_transaction_direction as enum ('credit', 'debit');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type demo_payment_method as enum (
    'bonus_credits',
    'airtel_money',
    'mtn_money',
    'zamtel_money',
    'zed_mobile'
  );
exception
  when duplicate_object then null;
end $$;

alter table "rooms"
  add column if not exists "price_credits" integer not null default 0;

alter table "room_bookings"
  add column if not exists "paid_credits" integer not null default 0,
  add column if not exists "payment_method" demo_payment_method not null default 'bonus_credits';

create table if not exists "learning_plans" (
  "id" uuid primary key default gen_random_uuid(),
  "learner_id" uuid not null references "users"("id") on delete cascade,
  "expert_id" uuid not null references "users"("id") on delete cascade,
  "topic_id" uuid references "topics"("id") on delete set null,
  "title" varchar(160) not null,
  "description" text,
  "goal" text,
  "status" learning_plan_status not null default 'draft',
  "total_lessons" integer not null default 0,
  "completed_lessons" integer not null default 0,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create index if not exists "learning_plan_learner_idx" on "learning_plans" ("learner_id");
create index if not exists "learning_plan_expert_idx" on "learning_plans" ("expert_id");
create index if not exists "learning_plan_topic_idx" on "learning_plans" ("topic_id");

create table if not exists "learning_plan_lessons" (
  "id" uuid primary key default gen_random_uuid(),
  "plan_id" uuid not null references "learning_plans"("id") on delete cascade,
  "title" varchar(160) not null,
  "summary" text,
  "objective" text,
  "status" lesson_status not null default 'planned',
  "position" integer not null default 0,
  "scheduled_at" timestamp with time zone,
  "duration_minutes" integer,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create index if not exists "learning_plan_lesson_plan_idx" on "learning_plan_lessons" ("plan_id");
create unique index if not exists "learning_plan_lesson_position_idx" on "learning_plan_lessons" ("plan_id", "position");

create table if not exists "session_archives" (
  "id" uuid primary key default gen_random_uuid(),
  "room_id" uuid not null unique references "rooms"("id") on delete cascade,
  "plan_id" uuid references "learning_plans"("id") on delete set null,
  "lesson_id" uuid references "learning_plan_lessons"("id") on delete set null,
  "host_id" uuid not null references "users"("id") on delete cascade,
  "title" varchar(255) not null,
  "recording_url" text,
  "board_image_data_url" text,
  "summary" jsonb not null default '{}'::jsonb,
  "skill_level" varchar(20),
  "agenda" text[] not null default '{}'::text[],
  "notes" jsonb not null default '{}'::jsonb,
  "started_at" timestamp with time zone,
  "ended_at" timestamp with time zone not null,
  "created_at" timestamp with time zone not null default now()
);

create index if not exists "session_archive_host_idx" on "session_archives" ("host_id");
create index if not exists "session_archive_plan_idx" on "session_archives" ("plan_id");

create table if not exists "learning_resources" (
  "id" uuid primary key default gen_random_uuid(),
  "plan_id" uuid references "learning_plans"("id") on delete cascade,
  "lesson_id" uuid references "learning_plan_lessons"("id") on delete cascade,
  "session_archive_id" uuid references "session_archives"("id") on delete cascade,
  "room_id" uuid references "rooms"("id") on delete cascade,
  "uploaded_by" uuid not null references "users"("id") on delete cascade,
  "type" resource_type not null default 'doc',
  "title" varchar(160) not null,
  "description" text,
  "url" text,
  "content" text,
  "created_at" timestamp with time zone not null default now()
);

create index if not exists "learning_resource_plan_idx" on "learning_resources" ("plan_id");
create index if not exists "learning_resource_lesson_idx" on "learning_resources" ("lesson_id");
create index if not exists "learning_resource_session_archive_idx" on "learning_resources" ("session_archive_id");

create table if not exists "credit_wallets" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null unique references "users"("id") on delete cascade,
  "balance" integer not null default 0,
  "bonus_granted_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create index if not exists "credit_wallet_user_idx" on "credit_wallets" ("user_id");

create table if not exists "credit_transactions" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null references "users"("id") on delete cascade,
  "counterparty_user_id" uuid references "users"("id") on delete set null,
  "room_id" uuid references "rooms"("id") on delete set null,
  "booking_id" uuid references "room_bookings"("id") on delete set null,
  "type" credit_transaction_type not null,
  "direction" credit_transaction_direction not null,
  "amount" integer not null,
  "payment_method" demo_payment_method not null default 'bonus_credits',
  "description" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now()
);

create index if not exists "credit_transaction_user_idx" on "credit_transactions" ("user_id");
create index if not exists "credit_transaction_room_idx" on "credit_transactions" ("room_id");
create index if not exists "credit_transaction_booking_idx" on "credit_transactions" ("booking_id");
