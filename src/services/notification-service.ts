import { db } from "@/db";
import { notifications } from "@/db/schema";

export const NotificationService = {
  async create({
    userId,
    title,
    message,
    type,
    entityId,
  }: {
    userId: string;
    title: string;
    message?: string;
    type: "booking" | "session_start" | "admit";
    entityId?: string;
  }) {
    try {
      await db.insert(notifications).values({ userId, title, message, type, entityId });
    } catch (err) {
      console.error("Failed to create notification:", err);
    }
  },
};
