import { MessageSquare, ArrowLeft } from "lucide-react";

export default function MessagesPage() {
  return (
    // Hidden on mobile — the sidebar takes full width when no conversation is open
    <div className="hidden h-full flex-col items-center justify-center bg-slate-50 px-6 text-center md:flex">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 shadow-inner">
        <MessageSquare className="h-9 w-9 text-indigo-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Your messages</h2>
      <p className="mt-2 max-w-xs text-sm text-slate-500">
        Select a conversation from the sidebar to start chatting, or message someone from their profile.
      </p>
      <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Pick a conversation on the left</span>
      </div>
    </div>
  );
}
