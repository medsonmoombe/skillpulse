CREATE TYPE "public"."discovery_intent" AS ENUM(
  'career_growth',
  'interview_prep',
  'portfolio_building',
  'academic_support',
  'hobby_learning',
  'mentorship'
);--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "discovery_intent" "discovery_intent";
