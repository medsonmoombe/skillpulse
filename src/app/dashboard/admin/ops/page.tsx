import { db } from "@/db";
import { operationalEvents, securityAuditLogs } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, ShieldAlert, Activity } from "lucide-react";

// Check tables exist before querying — they may not be migrated yet in all envs
async function tableExists(name: string) {
  const result = await db.execute<{ exists: boolean }>(sql`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = ${name}
    ) as "exists"
  `).catch(() => [{ exists: false }]);
  return Boolean(result[0]?.exists);
}

export default async function AdminOpsPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/dashboard");

  const [hasOps, hasSecurity] = await Promise.all([
    tableExists("operational_events"),
    tableExists("security_audit_logs"),
  ]);

  const [failedEvents, recentEvents, securityEvents, eventSummary] = await Promise.all([
    hasOps
      ? db.select().from(operationalEvents)
          .where(eq(operationalEvents.status, "failed"))
          .orderBy(desc(operationalEvents.createdAt))
          .limit(50)
      : Promise.resolve([]),

    hasOps
      ? db.select().from(operationalEvents)
          .orderBy(desc(operationalEvents.createdAt))
          .limit(100)
      : Promise.resolve([]),

    hasSecurity
      ? db.select().from(securityAuditLogs)
          .orderBy(desc(securityAuditLogs.createdAt))
          .limit(100)
      : Promise.resolve([]),

    hasOps
      ? db.select({
          status: operationalEvents.status,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(operationalEvents)
        .groupBy(operationalEvents.status)
      : Promise.resolve([]),
  ]);

  const counts = {
    pending: eventSummary.find((r) => r.status === "pending")?.count ?? 0,
    success: eventSummary.find((r) => r.status === "success")?.count ?? 0,
    failed: eventSummary.find((r) => r.status === "failed")?.count ?? 0,
  };

  const securityByLevel = {
    error: securityEvents.filter((e) => e.level === "error").length,
    warn: securityEvents.filter((e) => e.level === "warn").length,
    info: securityEvents.filter((e) => e.level === "info").length,
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Ops &amp; Audit Log</h2>
          <p className="text-sm text-slate-500 mt-0.5">Operational events, failures, and security audit trail.</p>
        </div>
        {hasOps && failedEvents.length > 0 && (
          <form action="/api/admin/retry-outbox" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry {failedEvents.length} Failed
            </button>
          </form>
        )}
      </div>

      {!hasOps && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center bg-white">
          <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Migration pending</p>
          <p className="text-xs text-slate-400 mt-1">Run <code className="bg-slate-100 px-1 rounded">npx drizzle-kit migrate</code> to enable operational event logging.</p>
        </div>
      )}

      {hasOps && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Successful", value: counts.success, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
              { label: "Pending", value: counts.pending, icon: Clock, color: "text-amber-600 bg-amber-50" },
              { label: "Failed", value: counts.failed, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
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

          {/* Failed events */}
          {failedEvents.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Failed Events
                <Badge className="bg-red-100 text-red-700 border-0">{failedEvents.length}</Badge>
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {failedEvents.map((ev) => (
                    <div key={ev.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900">{ev.event}</span>
                            <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px]">{ev.scope}</Badge>
                            {ev.entityType && <Badge className="bg-indigo-50 text-indigo-600 border-0 text-[10px]">{ev.entityType}</Badge>}
                          </div>
                          {ev.lastError && (
                            <p className="text-xs text-red-600 mt-1 font-mono truncate">{ev.lastError}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(ev.createdAt).toLocaleString()}</p>
                        </div>
                        <Badge className="bg-red-100 text-red-700 border-0 shrink-0">failed</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Recent event log */}
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              Recent Events (last 100)
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {recentEvents.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No events recorded yet.</p>
                ) : recentEvents.map((ev) => (
                  <div key={ev.id} className="px-5 py-2.5 flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      ev.status === "success" ? "bg-emerald-400" :
                      ev.status === "failed" ? "bg-red-400" : "bg-amber-400"
                    }`} />
                    <span className="text-sm text-slate-800 font-medium truncate flex-1">{ev.event}</span>
                    <span className="text-xs text-slate-400 shrink-0">{ev.scope}</span>
                    <span className="text-xs text-slate-400 shrink-0">{new Date(ev.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Security Audit Log */}
      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-500" />
          Security Audit Log (last 100)
          {securityByLevel.error > 0 && (
            <Badge className="bg-red-100 text-red-700 border-0">{securityByLevel.error} errors</Badge>
          )}
        </h2>

        {!hasSecurity ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center bg-white">
            <p className="text-sm text-slate-400">Security audit log table not yet migrated.</p>
          </div>
        ) : securityEvents.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 py-8 text-center bg-white">
            <p className="text-sm text-slate-400">No security events recorded.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {securityEvents.map((ev) => (
                <div key={ev.id} className="px-5 py-2.5 flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    ev.level === "error" ? "bg-red-400" :
                    ev.level === "warn" ? "bg-amber-400" : "bg-slate-300"
                  }`} />
                  <span className="text-sm text-slate-800 font-medium truncate flex-1">{ev.event}</span>
                  {ev.reason && <span className="text-xs text-slate-500 truncate max-w-xs">{ev.reason}</span>}
                  {ev.route && <span className="text-xs text-slate-400 font-mono shrink-0">{ev.route}</span>}
                  <span className="text-xs text-slate-400 shrink-0">{new Date(ev.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
