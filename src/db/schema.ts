// src/db/schema.ts
import {
  pgTable, uuid, varchar, text, timestamp, pgEnum, integer,
  boolean, jsonb, uniqueIndex, index
} from "drizzle-orm/pg-core";

// ==========================================
// ENUMS
// ==========================================
export const roleEnum = pgEnum("role", ["learner", "expert"]);
export const verificationEnum = pgEnum("verification_status", ["pending", "verified", "rejected"]);
export const articleInteractionEnum = pgEnum("interaction_type", ["comment", "fire", "lightbulb", "heart"]);
export const groupRoleEnum = pgEnum("group_role", ["admin", "moderator", "member"]);
export const groupJoinModeEnum = pgEnum("group_join_mode", ["open", "approval_required"]);
export const groupMessagePolicyEnum = pgEnum("group_message_policy", ["all_members", "admins_only"]);
export const groupMembershipStatusEnum = pgEnum("group_membership_status", ["pending", "approved"]);
export const conversationTypeEnum = pgEnum("conversation_type", ["direct", "group"]);
export const conversationMemberRoleEnum = pgEnum("conversation_member_role", ["owner", "admin", "member"]);
export const messagePrivacyEnum = pgEnum("message_privacy", ["everyone", "matches_only", "nobody"]);
export const profileVisibilityEnum = pgEnum("profile_visibility", ["public", "community", "private"]);
export const roomSessionTypeEnum = pgEnum("room_session_type", ["general_live", "lesson_live"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["not_joined", "partial", "attended"]);
export const discoveryIntentEnum = pgEnum("discovery_intent", [
  "career_growth",
  "interview_prep",
  "portfolio_building",
  "academic_support",
  "hobby_learning",
  "mentorship",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "booking",
  "admit",
  "session_start",
  "direct_message",
  "group_message",
  "match_suggestion",
  "system",
]);
export const notificationEntityTypeEnum = pgEnum("notification_entity_type", [
  "room",
  "conversation",
  "group",
  "message",
  "profile",
  "article",
  "system",
]);
export const learningPlanStatusEnum = pgEnum("learning_plan_status", ["draft", "active", "completed", "archived"]);
export const learningPlanVisibilityEnum = pgEnum("learning_plan_visibility", ["private", "invite_only", "public"]);
export const learningPlanMemberStatusEnum = pgEnum("learning_plan_member_status", ["invited", "active", "removed", "completed"]);
export const learningPlanMemberRoleEnum = pgEnum("learning_plan_member_role", ["learner"]);
export const lessonStatusEnum = pgEnum("lesson_status", ["planned", "published", "completed"]);
export const learningPlanLessonProgressStatusEnum = pgEnum("learning_plan_lesson_progress_status", ["not_started", "in_progress", "missed", "completed"]);
export const resourceTypeEnum = pgEnum("resource_type", ["doc", "link", "recording", "note", "file"]);
export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "bonus",
  "session_booking_debit",
  "session_booking_credit",
  "session_refund",
  "manual_adjustment",
]);
export const creditTransactionDirectionEnum = pgEnum("credit_transaction_direction", ["credit", "debit"]);
export const demoPaymentMethodEnum = pgEnum("demo_payment_method", [
  "bonus_credits",
  "airtel_money",
  "mtn_money",
  "zamtel_money",
  "zed_mobile",
]);

// ==========================================
// USERS
// ==========================================
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: varchar("clerk_id", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  role: roleEnum("role").default("learner").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isSuspended: boolean("is_suspended").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("user_clerk_id_idx").on(table.clerkId),
]);

// ==========================================
// EXPERT PROFILES
// ==========================================
export const expertProfiles = pgTable("expert_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  headline: varchar("headline", { length: 150 }),
  introImageUrl: text("intro_image_url"),
  introVideoUrl: text("intro_video_url"),
  hourlyRateCents: integer("hourly_rate_cents").default(0),
  verificationStatus: verificationEnum("verification_status").default("pending").notNull(),
  ratingAvg: integer("rating_avg").default(0),
  reviewCount: integer("review_count").default(0),
  availability: jsonb("availability").$type<Record<string, string[]>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// TOPICS
// ==========================================
export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  iconUrl: text("icon_url"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// USER TOPICS
// ==========================================
export const userTopics = pgTable("user_topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "cascade" }).notNull(),
  relationship: varchar("relationship", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_user_topic_idx").on(table.userId, table.topicId, table.relationship),
]);

// ==========================================
// ARTICLES
// ==========================================
export const articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  coverImageUrl: text("cover_image_url"),
  viewsCount: integer("views_count").default(0).notNull(),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("article_author_idx").on(table.authorId),
  index("article_slug_idx").on(table.slug),
]);

