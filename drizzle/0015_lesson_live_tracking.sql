do $$ begin
  create type room_session_type as enum ('general_live', 'lesson_live');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type attendance_status as enum ('not_joined', 'partial', 'attended');
exception
  when duplicate_object then null;
end $$;

alter table "learning_plan_lessons"
  add column if not exists "reminder_thirty_sent_at" timestamp with time zone,
  add column if not exists "reminder_five_sent_at" timestamp with time zone;

alter table "rooms"
  add column if not exists "plan_id" uuid references "learning_plans"("id") on delete set null,
  add column if not exists "lesson_id" uuid references "learning_plan_lessons"("id") on delete set null,
  add column if not exists "session_type" room_session_type not null default 'general_live',
  add column if not exists "counts_toward_progress" boolean not null default false;

alter table "room_bookings"
  add column if not exists "joined_at" timestamp with time zone,
  add column if not exists "left_at" timestamp with time zone,
  add column if not exists "attendance_seconds" integer not null default 0,
  add column if not exists "attendance_status" attendance_status not null default 'not_joined',
  add column if not exists "completion_marked_by_learner" boolean not null default false,
  add column if not exists "completion_marked_at" timestamp with time zone,
  add column if not exists "feedback_requested_at" timestamp with time zone,
  add column if not exists "feedback_submitted_at" timestamp with time zone;

create table if not exists "room_session_feedback" (
  "id" uuid primary key default gen_random_uuid(),
  "room_id" uuid not null references "rooms"("id") on delete cascade,
  "expert_id" uuid not null references "users"("id") on delete cascade,
  "reviewer_id" uuid not null references "users"("id") on delete cascade,
  "booking_id" uuid references "room_bookings"("id") on delete set null,
  "rating" integer not null,
  "comment" text,
  "apply_to_expert_profile" boolean not null default false,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create unique index if not exists "room_session_feedback_unique_idx" on "room_session_feedback" ("room_id", "reviewer_id");
create index if not exists "room_session_feedback_room_idx" on "room_session_feedback" ("room_id");
create index if not exists "room_session_feedback_expert_idx" on "room_session_feedback" ("expert_id");
