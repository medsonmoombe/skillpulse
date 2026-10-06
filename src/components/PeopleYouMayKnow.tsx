"use client";

import { useState } from "react";
import { sendConnectionRequest } from "@/app/actions/connections";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useToast } from "@/components/ui/toast-provider";
import { appName } from "@/data/constant";

type Person = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
};

function ConnectBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
      {pending ? "Sending…" : "Connect"}
    </button>
  );
}

export function PeopleYouMayKnow({ people }: { people: Person[]; currentUserId: string }) {
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  if (people.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">People You May Know</h2>
          <p className="mt-0.5 text-sm text-slate-500">Users with shared interests on {appName}</p>
        </div>
      </div>

      {/* Horizontal scroll row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {people.map((person) => (
          <div
            key={person.userId}
            className="flex w-36 shrink-0 flex-col items-center rounded-3xl border border-slate-200 bg-white p-4  transition hover:border-indigo-200 hover:shadow-md"
          >
            <Link href={`/profile/${person.userId}`} className="hover:opacity-80 transition-opacity">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 text-lg font-bold text-white shadow-sm">
                {person.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  person.displayName.charAt(0).toUpperCase()
                )}
              </div>
            </Link>

            <Link
              href={`/profile/${person.userId}`}
              className="mt-2 line-clamp-1 text-center text-xs font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
            >
              {person.displayName}
            </Link>
            <span className={`mt-0.5 text-[10px] font-medium capitalize ${
              person.role === "expert" ? "text-emerald-600" : "text-amber-600"
            }`}>
              {person.role}
            </span>

            {connected.has(person.userId) ? (
              <div className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Sent
              </div>
            ) : (
              <form
                action={async (fd) => {
                  try {
                    await sendConnectionRequest(fd);
                    setConnected((prev) => new Set([...prev, person.userId]));
                    showToast(`Request sent to ${person.displayName}.`, "success");
                  } catch {
                    showToast("Could not send request. Try again.", "error");
                  }
                }}
                className="w-full"
              >
                <input type="hidden" name="addresseeId" value={person.userId} />
                <ConnectBtn />
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
