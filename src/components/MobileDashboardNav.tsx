"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Compass, GraduationCap, History, LayoutDashboard, Menu,
  MessageSquare, PenLine, Settings, Users, UserCheck, Coins,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GoLiveModal } from "@/components/GoLiveModal";
import { createClient } from "@liveblocks/client";
import { appName } from "@/data/constant";

type User = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: "learner" | "expert";
};

const primaryNavLinks = [
  { href: "/dashboard",          label: "Home",     icon: LayoutDashboard, exact: true  },
  { href: "/dashboard/groups",   label: "Groups",   icon: Users,           exact: false },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare,   exact: false },
];

const secondaryNavLinks = [
  { href: "/dashboard/connections",    label: "Connections",    icon: UserCheck,    exact: false },
  { href: "/dashboard/learning",       label: "Learning Plans", icon: GraduationCap,exact: false },
  { href: "/dashboard/session-history",label: "Session History",icon: History,      exact: false },
  { href: "/dashboard/wallet",         label: "Credits",        icon: Coins,        exact: false },
  { href: "/dashboard/settings",       label: "Settings",       icon: Settings,     exact: false },
  { href: "/dashboard/articles/new",   label: "Write Article",  icon: PenLine,      exact: false },
  { href: "/",                         label: "Public Feed",    icon: BookOpen,     exact: true  },
];

export function MobileDashboardNav({ user, goLiveDisabled }: { user: User; goLiveDisabled?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const fetchUnread = async () => {
    try {
      const res = await fetch("/api/messages/unread-summary", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { unreadMessages?: number };
      startTransition(() => setUnreadMessages(data.unreadMessages ?? 0));
    } catch { /* quiet */ }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) return;

    void fetchUnread();

    const client = createClient({ authEndpoint: "/api/liveblocks-auth" });
    const { room, leave } = client.enterRoom(`user-inbox-${user.id}`);

    const unsub = room.events.customEvent.subscribe(({ event }) => {
      if (!event || typeof event !== "object" || Array.isArray(event)) return;
      const e = event as { type?: string };
      if (e.type === "new_message" || e.type === "new_notification") {
        void fetchUnread();
      }
    });

    const interval = setInterval(fetchUnread, 120000);

    return () => {
      unsub();
      leave();
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileViewport, user.id]);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/messages")) setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <nav className="grid grid-cols-4 gap-1 px-2 py-2">
          {primaryNavLinks.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            const isMessagesLink = href === "/dashboard/messages";

            return (
              <Link
                key={href}
                href={href}
                className={`relative flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-4 w-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                  {isMessagesLink && unreadMessages > 0 ? (
                    <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-semibold text-white">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  ) : null}
                </div>
                <span className="mt-1">{label}</span>
              </Link>
            );
          })}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors ${
                  open
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
                aria-label="Open more dashboard options"
              >
                <Menu className={`h-4 w-4 ${open ? "text-white" : "text-slate-400"}`} />
                <span className="mt-1">More</span>
              </button>
            </DialogTrigger>

            <DialogContent
              showCloseButton={false}
              className="top-auto bottom-0 left-0 right-0 max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-x-0 border-b-0 border-t border-slate-200 bg-white p-0 sm:max-w-none"
            >
              <DialogHeader className="border-b border-slate-100 px-5 py-4 text-left">
                <DialogTitle className="text-lg font-semibold text-slate-950">More from {appName}</DialogTitle>
                <p className="text-sm text-slate-500">
                  Quick access to creation, settings, discovery, and live session tools.
                </p>
              </DialogHeader>

              <div className="space-y-6 px-5 py-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{user.displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                  <div className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600 ring-1 ring-slate-200">
                    {user.role}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {secondaryNavLinks.map(({ href, label, icon: Icon, exact }) => {
                    const active = isActive(href, exact);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                          active
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="flex-1">{label}</span>
                        {href === "/" ? <Compass className="h-4 w-4 text-slate-300" /> : null}
                      </Link>
                    );
                  })}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Go live</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Start a room and bring your learners or community into a live session.
                  </p>
                  <div className="mt-4">
                    <GoLiveModal userRole={user.role} disabled={goLiveDisabled} />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </nav>
      </div>
    </>
  );
}
