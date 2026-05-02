ALTER TABLE "rooms" ADD COLUMN "max_participants" integer;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "host_last_ping" timestamp with time zone;