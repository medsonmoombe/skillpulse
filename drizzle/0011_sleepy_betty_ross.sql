ALTER TABLE "rooms" ADD COLUMN "agenda" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "skill_level" varchar(20);--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "session_notes" jsonb;