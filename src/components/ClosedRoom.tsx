import Link from "next/link";
import { Lock } from "lucide-react";

interface ClosedRoomProps {
  title: string;
  status: string;
}

export function ClosedRoom({ title, status }: ClosedRoomProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
      <div className="max-w-md">
        <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 mb-6">
          {status === "expired"
            ? "This session was cancelled because the host didn't show up."
            : "This session has ended."}
        </p>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
