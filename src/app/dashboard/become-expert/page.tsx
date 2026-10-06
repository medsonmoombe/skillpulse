import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { expertApplications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BecomeExpertForm } from "@/components/BecomeExpertForm";
import { BadgeCheck, Sparkles, Users, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { appName } from "@/data/constant";

export default async function BecomeExpertPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role === "expert") redirect("/dashboard/settings");

  const [existing] = await db
    .select({ status: expertApplications.status, headline: expertApplications.headline })
    .from(expertApplications)
    .where(eq(expertApplications.userId, user.id));

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* Back link */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Become an Expert</h1>
          <p className="text-xs text-slate-500">Apply to teach and host live sessions on {appName}</p>
        </div>
      </div>

      {/* Hero card */}
      <div className="overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 shadow-sm">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-200">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Expert Program</p>
              <p className="text-sm font-bold text-slate-900">Join our community of educators</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Share your knowledge, host live whiteboard sessions, and get matched with learners who need exactly what you teach.
            Our team reviews every submission within 48 hours.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Users,     label: "Get matched with learners",    color: "bg-indigo-100 text-indigo-600" },
              { icon: Zap,       label: "Host live whiteboard sessions", color: "bg-purple-100 text-purple-600" },
              { icon: BadgeCheck,label: "Earn a verified expert badge",  color: "bg-emerald-100 text-emerald-600" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5 backdrop-blur-sm">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-medium text-slate-700">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application form */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">Your Application</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Fill in your details — the more complete your application, the faster we can verify you.
          </p>
        </div>
        <div className="p-6">
          <BecomeExpertForm existingApplication={existing ?? null} />
        </div>
      </div>

      <div className="text-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
