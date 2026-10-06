create table if not exists "operational_events" (
  "id" uuid primary key default gen_random_uuid(),
  "event" varchar(120) not null,
  "status" varchar(20) not null default 'pending',
  "scope" varchar(80) not null,
  "entity_type" varchar(80),
  "entity_id" varchar(255),
  "payload" jsonb not null default '{}'::jsonb,
  "last_error" text,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index if not exists "operational_events_event_idx"
  on "operational_events" ("event");

create index if not exists "operational_events_status_idx"
  on "operational_events" ("status");

create index if not exists "operational_events_created_idx"
  on "operational_events" ("created_at");
