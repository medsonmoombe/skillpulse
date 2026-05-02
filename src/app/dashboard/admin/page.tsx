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
  ExternalLink, Ban, Trash2, UserCheck, AlertTriangle,
} from "lucide-react";
import Link from "next/link";

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
    db.select({ id: articles.id, title: articles.title, authorId: articles.authorId, published: articles.published, createdAt: articles.createdAt })
      .from(articles).orderBy(desc(articles.createdAt)).limit(20),
  ]);

  const pending = applications.filter((a) => a.status === "pending");
  const reviewed = applications.filter((a) => a.status !== "pending");
  const suspended = allUsers.filter((u) => u.isSuspended);

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Super Admin</p>
            <h1 className="text-xl font-bold text-slate-900">Platform Control Center</h1>
          </div>
        </div>
        <p className="text-sm text-slate-500">Full platform management. Only visible to you.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: allUsers.length, icon: Users, color: "text-indigo-600 bg-indigo-50" },
          { label: "Experts", value: allUsers.filter(u => u.role === "expert").length, icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
          { label: "Suspended", value: suspended.length, icon: Ban, color: "text-red-600 bg-red-50" },
          { label: "Pending Apps", value: pending.length, icon: Clock, color: "text-amber-600 bg-amber-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Expert Applications */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          Expert Applications
          {pending.length > 0 && <Badge className="bg-amber-100 text-amber-700 border-0">{pending.length} pending</Badge>}
        </h2>

        {pending.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center bg-white">
            <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No pending applications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{app.userName}</p>
                    <p className="text-xs text-slate-500">{app.userEmail}</p>
                    <p className="text-sm font-medium text-slate-700 mt-1">{app.headline}</p>
                    <p className="text-xs text-slate-500">{app.yearsExperience} yrs experience</p>
                  </div>
                  <Link href={`/profile/${app.userId}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 shrink-0">
                    Profile <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{app.bio}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {app.linkedinUrl && <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">LinkedIn ↗</a>}
                  {app.portfolioUrl && <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Portfolio ↗</a>}
                  {app.credentialUrl && <a href={app.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Credential ↗</a>}
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                  <form action={approveApplication}>
                    <input type="hidden" name="userId" value={app.userId} />
                    <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
                      <CheckCircle className="h-4 w-4" /> Approve
                    </button>
                  </form>
                  <form action={rejectApplication} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={app.userId} />
                    <input name="note" placeholder="Rejection reason (optional)" className="text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-300 w-44" />
                    <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {reviewed.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">Show {reviewed.length} reviewed</summary>
            <div className="mt-3 space-y-2">
              {reviewed.map((app) => (
                <div key={app.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{app.userName}</p>
                    <p className="text-xs text-slate-500">{app.headline}</p>
                  </div>
                  <Badge className={app.status === "approved" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-red-100 text-red-700 border-0"}>{app.status}</Badge>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* User Management */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4">User Management</h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {allUsers.map((u) => (
              <div key={u.id} className={`px-5 py-4 ${u.isSuspended ? "bg-red-50/50" : "hover:bg-slate-50"} transition-colors`}>
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${u.id}`} className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0 hover:opacity-80 transition-opacity">
                    {u.displayName.charAt(0).toUpperCase()}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/profile/${u.id}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate">
                        {u.displayName}
                      </Link>
                      {u.isAdmin && <Badge className="bg-slate-900 text-white border-0 text-[10px]">Admin</Badge>}
                      {u.isSuspended && <Badge className="bg-red-100 text-red-700 border-0 text-[10px] flex items-center gap-1"><Ban className="h-2.5 w-2.5" />Suspended</Badge>}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{u.email} · {u.role} · joined {new Date(u.createdAt).toLocaleDateString()}</p>
                  </div>

                  {/* Actions — skip self */}
                  {u.id !== user.id && !u.isAdmin && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Role toggle */}
                      <form action={setUserRole}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="role" value={u.role === "expert" ? "learner" : "expert"} />
                        <button type="submit" className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                          <UserCheck className="h-3.5 w-3.5" />
                          {u.role === "expert" ? "→ Learner" : "→ Expert"}
                        </button>
                      </form>

                      {/* Suspend / Unsuspend */}
                      {u.isSuspended ? (
                        <form action={unsuspendUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button type="submit" className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                            <CheckCircle className="h-3.5 w-3.5" /> Unsuspend
                          </button>
                        </form>
                      ) : (
                        <form action={suspendUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button type="submit" className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
                            <Ban className="h-3.5 w-3.5" /> Suspend
                          </button>
                        </form>
                      )}

                      {/* Delete */}
                      <DeleteUserForm userId={u.id} displayName={u.displayName} />
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
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Articles</h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {allArticles.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                  <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString()} · {a.published ? "Published" : "Draft"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Link href={`/dashboard/articles/${a.id}/edit`} className="text-xs text-indigo-600 hover:underline">Edit</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
