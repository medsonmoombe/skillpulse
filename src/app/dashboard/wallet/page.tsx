import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { getWalletSnapshot } from "@/lib/demo-wallet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Coins, ArrowDownLeft, ArrowUpRight, Smartphone,
  Info, TrendingUp, TrendingDown, Wallet,
} from "lucide-react";

const METHOD_META: Record<string, { label: string; color: string; dot: string }> = {
  bonus_credits: { label: "Bonus Credits", color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  airtel_money:  { label: "Airtel Money",  color: "bg-red-100 text-red-700",    dot: "bg-red-500"    },
  mtn_money:     { label: "MTN Money",     color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-400" },
  zamtel_money:  { label: "Zamtel Kwacha", color: "bg-green-100 text-green-700", dot: "bg-green-500"  },
  zed_mobile:    { label: "Zed Mobile",    color: "bg-blue-100 text-blue-700",  dot: "bg-blue-500"   },
};

const PROVIDERS = [
  { name: "Airtel Money",  tagline: "Airtel Zambia",  bg: "from-red-500 to-rose-600",      initials: "AM" },
  { name: "MTN Money",     tagline: "MTN Zambia",     bg: "from-yellow-400 to-amber-500",  initials: "MM" },
  { name: "Zamtel Kwacha", tagline: "Zamtel Zambia",  bg: "from-green-500 to-emerald-600", initials: "ZK" },
  { name: "Zed Mobile",    tagline: "Zed Mobile Pay", bg: "from-blue-500 to-indigo-600",   initials: "ZM" },
];

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { wallet, recentTransactions } = await getWalletSnapshot(user.id);

  const totalEarned = recentTransactions.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  const totalSpent  = recentTransactions.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Skill Credits</h1>
          <p className="mt-1 text-sm text-slate-500">Your demo wallet — no real money involved.</p>
        </div>
        <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1.5 px-3 py-1.5">
          <Info size={12} /> Demo Mode
        </Badge>
      </div>

      {/* Balance hero card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-7 text-white shadow-xl shadow-indigo-500/25">
        <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white/5" />
        <div className="absolute right-8 top-8 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 text-indigo-300">
            <Coins size={15} />
            <span className="text-xs font-semibold uppercase tracking-widest">Available Balance</span>
          </div>
          <p className="mt-3 text-6xl font-extrabold tracking-tight">
            {wallet.balance.toLocaleString()}
          </p>
          <p className="mt-1 text-sm font-medium text-indigo-300">Skill Credits</p>
          <div className="mt-6 flex gap-6 border-t border-white/10 pt-5">
            <div>
              <p className="text-xs text-indigo-400">Total Earned</p>
              <p className="mt-0.5 text-xl font-bold">+{totalEarned.toLocaleString()}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-xs text-indigo-400">Total Spent</p>
              <p className="mt-0.5 text-xl font-bold">-{totalSpent.toLocaleString()}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-xs text-indigo-400">Transactions</p>
              <p className="mt-0.5 text-xl font-bold">{recentTransactions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Current Balance", value: wallet.balance.toLocaleString(), icon: Wallet,       color: "text-indigo-600", bg: "bg-indigo-50",  sub: "credits available"  },
          { label: "Total Earned",    value: `+${totalEarned.toLocaleString()}`, icon: TrendingUp,  color: "text-emerald-600", bg: "bg-emerald-50", sub: "from sessions"      },
          { label: "Total Spent",     value: `-${totalSpent.toLocaleString()}`,  icon: TrendingDown, color: "text-rose-500",   bg: "bg-rose-50",    sub: "on bookings"        },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="pt-5 pb-4">
              <div className={`h-10 w-10 rounded-2xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Demo notice */}
      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Info size={15} className="text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">How Skill Credits work</p>
          <p className="mt-1 text-sm text-amber-800 leading-relaxed">
            Every new user starts with <strong>1,000 bonus credits</strong>. Use them to book expert sessions.
            Experts earn credits when learners book their sessions. Mobile money screens are UI simulations only —
            no real funds are processed.
          </p>
        </div>
      </div>

      {/* Payment providers */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Supported Payment Methods (Demo)
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PROVIDERS.map((p) => (
            <div
              key={p.name}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md"
            >
              <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${p.bg} flex items-center justify-center mb-3 shadow-sm`}>
                <span className="text-xs font-extrabold text-white">{p.initials}</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{p.tagline}</p>
              <Badge className="mt-2 border-0 bg-slate-100 text-slate-500 text-[10px] hover:bg-slate-100">
                Demo only
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Recent Transactions
          </p>
          <Badge className="border-0 bg-slate-100 text-slate-500 hover:bg-slate-100">
            {recentTransactions.length} total
          </Badge>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Coins className="h-6 w-6 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">No transactions yet</p>
            <p className="mt-1 text-sm text-slate-400">Book a session to see your credit activity here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-50">
              {recentTransactions.map((tx) => {
                const isCredit = tx.direction === "credit";
                const meta = METHOD_META[tx.paymentMethod] ?? { label: tx.paymentMethod, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
                return (
                  <div key={tx.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50/60">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isCredit ? "bg-emerald-50" : "bg-rose-50"}`}>
                      {isCredit
                        ? <ArrowDownLeft size={18} className="text-emerald-600" />
                        : <ArrowUpRight size={18} className="text-rose-500" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {tx.description ?? tx.type.replace(/_/g, " ")}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <p className={`shrink-0 text-base font-extrabold ${isCredit ? "text-emerald-600" : "text-rose-500"}`}>
                      {isCredit ? "+" : "−"}{tx.amount.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
