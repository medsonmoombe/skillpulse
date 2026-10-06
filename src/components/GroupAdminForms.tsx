"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  approveGroupMember,
  rejectGroupMember,
  removeGroupMember,
  updateGroupGovernance,
  updateGroupMemberRole,
} from "@/app/actions/group-management";
import { Loader2, Shield, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

function ActionButton({
  onClick,
  pending,
  children,
  loadingLabel,
  className,
  variant = "default",
  size = "sm",
}: {
  onClick: () => void;
  pending: boolean;
  children: React.ReactNode;
  loadingLabel?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
}) {
  return (
    <Button type="button" onClick={onClick} disabled={pending} variant={variant} size={size} className={className}>
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {loadingLabel && <span>{loadingLabel}</span>}
        </>
      ) : children}
    </Button>
  );
}

function useActionRunner() {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);

  const run = (successMessage: string, task: () => Promise<void>) => {
    if (pending) return;
    setPending(true);
    task()
      .then(() => showToast(successMessage, "success"))
      .catch((error) => {
        console.error("[GroupAdminForms] action error:", error);
        showToast("Something went wrong. Please try again.", "error");
      })
      .finally(() => setPending(false));
  };

  return { pending, run };
}

export function ApproveMemberForm({ groupId, targetUserId }: { groupId: string; targetUserId: string }) {
  const { pending, run } = useActionRunner();

  return (
    <ActionButton
      onClick={() =>
        run("Member approved.", async () => {
          const formData = new FormData();
          formData.set("groupId", groupId);
          formData.set("targetUserId", targetUserId);
          await approveGroupMember(formData);
        })
      }
      pending={pending}
      loadingLabel="Approving…"
      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
    >
      <UserCheck className="h-3.5 w-3.5" /> Approve
    </ActionButton>
  );
}

export function RejectMemberForm({ groupId, targetUserId }: { groupId: string; targetUserId: string }) {
  const { pending, run } = useActionRunner();

  return (
    <ActionButton
      onClick={() =>
        run("Request rejected.", async () => {
          const formData = new FormData();
          formData.set("groupId", groupId);
          formData.set("targetUserId", targetUserId);
          await rejectGroupMember(formData);
        })
      }
      pending={pending}
      loadingLabel="Rejecting…"
      variant="outline"
      className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs"
    >
      <UserX className="h-3.5 w-3.5" /> Reject
    </ActionButton>
  );
}

export function RemoveMemberForm({ groupId, targetUserId }: { groupId: string; targetUserId: string }) {
  const { pending, run } = useActionRunner();

  return (
    <ActionButton
      onClick={() =>
        run("Member removed.", async () => {
          const formData = new FormData();
          formData.set("groupId", groupId);
          formData.set("targetUserId", targetUserId);
          await removeGroupMember(formData);
        })
      }
      pending={pending}
      loadingLabel="Removing…"
      variant="ghost"
      className="h-8 gap-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
    >
      <UserX className="h-3 w-3" /> Remove
    </ActionButton>
  );
}

export function UpdateRoleForm({
  groupId,
  targetUserId,
  currentRole,
}: {
  groupId: string;
  targetUserId: string;
  currentRole: string;
}) {
  const { pending, run } = useActionRunner();
  const [role, setRole] = useState(currentRole);

  return (
    <div className="flex items-center gap-2">
      <select
        name="role"
        value={role}
        onChange={(event) => setRole(event.target.value)}
        disabled={pending}
        className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
      >
        <option value="admin">Admin</option>
        <option value="moderator">Moderator</option>
        <option value="member">Member</option>
      </select>
      <ActionButton
        onClick={() =>
          run("Role updated.", async () => {
            const formData = new FormData();
            formData.set("groupId", groupId);
            formData.set("targetUserId", targetUserId);
            formData.set("role", role);
            await updateGroupMemberRole(formData);
          })
        }
        pending={pending}
        loadingLabel="Updating…"
        variant="outline"
        className="h-8 gap-1 text-xs"
      >
        <ShieldCheck className="h-3 w-3" /> Update role
      </ActionButton>
    </div>
  );
}

export function GovernanceForm({
  groupId,
  joinMode,
  memberMessagingPolicy,
}: {
  groupId: string;
  joinMode: string;
  memberMessagingPolicy: string;
}) {
  const { pending, run } = useActionRunner();
  const [selectedJoinMode, setSelectedJoinMode] = useState(joinMode);
  const [selectedMessagingPolicy, setSelectedMessagingPolicy] = useState(memberMessagingPolicy);

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">Entry mode</label>
        <select
          name="joinMode"
          value={selectedJoinMode}
          onChange={(event) => setSelectedJoinMode(event.target.value)}
          disabled={pending}
          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
        >
          <option value="open">Open entry</option>
          <option value="approval_required">Approval required</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">Messaging policy</label>
        <select
          name="memberMessagingPolicy"
          value={selectedMessagingPolicy}
          onChange={(event) => setSelectedMessagingPolicy(event.target.value)}
          disabled={pending}
          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
        >
          <option value="all_members">All approved members can message</option>
          <option value="admins_only">Only admins can message</option>
        </select>
      </div>

      <ActionButton
        onClick={() =>
          run("Group controls saved.", async () => {
            const formData = new FormData();
            formData.set("groupId", groupId);
            formData.set("joinMode", selectedJoinMode);
            formData.set("memberMessagingPolicy", selectedMessagingPolicy);
            await updateGroupGovernance(formData);
          })
        }
        pending={pending}
        loadingLabel="Saving…"
        className="w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
        size="default"
      >
        <Shield className="h-3.5 w-3.5" /> Save controls
      </ActionButton>
    </div>
  );
}
