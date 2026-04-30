"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Radio, UserCheck, Calendar } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  entityId: string | null;
  createdAt: string;
};

const typeIcon: Record<string, React.ReactNode> = {
  booking: <Calendar className="h-3.5 w-3.5 text-indigo-400" />,
  admit: <UserCheck className="h-3.5 w-3.5 text-green-400" />,
  session_start: <Radio className="h-3.5 w-3.5 text-red-400" />,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  const unread = notifs.filter((n) => !n.read).length;

  const fetchNotifs = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifs(data);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((p) => !p); if (unread > 0) markAllRead(); }}
        className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {notifs.length > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifs.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</div>
              ) : (
                notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.read ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}
                  >
                    <div className="shrink-0 mt-0.5 h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center">
                      {typeIcon[n.type] ?? <Bell className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 leading-tight">{n.title}</p>
                      {n.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    {!n.read && <span className="shrink-0 h-2 w-2 rounded-full bg-indigo-500 mt-1.5" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
