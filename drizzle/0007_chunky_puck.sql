CREATE TYPE "public"."group_join_mode" AS ENUM('open', 'approval_required');--> statement-breakpoint
CREATE TYPE "public"."group_membership_status" AS ENUM('pending', 'approved');--> statement-breakpoint
CREATE TYPE "public"."group_message_policy" AS ENUM('all_members', 'admins_only');--> statement-breakpoint
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "intro_image_url" text;--> statement-breakpoint
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "intro_video_url" text;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD COLUMN "status" "group_membership_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "join_mode" "group_join_mode" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "member_messaging_policy" "group_message_policy" DEFAULT 'all_members' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "discovery_intent" "discovery_intent";--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;