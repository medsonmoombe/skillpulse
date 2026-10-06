create table if not exists "security_audit_logs" (
  "id" uuid primary key default gen_random_uuid(),
  "event" varchar(120) not null,
  "level" varchar(20) not null default 'warn',
  "user_id" uuid references "users"("id") on delete set null,
  "target_id" varchar(255),
  "route" varchar(255),
  "reason" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamptz not null default now()
);

create index if not exists "security_audit_logs_event_idx"
  on "security_audit_logs" ("event");

create index if not exists "security_audit_logs_user_idx"
  on "security_audit_logs" ("user_id");

create index if not exists "security_audit_logs_created_idx"
  on "security_audit_logs" ("created_at");