// ==========================================
// ARTICLE INTERACTIONS
// ==========================================
export const articleInteractions = pgTable("article_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id").references(() => articles.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: articleInteractionEnum("type").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("interaction_article_idx").on(table.articleId),
]);

// ==========================================
// GROUPS
// ==========================================
export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description").notNull(),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
  coverImageUrl: text("cover_image_url"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  joinMode: groupJoinModeEnum("join_mode").default("open").notNull(),
  memberMessagingPolicy: groupMessagePolicyEnum("member_messaging_policy").default("all_members").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("group_slug_idx").on(table.slug),
]);

// ==========================================
// GROUP MEMBERSHIPS
// ==========================================
export const groupMemberships = pgTable("group_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: groupRoleEnum("role").default("member").notNull(),
  status: groupMembershipStatusEnum("status").default("approved").notNull(),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_group_member_idx").on(table.groupId, table.userId),
]);

// ==========================================
// GROUP POSTS
// ==========================================
export const groupPosts = pgTable("group_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  parentPostId: uuid("parent_post_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("post_group_idx").on(table.groupId),
]);

// ==========================================
// ROOMS
// ==========================================
export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
  hostId: uuid("host_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  planId: uuid("plan_id").references(() => learningPlans.id, { onDelete: "set null" }),
  lessonId: uuid("lesson_id").references(() => learningPlanLessons.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  livekitRoomId: varchar("livekit_room_id", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  sessionType: roomSessionTypeEnum("session_type").default("general_live").notNull(),
  countsTowardProgress: boolean("counts_toward_progress").default(false).notNull(),
  maxParticipants: integer("max_participants"),
  hostLastPing: timestamp("host_last_ping", { withTimezone: true }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  autoAdmit: boolean("auto_admit").default(true).notNull(),
  priceCredits: integer("price_credits").default(0).notNull(),
  // Session brief fields
  agenda: text("agenda").array().notNull().default([]),
  skillLevel: varchar("skill_level", { length: 20 }),
  sessionNotes: jsonb("session_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("room_host_idx").on(table.hostId),
]);

// ==========================================
// ROOM BOOKINGS
// ==========================================
export const roomBookings = pgTable("room_bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).default("booked").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  leftAt: timestamp("left_at", { withTimezone: true }),
  attendanceSeconds: integer("attendance_seconds").default(0).notNull(),
  attendanceStatus: attendanceStatusEnum("attendance_status").default("not_joined").notNull(),
  completionMarkedByLearner: boolean("completion_marked_by_learner").default(false).notNull(),
  completionMarkedAt: timestamp("completion_marked_at", { withTimezone: true }),
  feedbackRequestedAt: timestamp("feedback_requested_at", { withTimezone: true }),
  feedbackSubmittedAt: timestamp("feedback_submitted_at", { withTimezone: true }),
  paidCredits: integer("paid_credits").default(0).notNull(),
  paymentMethod: demoPaymentMethodEnum("payment_method").default("bonus_credits").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_booking_idx").on(table.roomId, table.userId),
]);

export const roomSessionFeedback = pgTable("room_session_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  expertId: uuid("expert_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  bookingId: uuid("booking_id").references(() => roomBookings.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  applyToExpertProfile: boolean("apply_to_expert_profile").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("room_session_feedback_unique_idx").on(table.roomId, table.reviewerId),
  index("room_session_feedback_room_idx").on(table.roomId),
  index("room_session_feedback_expert_idx").on(table.expertId),
]);

// ==========================================
// LEARNING PLANS
// ==========================================
export const learningPlans = pgTable("learning_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id").references(() => users.id, { onDelete: "cascade" }),
  expertId: uuid("expert_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  goal: text("goal"),
  status: learningPlanStatusEnum("status").default("draft").notNull(),
  completionMode: varchar("completion_mode", { length: 32 }).default("fixed_curriculum").notNull(),
  requiredLessonCount: integer("required_lesson_count"),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  visibility: learningPlanVisibilityEnum("visibility").default("private").notNull(),
  totalLessons: integer("total_lessons").default(0).notNull(),
  completedLessons: integer("completed_lessons").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("learning_plan_learner_idx").on(table.learnerId),
  index("learning_plan_expert_idx").on(table.expertId),
  index("learning_plan_topic_idx").on(table.topicId),
]);

export const learningPlanMembers = pgTable("learning_plan_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").references(() => learningPlans.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  addedBy: uuid("added_by").references(() => users.id, { onDelete: "set null" }),
  role: learningPlanMemberRoleEnum("role").default("learner").notNull(),
  status: learningPlanMemberStatusEnum("status").default("invited").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("learning_plan_member_unique_idx").on(table.planId, table.userId),
  index("learning_plan_member_plan_idx").on(table.planId),
  index("learning_plan_member_user_idx").on(table.userId),
]);

