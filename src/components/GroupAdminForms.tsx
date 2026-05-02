"use client";

import { useState, useTransition } from "react";
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
  className,
  variant = "default",
  size = "sm",
}: {
  onClick: () => void;
  pending: boolean;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
}) {
  return (
    <Button type="button" onClick={onClick} disabled={pending} variant={variant} size={size} className={className}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </Button>
  );
}

function useActionRunner() {
  const { showToast } = useToast();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (key: string, successMessage: string, task: () => Promise<void>) => {
    startTransition(async () => {
      setPendingKey(key);
      try {
        await task();
        showToast(successMessage, "success");
      } catch (error) {
        console.error("[GroupAdminForms] action error:", error);
        showToast("Something went wrong. Please try again.", "error");
      } finally {
        setPendingKey(null);
      }
    });
  };

  return { isPending, pendingKey, run };
}

export function ApproveMemberForm({ groupId, targetUserId }: { groupId: string; targetUserId: string }) {
  const { isPending, pendingKey, run } = useActionRunner();

  return (
    <ActionButton
      onClick={() =>
        run(`approve:${targetUserId}`, "Member approved successfully.", async () => {
          const formData = new FormData();
          formData.set("groupId", groupId);
          formData.set("targetUserId", targetUserId);
          await approveGroupMember(formData);
        })
      }
      pending={isPending && pendingKey === `approve:${targetUserId}`}
      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
    >
      <UserCheck className="h-3.5 w-3.5" /> Approve
    </ActionButton>
  );
}

export function RejectMemberForm({ groupId, targetUserId }: { groupId: string; targetUserId: string }) {
  const { isPending, pendingKey, run } = useActionRunner();

  return (
    <ActionButton
      onClick={() =>
        run(`reject:${targetUserId}`, "Member request rejected.", async () => {
          const formData = new FormData();
          formData.set("groupId", groupId);
          formData.set("targetUserId", targetUserId);
          await rejectGroupMember(formData);
        })
      }
      pending={isPending && pendingKey === `reject:${targetUserId}`}
      variant="outline"
      className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs"
    >
      <UserX className="h-3.5 w-3.5" /> Reject
    </ActionButton>
  );
}

export function RemoveMemberForm({ groupId, targetUserId }: { groupId: string; targetUserId: string }) {
  const { isPending, pendingKey, run } = useActionRunner();

  return (
    <ActionButton
      onClick={() =>
        run(`remove:${targetUserId}`, "Member removed successfully.", async () => {
          const formData = new FormData();
          formData.set("groupId", groupId);
          formData.set("targetUserId", targetUserId);
          await removeGroupMember(formData);
        })
      }
      pending={isPending && pendingKey === `remove:${targetUserId}`}
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
  const { isPending, pendingKey, run } = useActionRunner();
  const [role, setRole] = useState(currentRole);

  return (
    <div className="flex items-center gap-2">
      <select
        name="role"
        value={role}
        onChange={(event) => setRole(event.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <option value="admin">Admin</option>
        <option value="moderator">Moderator</option>
        <option value="member">Member</option>
      </select>
      <ActionButton
        onClick={() =>
          run(`role:${targetUserId}`, "Member role updated successfully.", async () => {
            const formData = new FormData();
            formData.set("groupId", groupId);
            formData.set("targetUserId", targetUserId);
            formData.set("role", role);
            await updateGroupMemberRole(formData);
          })
        }
        pending={isPending && pendingKey === `role:${targetUserId}`}
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
  const { isPending, pendingKey, run } = useActionRunner();
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
          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all_members">All approved members can message</option>
          <option value="admins_only">Only admins can message</option>
        </select>
      </div>

      <ActionButton
        onClick={() =>
          run("governance", "Group controls updated successfully.", async () => {
            const formData = new FormData();
            formData.set("groupId", groupId);
            formData.set("joinMode", selectedJoinMode);
            formData.set("memberMessagingPolicy", selectedMessagingPolicy);
            await updateGroupGovernance(formData);
          })
        }
        pending={isPending && pendingKey === "governance"}
        className="w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
        size="default"
      >
        <Shield className="h-3.5 w-3.5" /> Save controls
      </ActionButton>
    </div>
  );
}
