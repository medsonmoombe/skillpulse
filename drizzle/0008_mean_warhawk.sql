CREATE TABLE "expert_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"headline" varchar(150) NOT NULL,
	"bio" text NOT NULL,
	"linkedin_url" text,
	"portfolio_url" text,
	"credential_url" text,
	"years_experience" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "expert_applications_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "expert_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expert_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expert_applications" ADD CONSTRAINT "expert_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert_reviews" ADD CONSTRAINT "expert_reviews_expert_id_users_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert_reviews" ADD CONSTRAINT "expert_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expert_application_user_idx" ON "expert_applications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_expert_review_idx" ON "expert_reviews" USING btree ("expert_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "expert_review_expert_idx" ON "expert_reviews" USING btree ("expert_id");