export const learningPlanLessons = pgTable("learning_plan_lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").references(() => learningPlans.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  summary: text("summary"),
  objective: text("objective"),
  status: lessonStatusEnum("status").default("planned").notNull(),
  position: integer("position").default(0).notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  durationMinutes: integer("duration_minutes"),
  reminderThirtySentAt: timestamp("reminder_thirty_sent_at", { withTimezone: true }),
  reminderFiveSentAt: timestamp("reminder_five_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("learning_plan_lesson_plan_idx").on(table.planId),
  uniqueIndex("learning_plan_lesson_position_idx").on(table.planId, table.position),
]);

export const learningPlanLessonProgress = pgTable("learning_plan_lesson_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  planMemberId: uuid("plan_member_id").references(() => learningPlanMembers.id, { onDelete: "cascade" }).notNull(),
  lessonId: uuid("lesson_id").references(() => learningPlanLessons.id, { onDelete: "cascade" }).notNull(),
  status: learningPlanLessonProgressStatusEnum("status").default("not_started").notNull(),
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("learning_plan_lesson_progress_unique_idx").on(table.planMemberId, table.lessonId),
  index("learning_plan_lesson_progress_member_idx").on(table.planMemberId),
  index("learning_plan_lesson_progress_lesson_idx").on(table.lessonId),
]);

export const sessionArchives = pgTable("session_archives", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull().unique(),
  planId: uuid("plan_id").references(() => learningPlans.id, { onDelete: "set null" }),
  lessonId: uuid("lesson_id").references(() => learningPlanLessons.id, { onDelete: "set null" }),
  hostId: uuid("host_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  recordingUrl: text("recording_url"),
  boardImageDataUrl: text("board_image_data_url"),
  summary: jsonb("summary").$type<Record<string, unknown>>().default({}).notNull(),
  skillLevel: varchar("skill_level", { length: 20 }),
  agenda: text("agenda").array().notNull().default([]),
  notes: jsonb("notes").$type<Record<string, unknown>>().default({}).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("session_archive_host_idx").on(table.hostId),
  index("session_archive_plan_idx").on(table.planId),
]);

export const learningResources = pgTable("learning_resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").references(() => learningPlans.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => learningPlanLessons.id, { onDelete: "cascade" }),
  sessionArchiveId: uuid("session_archive_id").references(() => sessionArchives.id, { onDelete: "cascade" }),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: resourceTypeEnum("type").default("doc").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  url: text("url"),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("learning_resource_plan_idx").on(table.planId),
  index("learning_resource_lesson_idx").on(table.lessonId),
  index("learning_resource_session_archive_idx").on(table.sessionArchiveId),
]);

// ==========================================
// DEMO CREDIT WALLETS
// ==========================================
export const creditWallets = pgTable("credit_wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  balance: integer("balance").default(0).notNull(),
  bonusGrantedAt: timestamp("bonus_granted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("credit_wallet_user_idx").on(table.userId),
]);

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  counterpartyUserId: uuid("counterparty_user_id").references(() => users.id, { onDelete: "set null" }),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
  bookingId: uuid("booking_id").references(() => roomBookings.id, { onDelete: "set null" }),
  type: creditTransactionTypeEnum("type").notNull(),
  direction: creditTransactionDirectionEnum("direction").notNull(),
  amount: integer("amount").notNull(),
  paymentMethod: demoPaymentMethodEnum("payment_method").default("bonus_credits").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("credit_transaction_user_idx").on(table.userId),
  index("credit_transaction_room_idx").on(table.roomId),
  index("credit_transaction_booking_idx").on(table.bookingId),
]);

