CREATE TYPE "public"."conversation_member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('direct', 'group');--> statement-breakpoint
CREATE TYPE "public"."message_privacy" AS ENUM('everyone', 'matches_only', 'nobody');--> statement-breakpoint
CREATE TYPE "public"."notification_entity_type" AS ENUM('room', 'conversation', 'group', 'message', 'profile', 'article', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('booking', 'admit', 'session_start', 'direct_message', 'group_message', 'match_suggestion', 'system');--> statement-breakpoint
CREATE TYPE "public"."profile_visibility" AS ENUM('public', 'community', 'private');--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "conversation_member_role" DEFAULT 'member' NOT NULL,
	"can_message" boolean DEFAULT true NOT NULL,
	"notifications_muted" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_read_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "conversation_type" DEFAULT 'direct' NOT NULL,
	"participant_a" uuid,
	"participant_b" uuid,
	"created_by" uuid,
	"group_id" uuid,
	"title" varchar(255),
	"description" text,
	"image_url" text,
	"last_message_preview" text,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"type" "notification_type" DEFAULT 'system' NOT NULL,
	"entity_type" "notification_entity_type" DEFAULT 'system' NOT NULL,
	"entity_id" uuid,
	"action_url" text,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'booked' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid,
	"host_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"livekit_room_id" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"auto_admit" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_livekit_room_id_unique" UNIQUE("livekit_room_id")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"allow_direct_messages" boolean DEFAULT true NOT NULL,
	"direct_message_privacy" "message_privacy" DEFAULT 'everyone' NOT NULL,
	"allow_group_invites" boolean DEFAULT true NOT NULL,
	"show_typing_indicators" boolean DEFAULT true NOT NULL,
	"show_read_receipts" boolean DEFAULT true NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"in_app_notifications" boolean DEFAULT true NOT NULL,
	"profile_visibility" "profile_visibility" DEFAULT 'community' NOT NULL,
	"searchable_profile" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_a_users_id_fk" FOREIGN KEY ("participant_a") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_b_users_id_fk" FOREIGN KEY ("participant_b") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_conversation_member_idx" ON "conversation_participants" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "conversation_member_user_idx" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_conversation_idx" ON "conversations" USING btree ("participant_a","participant_b");--> statement-breakpoint
CREATE INDEX "conversation_group_idx" ON "conversations" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "conversation_last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_booking_idx" ON "room_bookings" USING btree ("room_id","user_id");--> statement-breakpoint
CREATE INDEX "room_host_idx" ON "rooms" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "user_settings_user_idx" ON "user_settings" USING btree ("user_id");