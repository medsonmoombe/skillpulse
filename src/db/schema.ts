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

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  type: varchar("type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("notification_user_idx").on(table.userId),
]);