import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { connections, users } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { UserCheck, Clock, UserPlus, Users, GraduationCap, BadgeCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ConnectButton } from "@/components/ConnectButton";
import { StartConversationButton } from "@/components/StartConversationButton";

export default async function ConnectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const allConnections = await db
    .select({
      id: connections.id,
      status: connections.status,
      requesterId: connections.requesterId,
      addresseeId: connections.addresseeId,
      createdAt: connections.createdAt,
      otherDisplayName: users.displayName,
      otherAvatarUrl: users.avatarUrl,
      otherRole: users.role,
      otherId: users.id,
    })
    .from(connections)
    .innerJoin(
      users,
      or(
        and(eq(connections.requesterId, user.id), eq(users.id, connections.addresseeId)),
        and(eq(connections.addresseeId, user.id), eq(users.id, connections.requesterId))
      )
    )
    .where(or(eq(connections.requesterId, user.id), eq(connections.addresseeId, user.id)));

  const accepted  = allConnections.filter((c) => c.status === "accepted");
  const incoming  = allConnections.filter((c) => c.status === "pending" && c.addresseeId === user.id);
  const sent      = allConnections.filter((c) => c.status === "pending" && c.requesterId === user.id);

  // Split accepted by the other person's role
  const roleLabel = user.role === "expert" ? "learner" : "expert";
  const roleConnections = accepted.filter((c) => c.otherRole === roleLabel);
  const otherConnections = accepted.filter((c) => c.otherRole !== roleLabel);

  const PersonRow = ({ c }: { c: typeof allConnections[0] }) => (
    <div className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
      <Link href={`/profile/${c.otherId}`} className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white">
        {c.otherAvatarUrl
          ? <Image src={c.otherAvatarUrl} alt={c.otherDisplayName} width={40} height={40} className="h-full w-full object-cover" />
          : c.otherDisplayName.charAt(0).toUpperCase()
        }
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/profile/${c.otherId}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
          {c.otherDisplayName}
        </Link>
        <p className="text-xs capitalize text-slate-400">{c.otherRole}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {c.status === "accepted" && (
          <StartConversationButton targetUserId={c.otherId} label="Message" size="sm" variant="outline" />
        )}
        <ConnectButton
          targetUserId={c.otherId}
          currentUserId={user.id}
          connection={{ id: c.id, status: c.status, requesterId: c.requesterId }}
        />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Connections</h1>
        <p className="mt-1 text-sm text-slate-500">
          {accepted.length} connection{accepted.length !== 1 ? "s" : ""}
          {incoming.length > 0 && ` · ${incoming.length} pending request${incoming.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3">
            <UserPlus className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-amber-800">Incoming Requests</h2>
            <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              {incoming.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {incoming.map((c) => <PersonRow key={c.id} c={c} />)}
          </div>
        </section>
      )}

      {/* Role-specific connections — My Learners or My Experts */}
      {roleConnections.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50 px-5 py-3">
            {user.role === "expert"
              ? <GraduationCap className="h-4 w-4 text-indigo-500" />
              : <BadgeCheck className="h-4 w-4 text-indigo-500" />
            }
            <h2 className="text-sm font-bold text-indigo-800">
              {user.role === "expert" ? "My Learners" : "My Experts"}
            </h2>
            <span className="ml-auto rounded-full bg-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
              {roleConnections.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {roleConnections.map((c) => <PersonRow key={c.id} c={c} />)}
          </div>
        </section>
      )}

      {/* All accepted connections */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <UserCheck className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">All Connections</h2>
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            {accepted.length}
          </span>
        </div>
        {accepted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No connections yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Visit someone&apos;s profile and click Connect to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {accepted.map((c) => <PersonRow key={c.id} c={c} />)}
          </div>
        )}
      </section>

      {/* Sent requests */}
      {sent.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <Clock className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Sent Requests</h2>
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {sent.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {sent.map((c) => <PersonRow key={c.id} c={c} />)}
          </div>
        </section>
      )}
    </div>
  );
}
