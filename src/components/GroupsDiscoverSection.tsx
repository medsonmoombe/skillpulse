"use client";

import { useState, useMemo } from "react";
import { Search, Users, Lock, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type Group = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  isPrivate: boolean;
  joinMode: string;
  memberCount: number;
  gradient: string;
};

export function GroupsDiscoverSection({ groups }: { groups: Group[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "approval">("all");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    let result = groups;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
    }
    if (filter === "open") result = result.filter((g) => g.joinMode === "open");
    if (filter === "approval") result = result.filter((g) => g.joinMode === "approval_required");
    return result;
  }, [groups, search, filter]);

  const displayed = showAll ? filtered : filtered.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Search + filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "open", "approval"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {f === "all" ? "All" : f === "open" ? "Open" : "Approval"}
            </button>
          ))}
        </div>
      </div>

      {/* Group cards — compact */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center bg-white">
          <p className="text-sm text-slate-400">No groups match your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((group) => (
            <div key={group.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:shadow-sm transition-all">
              {/* Avatar */}
              <div className={`h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br ${group.gradient} flex items-center justify-center`}>
                {group.coverImageUrl ? (
                  <Image src={group.coverImageUrl} alt={group.name} width={40} height={40} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">{group.name.charAt(0)}</span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-900 truncate">{group.name}</p>
                  {group.isPrivate && <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    group.joinMode === "approval_required" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {group.joinMode === "approval_required" ? "Approval" : "Open"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Users className="h-3 w-3" />
                  {group.memberCount} members
                </div>
              </div>

              {/* Action */}
              <Link
                href={`/dashboard/groups/${group.slug}`}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 transition-colors"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Show more / less */}
      {filtered.length > 5 && (
        <button
          onClick={() => setShowAll((p) => !p)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors mx-auto"
        >
          {showAll ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show {filtered.length - 5} more groups</>}
        </button>
      )}
    </div>
  );
}
