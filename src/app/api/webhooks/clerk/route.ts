// src/app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function POST(req: Request) {
  // 1. Get the headers Clerk needs for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // 2. If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // 3. Get the raw body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // 4. Create a new Svix instance with your secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  let evt: WebhookEvent;

  // 5. Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // 6. Handle the webhook event
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    // Generate a username (fallback to email prefix + random string if no name)
    const email = email_addresses[0].email_address;
    const fullName = [first_name, last_name].filter(Boolean).join(" ");
    const username = email.split("@")[0] + Math.random().toString(36).substring(7);

    try {
      // Insert into our Supabase database!
      await db.insert(users).values({
        clerkId: id,
        email: email,
        username: username,
        displayName: fullName || "Anonymous User",
        avatarUrl: image_url,
        role: "learner", // Default role
      });

      console.log(`✅ User ${id} created in database!`);
    } catch (error) {
      console.error("Error inserting user to database:", error);
      return new Response("Error inserting user", { status: 500 });
    }
  }

  return new Response("", { status: 200 });
}