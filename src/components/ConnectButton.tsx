"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptConnection, rejectConnection, removeConnection, sendConnectionRequest } from "@/app/actions/connections";
import { Clock, Loader2, UserCheck, UserPlus, UserX } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

function ActionButton({
  label,
  icon: Icon,
  className,
  pending,
  onClick,
}: {
  label: string;
  icon: any;
  className: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${className}`}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {pending ? "..." : label}
    </button>
  );
}

type ConnectionStatus = {
  id: string;
  status: string;
  requesterId: string;
} | null;

export function ConnectButton({
  targetUserId,
  connection,
  currentUserId,
}: {
  targetUserId: string;
  connection: ConnectionStatus;
  currentUserId: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const runAction = (actionName: string, buildFormData: () => FormData, action: (formData: FormData) => Promise<unknown>, successMessage: string) => {
    setBusyAction(actionName);
    startTransition(async () => {
      try {
        await action(buildFormData());
        showToast(successMessage, "success");
        router.refresh();
      } catch (error) {
        console.error("[ConnectButton] action error:", error);
        showToast("Something went wrong. Please try again.", "error");
      } finally {
        setBusyAction(null);
      }
    });
  };

  if (connection?.status === "accepted") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
          <UserCheck className="h-4 w-4" /> Connected
        </span>
        <ActionButton
          label="Remove"
          icon={UserX}
          pending={isPending && busyAction === "remove"}
          onClick={() =>
            runAction("remove", () => {
              const fd = new FormData();
              fd.append("connectionId", connection.id);
              return fd;
            }, removeConnection, "Connection removed.")
          }
          className="text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        />
      </div>
    );
  }

  if (connection?.status === "pending" && connection.requesterId === currentUserId) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock className="h-4 w-4" /> Request Sent
        </span>
        <ActionButton
          label="Cancel"
          icon={UserX}
          pending={isPending && busyAction === "cancel"}
          onClick={() =>
            runAction("cancel", () => {
              const fd = new FormData();
              fd.append("connectionId", connection.id);
              return fd;
            }, removeConnection, "Connection request canceled.")
          }
          className="text-slate-500 border border-slate-200 hover:bg-slate-100"
        />
      </div>
    );
  }

  if (connection?.status === "pending" && connection.requesterId === targetUserId) {
    return (
      <div className="flex items-center gap-2">
        <ActionButton
          label="Accept"
          icon={UserCheck}
          pending={isPending && busyAction === "accept"}
          onClick={() =>
            runAction("accept", () => {
              const fd = new FormData();
              fd.append("connectionId", connection.id);
              return fd;
            }, acceptConnection, "Connection request accepted.")
          }
          className="bg-indigo-600 text-white hover:bg-indigo-700"
        />
        <ActionButton
          label="Decline"
          icon={UserX}
          pending={isPending && busyAction === "decline"}
          onClick={() =>
            runAction("decline", () => {
              const fd = new FormData();
              fd.append("connectionId", connection.id);
              return fd;
            }, rejectConnection, "Connection request declined.")
          }
          className="text-slate-500 border border-slate-200 hover:bg-slate-100"
        />
      </div>
    );
  }

  return (
    <ActionButton
      label="Connect"
      icon={UserPlus}
      pending={isPending && busyAction === "connect"}
      onClick={() =>
        runAction("connect", () => {
          const fd = new FormData();
          fd.append("addresseeId", targetUserId);
          return fd;
        }, sendConnectionRequest, "Connection request sent.")
      }
      className="bg-slate-900 text-white hover:bg-slate-800"
    />
  );
}
