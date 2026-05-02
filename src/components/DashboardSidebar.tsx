"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  PenLine,
  BookOpen,
  Settings,
  MessageSquare,
  Sparkles,
  UserCircle,
  ShieldCheck,
} from "lucide-react";
import { GoLiveModal } from "./GoLiveModal";
import { createClient } from "@liveblocks/client";

type User = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: "learner" | "expert";
  isAdmin?: boolean;
};

const navLinks = [
  { href: "/dashboard",             label: "Home",         icon: LayoutDashboard, exact: true  },
  { href: "/dashboard/groups",      label: "Groups",       icon: Users,           exact: false },
  { href: "/dashboard/messages",    label: "Messages",     icon: MessageSquare,   exact: false },
  { href: "/dashboard/settings",    label: "Settings",     icon: Settings,        exact: false },
  { href: "/dashboard/articles/new",label: "Write Article",icon: PenLine,         exact: false },
  { href: "/",                      label: "Public Feed",  icon: BookOpen,        exact: true  },
];

export function DashboardSidebar({ user, goLiveDisabled }: { user: User; goLiveDisabled?: boolean }) {
  const pathname = usePathname();
  const [unreadMessages, setUnreadMessages] = useState(0);

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
    void fetchUnread();

    // Join the user's personal inbox room and listen for real-time events
    const client = createClient({ authEndpoint: "/api/liveblocks-auth" });
    const { room, leave } = client.enterRoom(`user-inbox-${user.id}`);

    const unsub = room.events.customEvent.subscribe(({ event }) => {
      if (!event || typeof event !== "object" || Array.isArray(event)) return;
      const e = event as { type?: string };
      if (e.type === "new_message" || e.type === "new_notification") {
        void fetchUnread();
      }
      if (e.type === "new_notification") {
        window.dispatchEvent(new Event("skillpulse:new-notification"));
      }
    });

    // 2-minute fallback poll only if WebSocket is down
    const interval = setInterval(fetchUnread, 120000);

    return () => {
      unsub();
      leave();
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Refresh badge when navigating to messages
  useEffect(() => {
    if (pathname.startsWith("/dashboard/messages")) void fetchUnread();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-white">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b shrink-0">
        <Link href="/" className="text-xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
          SkillPulse
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navLinks.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          const isMessagesLink = href === "/dashboard/messages";
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${active ? "text-indigo-600" : "text-slate-400"}`} size={18} />
              <span className="flex-1">{label}</span>
              {isMessagesLink && unreadMessages > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold text-white">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Become Expert CTA for learners */}
      {user.role === "learner" && (
        <div className="px-3 pb-2">
          <Link
            href="/dashboard/become-expert"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <Sparkles size={16} className="text-indigo-500" />
            Become an Expert
          </Link>
        </div>
      )}

      {/* Admin link — only for platform admin */}
      {user.isAdmin && (
        <div className="px-3 pb-2">
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ShieldCheck size={16} className="text-slate-500" />
            Admin Panel
          </Link>
        </div>
      )}

      <div className="px-3 pb-3">
        <GoLiveModal userRole={user.role} disabled={goLiveDisabled} />
      </div>

      {/* User footer */}
      <div className="border-t px-3 py-3 flex items-center gap-3">
        <UserButton />
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${user.id}`} className="text-xs font-semibold text-slate-800 truncate hover:text-indigo-600 transition-colors block">{user.displayName}</Link>
          <p className="text-[11px] text-slate-400 truncate capitalize">{user.role}</p>
        </div>
        <Link href={`/profile/${user.id}`} title="View my profile" className="shrink-0 text-slate-400 hover:text-indigo-600 transition-colors">
          <UserCircle size={16} />
        </Link>
      </div>
    </aside>
  );
}