// ==========================================
// CONVERSATIONS
// ==========================================
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: conversationTypeEnum("type").default("direct").notNull(),
  participantA: uuid("participant_a").references(() => users.id, { onDelete: "cascade" }),
  participantB: uuid("participant_b").references(() => users.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  imageUrl: text("image_url"),
  lastMessagePreview: text("last_message_preview"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_conversation_idx").on(table.participantA, table.participantB),
  index("conversation_group_idx").on(table.groupId),
  index("conversation_last_message_idx").on(table.lastMessageAt),
]);

// ==========================================
// CONVERSATION PARTICIPANTS
// ==========================================
export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: conversationMemberRoleEnum("role").default("member").notNull(),
  canMessage: boolean("can_message").default(true).notNull(),
  notificationsMuted: boolean("notifications_muted").default(false).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  lastReadAt: timestamp("last_read_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("unique_conversation_member_idx").on(table.conversationId, table.userId),
  index("conversation_member_user_idx").on(table.userId),
]);

// ==========================================
// USER SETTINGS
// ==========================================
export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  discoveryIntent: discoveryIntentEnum("discovery_intent"),
  allowDirectMessages: boolean("allow_direct_messages").default(true).notNull(),
  directMessagePrivacy: messagePrivacyEnum("direct_message_privacy").default("everyone").notNull(),
  allowGroupInvites: boolean("allow_group_invites").default(true).notNull(),
  showTypingIndicators: boolean("show_typing_indicators").default(true).notNull(),
  showReadReceipts: boolean("show_read_receipts").default(true).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  inAppNotifications: boolean("in_app_notifications").default(true).notNull(),
  profileVisibility: profileVisibilityEnum("profile_visibility").default("community").notNull(),
  searchableProfile: boolean("searchable_profile").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("user_settings_user_idx").on(table.userId),
]);

// ==========================================
// CONNECTIONS
// ==========================================
export const connections = pgTable("connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: uuid("requester_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  addresseeId: uuid("addressee_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_connection_idx").on(table.requesterId, table.addresseeId),
  index("connection_addressee_idx").on(table.addresseeId),
]);

// ==========================================
// EXPERT REVIEWS
// ==========================================
export const expertReviews = pgTable("expert_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  expertId: uuid("expert_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_expert_review_idx").on(table.expertId, table.reviewerId),
  index("expert_review_expert_idx").on(table.expertId),
]);

// ==========================================
// EXPERT APPLICATIONS
// ==========================================
export const expertApplications = pgTable("expert_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  headline: varchar("headline", { length: 150 }).notNull(),
  bio: text("bio").notNull(),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  credentialUrl: text("credential_url"),
  yearsExperience: integer("years_experience").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reviewNote: text("review_note"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (table) => [
  index("expert_application_user_idx").on(table.userId),
]);

// ==========================================
// NOTIFICATIONS
// ==========================================
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  type: notificationTypeEnum("type").default("system").notNull(),
  entityType: notificationEntityTypeEnum("entity_type").default("system").notNull(),
  entityId: uuid("entity_id"),
  actionUrl: text("action_url"),
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("notification_user_idx").on(table.userId),
]);

// ==========================================
// SECURITY AUDIT LOGS
// ==========================================
export const securityAuditLogs = pgTable("security_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  event: varchar("event", { length: 120 }).notNull(),
  level: varchar("level", { length: 20 }).default("warn").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  targetId: varchar("target_id", { length: 255 }),
  route: varchar("route", { length: 255 }),
  reason: text("reason"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("security_audit_logs_event_idx").on(table.event),
  index("security_audit_logs_user_idx").on(table.userId),
  index("security_audit_logs_created_idx").on(table.createdAt),
]);

// ==========================================
// OPERATIONAL EVENTS
// ==========================================
export const operationalEvents = pgTable("operational_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  event: varchar("event", { length: 120 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  scope: varchar("scope", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }),
  entityId: varchar("entity_id", { length: 255 }),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("operational_events_event_idx").on(table.event),
  index("operational_events_status_idx").on(table.status),
  index("operational_events_created_idx").on(table.createdAt),
]);
