"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@liveblocks/client";
import {
  Bell,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  LoaderCircle,
  MessageSquare,
  Radio,
  Sparkles,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  entityId: string | null;
  actionUrl: string | null;
  createdAt: string;
};

const typeIcon: Record<string, React.ReactNode> = {
  booking: <Calendar className="h-4 w-4 text-indigo-500" />,
  admit: <UserCheck className="h-4 w-4 text-emerald-500" />,
  session_start: <Radio className="h-4 w-4 text-rose-500" />,
  direct_message: <MessageSquare className="h-4 w-4 text-sky-500" />,
  group_message: <MessageSquare className="h-4 w-4 text-violet-500" />,
  match_suggestion: <Sparkles className="h-4 w-4 text-amber-500" />,
  system: <BookOpen className="h-4 w-4 text-indigo-400" />,
};

const typeLabel: Record<string, string> = {
  booking: "Booking",
  admit: "Admission",
  session_start: "Live session",
  direct_message: "Message",
  group_message: "Group chat",
  match_suggestion: "Match",
  system: "Article",
};

function getNotificationGroupLabel(date: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const notificationDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (notificationDay.getTime() === today.getTime()) {
    return "Today";
  }

  if (notificationDay.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  if (notificationDay >= weekAgo) {
    return "This week";
  }

  return "Earlier";
}

function groupNotifications(notifications: Notification[]) {
  const groups = new Map<string, Notification[]>();

  for (const notification of notifications) {
    const label = getNotificationGroupLabel(new Date(notification.createdAt));
    const existing = groups.get(label) ?? [];
    existing.push(notification);
    groups.set(label, existing);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  const unread = notifs.filter((notification) => !notification.read).length;
  const groupedNotifications = useMemo(() => groupNotifications(notifs), [notifs]);

  const fetchNotifs = async () => {
    startTransition(() => setIsLoading(true));

    try {
      const res = await fetch("/api/notifications");
      const data = (await res.json()) as Notification[];
      startTransition(() => {
        setNotifs(data);
      });
    } catch {
      // Quiet failure keeps the drawer resilient.
    } finally {
      startTransition(() => setIsLoading(false));
    }
  };

  useEffect(() => {
    void fetchNotifs();

    const handleNewNotification = () => { void fetchNotifs(); };
    window.addEventListener("skillpulse:new-notification", handleNewNotification);

    // 2-minute fallback poll only if WebSocket is down
    const interval = setInterval(fetchNotifs, 120000);

    return () => {
      window.removeEventListener("skillpulse:new-notification", handleNewNotification);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (open) {
      void fetchNotifs();
    }
  }, [open]);

  const markNotificationsRead = async (ids?: string[]) => {
    startTransition(() => setIsMutating(true));

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids?.length ? { ids } : {}),
      });

      startTransition(() => {
        setNotifs((prev) =>
          prev.map((notif) =>
            !ids || ids.includes(notif.id) ? { ...notif, read: true } : notif
          )
        );
      });
    } finally {
      startTransition(() => setIsMutating(false));
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markNotificationsRead([notification.id]);
    }

    setOpen(false);

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="Open notifications"
        >
          <Bell size={18} />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-[9px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="left-auto right-0 top-0 h-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-l border-slate-200 bg-white p-0 shadow-2xl sm:max-w-none w-full sm:w-[28rem]"
      >
        <DialogHeader className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-950">Notifications</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Messages, bookings, live sessions, and match activity in one place.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ${
                unread > 0 ? "bg-indigo-600 text-white" : "border border-slate-200 text-slate-500"
              }`}>
                {unread} unread
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {notifs.length === 0 ? "No recent activity yet." : `${notifs.length} recent notification${notifs.length === 1 ? "" : "s"}`}
            </div>
            {unread > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markNotificationsRead()}
                disabled={isMutating}
                className="text-indigo-600 hover:text-indigo-700"
              >
                {isMutating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Mark all read
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {isLoading && notifs.length === 0 ? (
            <div className="flex h-full min-h-80 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading notifications...
              </div>
            </div>
          ) : groupedNotifications.length === 0 ? (
            <div className="flex h-full min-h-80 items-center justify-center px-6">
              <div className="max-w-sm text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-base font-semibold text-slate-700">No notifications yet</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  New messages, admits, bookings, and smart match suggestions will appear here as they happen.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 px-4 py-5">
              {groupedNotifications.map((group) => (
                <section key={group.label} className="space-y-3">
                  <div className="px-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
                  </div>

                  <div className="space-y-2">
                    {group.items.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          notification.read
                            ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                            : "border-l-4 border-l-indigo-500 border-slate-200 bg-white pl-3 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            notification.read ? "bg-slate-50 ring-1 ring-slate-200" : "bg-indigo-50 ring-1 ring-indigo-200"
                          }`}>
                            {typeIcon[notification.type] ?? <Bell className="h-4 w-4 text-slate-400" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm leading-snug ${
                                notification.read ? "font-medium text-slate-700" : "font-semibold text-slate-900"
                              }`}>{notification.title}</p>
                              {!notification.read && (
                                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                              )}
                            </div>

                            {notification.message ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{notification.message}</p>
                            ) : null}

                            <div className="mt-2 flex items-center justify-between gap-3">
                              <p className="text-[11px] text-slate-400">
                                {new Date(notification.createdAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </p>
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                {typeLabel[notification.type] ?? "Update"}
                                <ChevronRight className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
