import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/currentUser";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FIVE_MB = 5 * 1024 * 1024;
const TWENTY_MB = 20 * 1024 * 1024;
const FIFTY_MB = 50 * 1024 * 1024;

const uploadRules = {
  avatar: {
    bucket: "chat-images",
    maxSize: FIVE_MB,
    accepts: [{ prefix: "image/" as const }],
    error: "Avatar must be an image under 5 MB.",
  },
  "intro-image": {
    bucket: "chat-images",
    maxSize: FIVE_MB,
    accepts: [{ prefix: "image/" as const }],
    error: "Intro image must be an image under 5 MB.",
  },
  "article-cover": {
    bucket: "chat-images",
    maxSize: FIVE_MB,
    accepts: [{ prefix: "image/" as const }],
    error: "Cover image must be an image under 5 MB.",
  },
  "group-cover": {
    bucket: "chat-images",
    maxSize: FIVE_MB,
    accepts: [{ prefix: "image/" as const }],
    error: "Cover image must be an image under 5 MB.",
  },
  "intro-video": {
    bucket: "chat-videos",
    maxSize: TWENTY_MB,
    accepts: [{ prefix: "video/" as const }],
    error: "Intro video must be a video under 20 MB.",
  },
  credential: {
    bucket: "chat-images",
    maxSize: FIFTY_MB,
    accepts: [
      { prefix: "image/" as const },
      { exact: "application/pdf" as const },
      { exact: "application/msword" as const },
      { exact: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const },
    ],
    error: "Credential must be an image, PDF, DOC, or DOCX under 50 MB.",
  },
} as const;

type UploadPurpose = keyof typeof uploadRules;

function matchesAllowedType(fileType: string, accepts: ReadonlyArray<{ prefix?: string; exact?: string }>) {
  return accepts.some((rule) => {
    if (rule.exact) return fileType === rule.exact;
    if (rule.prefix) return fileType.startsWith(rule.prefix);
    return false;
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const purpose = formData.get("purpose") as UploadPurpose | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!purpose || !(purpose in uploadRules)) {
    return NextResponse.json({ error: "Invalid upload purpose" }, { status: 400 });
  }

  const rule = uploadRules[purpose];

  if (!matchesAllowedType(file.type, rule.accepts) || file.size > rule.maxSize) {
    return NextResponse.json({ error: rule.error }, { status: 400 });
  }

  const ext = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(rule.bucket)
    .upload(fileName, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(rule.bucket).getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl, type: file.type, name: file.name, size: file.size });
}
