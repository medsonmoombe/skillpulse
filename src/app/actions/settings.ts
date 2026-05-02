"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq } from "drizzle-orm";
import { discoveryIntentValues } from "@/lib/discovery-intent";
import { hasDiscoveryIntentColumn } from "@/lib/user-settings-compat";

const settingsSchema = z.object({
  discoveryIntent: z.enum(discoveryIntentValues),
  allowDirectMessages: z.boolean(),
  directMessagePrivacy: z.enum(["everyone", "matches_only", "nobody"]),
  allowGroupInvites: z.boolean(),
  showTypingIndicators: z.boolean(),
  showReadReceipts: z.boolean(),
  emailNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
  profileVisibility: z.enum(["public", "community", "private"]),
  searchableProfile: z.boolean(),
});

import type { SettingsActionState } from "./settings-types";

function getCheckboxValue(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export async function updateUserSettings(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      message: "You need to be signed in to update your settings.",
    };
  }

  const parsed = settingsSchema.safeParse({
    discoveryIntent: formData.get("discoveryIntent"),
    allowDirectMessages: getCheckboxValue(formData, "allowDirectMessages"),
    directMessagePrivacy: formData.get("directMessagePrivacy"),
    allowGroupInvites: getCheckboxValue(formData, "allowGroupInvites"),
    showTypingIndicators: getCheckboxValue(formData, "showTypingIndicators"),
    showReadReceipts: getCheckboxValue(formData, "showReadReceipts"),
    emailNotifications: getCheckboxValue(formData, "emailNotifications"),
    inAppNotifications: getCheckboxValue(formData, "inAppNotifications"),
    profileVisibility: formData.get("profileVisibility"),
    searchableProfile: getCheckboxValue(formData, "searchableProfile"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please review the settings fields and try again.",
    };
  }

  const supportsDiscoveryIntent = await hasDiscoveryIntentColumn();
  const { discoveryIntent, ...baseSettings } = parsed.data;

  await db
    .update(userSettings)
    .set({
      ...baseSettings,
      ...(supportsDiscoveryIntent ? { discoveryIntent } : {}),
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, user.id));

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Your settings have been updated.",
  };
}
