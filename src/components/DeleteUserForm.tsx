"use client";

import { useFormStatus } from "react-dom";
import { deleteUser } from "@/app/actions/admin";
import { Trash2, Loader2 } from "lucide-react";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Delete
    </button>
  );
}

export function DeleteUserForm({ userId, displayName }: { userId: string; displayName: string }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(`Delete ${displayName}? This is permanent and cannot be undone.`)) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteUser} onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <DeleteButton />
    </form>
  );
}
