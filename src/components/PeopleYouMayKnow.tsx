"use client";

import { useState } from "react";
import { sendConnectionRequest } from "@/app/actions/connections";
import { UserPlus, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useToast } from "@/components/ui/toast-provider";

type Person = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
};

function ConnectBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
      Connect
    </button>
  );
}

export function PeopleYouMayKnow({ people }: { people: Person[]; currentUserId: string }) {
  const [filter, setFilter] = useState<"all" | "learner" | "expert">("all");
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  const filtered = people.filter((p) => filter === "all" || p.role === filter);

  if (people.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">People You May Know</h2>
          <p className="text-sm text-slate-500 mt-0.5">Users with shared interests on SkillPulse</p>
        </div>
        <div className="flex gap-1.5">
          {(["all", "learner", "expert"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
              }`}>
              {f === "all" ? "All" : f === "learner" ? "Learners" : "Experts"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-6 text-center bg-white">
          <p className="text-sm text-slate-400">No {filter === "all" ? "people" : filter + "s"} to suggest right now</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((person) => (
            <div key={person.userId} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 px-4 py-3 hover:border-slate-300 transition-all">
              <Link href={`/profile/${person.userId}`} className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white hover:opacity-80 transition-opacity">
                {person.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  person.displayName.charAt(0).toUpperCase()
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${person.userId}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate block">
                  {person.displayName}
                </Link>
                <span className={`text-[10px] font-semibold capitalize ${person.role === "expert" ? "text-emerald-600" : "text-amber-600"}`}>
                  {person.role}
                </span>
              </div>
              {connected.has(person.userId) ? (
                <span className="text-xs text-emerald-600 font-semibold">Sent ✓</span>
              ) : (
                <form action={async (fd) => {
                  try {
                    await sendConnectionRequest(fd);
                    setConnected((prev) => new Set([...prev, person.userId]));
                    showToast(`Connection request sent to ${person.displayName}.`, "success");
                  } catch (error) {
                    console.error("[PeopleYouMayKnow] connect error:", error);
                    showToast("Could not send connection request. Please try again.", "error");
                  }
                }}>
                  <input type="hidden" name="addresseeId" value={person.userId} />
                  <ConnectBtn />
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
