import { db } from "@/db";
import { users, expertApplications, articles } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  approveApplication, rejectApplication,
  suspendUser, unsuspendUser, setUserRole,
} from "@/app/actions/admin";
import { DeleteUserForm } from "@/components/DeleteUserForm";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, XCircle, Users, ShieldCheck, Clock,
  ExternalLink, Ban, UserCheck, BookOpen,
} from "lucide-react";
import Link from "next/link";
import { AdminActionButton } from "@/components/AdminActionButton";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/dashboard");

  const [allUsers, applications, allArticles] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)),
    db
      .select({
        id: expertApplications.id,
        userId: expertApplications.userId,
        headline: expertApplications.headline,
        bio: expertApplications.bio,
        linkedinUrl: expertApplications.linkedinUrl,
        portfolioUrl: expertApplications.portfolioUrl,
        credentialUrl: expertApplications.credentialUrl,
        yearsExperience: expertApplications.yearsExperience,
        status: expertApplications.status,
        submittedAt: expertApplications.submittedAt,
        reviewNote: expertApplications.reviewNote,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(expertApplications)
      .leftJoin(users, eq(expertApplications.userId, users.id))
      .orderBy(desc(expertApplications.submittedAt)),
    db
      .select({ id: articles.id, title: articles.title, authorId: articles.authorId, published: articles.published, createdAt: articles.createdAt })
      .from(articles)
      .orderBy(desc(articles.createdAt))
      .limit(20),
  ]);

  const pending  = applications.filter((a) => a.status === "pending");
  const reviewed = applications.filter((a) => a.status !== "pending");
  const suspended = allUsers.filter((u) => u.isSuspended);

  return (
    <div className="space-y-8">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Users",  value: allUsers.length,                              icon: Users,      color: "text-indigo-600 bg-indigo-50"  },
          { label: "Experts",      value: allUsers.filter((u) => u.role === "expert").length, icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
          { label: "Suspended",    value: suspended.length,                             icon: Ban,        color: "text-red-600 bg-red-50"        },
          { label: "Pending Apps", value: pending.length,                               icon: Clock,      color: "text-amber-600 bg-amber-50"    },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Expert Applications */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          Expert Applications
          {pending.length > 0 && (
            <Badge className="border-0 bg-amber-100 text-amber-700">{pending.length} pending</Badge>
          )}
        </h2>

        {pending.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-8 text-center">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
            <p className="text-sm text-slate-500">No pending applications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((app) => (
              <div key={app.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{app.userName}</p>
                    <p className="text-xs text-slate-500">{app.userEmail}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{app.headline}</p>
                    <p className="text-xs text-slate-500">{app.yearsExperience} yrs experience</p>
                  </div>
                  <Link href={`/profile/${app.userId}`} className="flex shrink-0 items-center gap-1 text-xs text-indigo-600 hover:underline">
                    Profile <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <p className="text-sm leading-relaxed text-slate-600">{app.bio}</p>

                <div className="flex flex-wrap gap-2 text-xs">
                  {app.linkedinUrl  && <a href={app.linkedinUrl}  target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">LinkedIn ↗</a>}
                  {app.portfolioUrl && <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Portfolio ↗</a>}
                  {app.credentialUrl && <a href={app.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Credential ↗</a>}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                  <AdminActionButton
                    action={approveApplication}
                    fields={{ userId: app.userId }}
                    label="Approve"
                    pendingLabel="Approving…"
                    icon="check"
                    variant="emerald"
                  />
                  <form action={rejectApplication} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={app.userId} />
                    <input
                      name="note"
                      placeholder="Rejection reason (optional)"
                      className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-red-300"
                    />
                    <AdminActionButton
                      action={rejectApplication}
                      fields={{ userId: app.userId }}
                      label="Reject"
                      pendingLabel="Rejecting…"
                      icon="x"
                      variant="red"
                      asChild
                    />
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {reviewed.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
              Show {reviewed.length} reviewed
            </summary>
            <div className="mt-3 space-y-2">
              {reviewed.map((app) => (
                <div key={app.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{app.userName}</p>
                    <p className="text-xs text-slate-500">{app.headline}</p>
                  </div>
                  <Badge className={app.status === "approved" ? "border-0 bg-emerald-100 text-emerald-700" : "border-0 bg-red-100 text-red-700"}>
                    {app.status}
                  </Badge>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* User Management */}
      <section>
        <h2 className="mb-4 text-base font-bold text-slate-900">User Management</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {allUsers.map((u) => (
              <div
                key={u.id}
                className={`px-5 py-4 transition-colors ${u.isSuspended ? "bg-red-50/50" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-3">
                  <Link
                    href={`/profile/${u.id}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white transition hover:opacity-80"
                  >
                    {u.displayName.charAt(0).toUpperCase()}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/profile/${u.id}`} className="truncate text-sm font-semibold text-slate-900 transition hover:text-indigo-600">
                        {u.displayName}
                      </Link>
                      {u.isAdmin && <Badge className="border-0 bg-slate-900 text-[10px] text-white">Admin</Badge>}
                      {u.isSuspended && (
                        <Badge className="flex items-center gap-1 border-0 bg-red-100 text-[10px] text-red-700">
                          <Ban className="h-2.5 w-2.5" /> Suspended
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-400">
                      {u.email} · {u.role} · joined {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {u.id !== user.id && !u.isAdmin && (
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <AdminActionButton
                          action={setUserRole}
                          fields={{ userId: u.id, role: u.role === "expert" ? "learner" : "expert" }}
                          label={u.role === "expert" ? "→ Learner" : "→ Expert"}
                          pendingLabel="…"
                          icon="user"
                          variant="outline"
                          size="xs"
                        />
                        {u.isSuspended ? (
                          <AdminActionButton
                            action={unsuspendUser}
                            fields={{ userId: u.id }}
                            label="Unsuspend"
                            pendingLabel="…"
                            icon="check"
                            variant="emerald-outline"
                            size="xs"
                          />
                        ) : (
                          <AdminActionButton
                            action={suspendUser}
                            fields={{ userId: u.id }}
                            label="Suspend"
                            pendingLabel="…"
                            icon="ban"
                            variant="amber-outline"
                            size="xs"
                          />
                        )}
                        <DeleteUserForm userId={u.id} displayName={u.displayName} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Articles */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <BookOpen className="h-4 w-4 text-slate-400" />
          Recent Articles
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {allArticles.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(a.createdAt).toLocaleDateString()} · {a.published ? "Published" : "Draft"}
                  </p>
                </div>
                <Link href={`/dashboard/articles/${a.id}/edit`} className="ml-3 shrink-0 text-xs text-indigo-600 hover:underline">
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
