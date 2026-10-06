CREATE TABLE "operational_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" varchar(120) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"scope" varchar(80) NOT NULL,
	"entity_type" varchar(80),
	"entity_id" varchar(255),
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" varchar(120) NOT NULL,
	"level" varchar(20) DEFAULT 'warn' NOT NULL,
	"user_id" uuid,
	"target_id" varchar(255),
	"route" varchar(255),
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "security_audit_logs" ADD CONSTRAINT "security_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operational_events_event_idx" ON "operational_events" USING btree ("event");--> statement-breakpoint
CREATE INDEX "operational_events_status_idx" ON "operational_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "operational_events_created_idx" ON "operational_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "security_audit_logs_event_idx" ON "security_audit_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "security_audit_logs_user_idx" ON "security_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_audit_logs_created_idx" ON "security_audit_logs" USING btree ("created_at");