import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/dashboard");

  return (
    <div className="space-y-6">
      {/* Admin header */}
      <div className="overflow-hidden rounded-3xl border border-slate-900 bg-slate-900 shadow-lg">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Super Admin</p>
              <h1 className="text-lg font-bold text-white">Platform Control Center</h1>
            </div>
            <span className="ml-auto rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-red-400">
              Admin Only
            </span>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex border-t border-white/10">
          {[
            { href: "/dashboard/admin",     label: "Users & Applications" },
            { href: "/dashboard/admin/ops", label: "Ops & Audit"          },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex-1 py-3 text-center text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}
