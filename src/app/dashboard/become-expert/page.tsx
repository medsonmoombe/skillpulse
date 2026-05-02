import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { expertApplications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BecomeExpertForm } from "@/components/BecomeExpertForm";
import { BadgeCheck, Sparkles, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function BecomeExpertPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role === "expert") redirect("/dashboard/settings");

  const [existing] = await db
    .select({ status: expertApplications.status, headline: expertApplications.headline })
    .from(expertApplications)
    .where(eq(expertApplications.userId, user.id));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Expert Program</p>
            <h1 className="text-2xl font-bold text-slate-900">Become an Expert</h1>
          </div>
        </div>
        <p className="text-slate-600 leading-relaxed">
          Share your knowledge, host live sessions, and get matched with learners who need exactly what you teach.
          Fill in your application below — our team reviews every submission within 48 hours.
        </p>

        {/* Benefits */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: Users, label: "Get matched with learners", color: "text-indigo-500 bg-indigo-50" },
            { icon: Zap, label: "Host live whiteboard sessions", color: "text-purple-500 bg-purple-50" },
            { icon: BadgeCheck, label: "Verified expert badge", color: "text-emerald-500 bg-emerald-50" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-slate-700">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Your Application</h2>
        <BecomeExpertForm existingApplication={existing ?? null} />
      </section>

      <div className="text-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
