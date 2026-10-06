import Link from "next/link";
import { Lock, Clock, Users, ArrowLeft } from "lucide-react";

interface ClosedRoomProps {
  title: string;
  status: string;
}

const STATUS_CONFIG: Record<string, {
  icon: typeof Lock;
  iconColor: string;
  iconBg: string;
  message: string;
  barColor: string;
}> = {
  expired: {
    icon: Clock,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
    message: "This session was cancelled because the host didn't show up.",
    barColor: "from-amber-400 to-orange-400",
  },
  full: {
    icon: Users,
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-50",
    message: "This live session has reached its participant limit.",
    barColor: "from-indigo-400 to-purple-400",
  },
  ended: {
    icon: Lock,
    iconColor: "text-slate-500",
    iconBg: "bg-slate-100",
    message: "This session has ended. Check the dashboard for upcoming sessions.",
    barColor: "from-slate-400 to-slate-500",
  },
};

export function ClosedRoom({ title, status }: ClosedRoomProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.ended;
  const Icon = config.icon;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className={`h-2 bg-gradient-to-r ${config.barColor}`} />
          <div className="p-8 text-center">
            <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${config.iconBg}`}>
              <Icon className={`h-8 w-8 ${config.iconColor}`} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{config.message}</p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
