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
// ==========================================
// USERS (The Base Identity)
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
// EXPERT PROFILES (The Pro Tier Extension)
// ==========================================
export const expertProfiles = pgTable("expert_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  headline: varchar("headline", { length: 150 }),
  introImageUrl: text("intro_image_url"),
  introVideoUrl: text("intro_video_url"),
  hourlyRateCents: integer("hourly_rate_cents").default(0),
  verificationStatus: verificationEnum("verification_status").default("pending").notNull(),
  ratingAvg: integer("rating_avg").default(0), // Stored as 0-100 to avoid float issues
  reviewCount: integer("review_count").default(0),
  availability: jsonb("availability").$type<Record<string, string[]>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// TOPICS (The Navigation Backbone)
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
// USER TOPICS (Many-to-Many)
// ==========================================
export const userTopics = pgTable("user_topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "cascade" }).notNull(),
  relationship: varchar("relationship", { length: 20 }).notNull(), // 'interested' or 'teaches'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_user_topic_idx").on(table.userId, table.topicId, table.relationship),
]);


// ==========================================
// ARTICLES (The SEO/Content Engine)
// ==========================================
export const articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(), // We will use Markdown for V1 simplicity
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
// ARTICLE INTERACTIONS (Reactions & Comments)
// ==========================================
export const articleInteractions = pgTable("article_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id").references(() => articles.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: articleInteractionEnum("type").notNull(),
  content: text("content"), // Only filled if type is 'comment'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("interaction_article_idx").on(table.articleId),
]);



// ==========================================
// GROUPS (The Community Hubs)
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
// GROUP MEMBERSHIPS (Who is in what group)
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
// GROUP POSTS (The Asynchronous Chat)
// ==========================================
export const groupPosts = pgTable("group_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  parentPostId: uuid("parent_post_id"), // For threaded replies later
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("post_group_idx").on(table.groupId),
]);

// Add to bottom of src/db/schema.ts

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
  hostId: uuid("host_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  livekitRoomId: varchar("livekit_room_id", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 20 }).default("active").notNull(), // 'active', 'ended', 'scheduled'
  maxParticipants: integer("max_participants"),
  hostLastPing: timestamp("host_last_ping", { withTimezone: true }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  autoAdmit: boolean("auto_admit").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("room_host_idx").on(table.hostId),
]);

export const roomBookings = pgTable("room_bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).default("booked").notNull(), 
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_booking_idx").on(table.roomId, table.userId),
]);

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

export const connections = pgTable("connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: uuid("requester_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  addresseeId: uuid("addressee_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, accepted, rejected
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_connection_idx").on(table.requesterId, table.addresseeId),
  index("connection_addressee_idx").on(table.addresseeId),
]);

export const expertReviews = pgTable("expert_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  expertId: uuid("expert_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_expert_review_idx").on(table.expertId, table.reviewerId),
  index("expert_review_expert_idx").on(table.expertId),
]);

export const expertApplications = pgTable("expert_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  headline: varchar("headline", { length: 150 }).notNull(),
  bio: text("bio").notNull(),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  credentialUrl: text("credential_url"), // certificate/degree upload URL
  yearsExperience: integer("years_experience").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, approved, rejected
  reviewNote: text("review_note"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (table) => [
  index("expert_application_user_idx").on(table.userId),
]);

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
