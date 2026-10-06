"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  UserCheck,
  PenLine,
  BookOpen,
  Settings,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  History,
  Coins,
  ChevronDown,
} from "lucide-react";
import { GoLiveModal } from "./GoLiveModal";
import { createClient } from "@liveblocks/client";
import { appName } from "@/data/constant";

type User = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: "learner" | "expert";
  isAdmin?: boolean;
};

// ── Primary nav — the 3 things users do most ──────────────────────────────────
const primaryNav = [
  { href: "/dashboard",          label: "Home",        icon: LayoutDashboard, exact: true  },
  { href: "/dashboard/messages", label: "Messages",    icon: MessageSquare,   exact: false },
  { href: "/dashboard/groups",   label: "Groups",      icon: Users,           exact: false },
];

// ── Secondary nav — less frequent, grouped under a divider ───────────────────
const secondaryNav = [
  { href: "/dashboard/connections",    label: "Connections",   icon: UserCheck,    exact: false },
  { href: "/dashboard/articles/new",   label: "Write Article", icon: PenLine,      exact: false },
  { href: "/",                         label: "Public Feed",   icon: BookOpen,     exact: true  },
];

// ── Learning nav ──────────────────────────────────────────────────────────────
const learningNav = [
  { href: "/dashboard/learning",        label: "Learning Plans", icon: GraduationCap, exact: false },
  { href: "/dashboard/session-history", label: "Session History",icon: History,       exact: false },
  { href: "/dashboard/wallet",          label: "Credits",        icon: Coins,         exact: false },
];

export function DashboardSidebar({ user, goLiveDisabled }: { user: User; goLiveDisabled?: boolean }) {
  const pathname = usePathname();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("sidebar:explore") !== "0";
  });
  const [learningOpen, setLearningOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("sidebar:learning") !== "0";
  });

  function toggleExplore() {
    setExploreOpen((v) => { localStorage.setItem("sidebar:explore", v ? "0" : "1"); return !v; });
  }
  function toggleLearning() {
    setLearningOpen((v) => { localStorage.setItem("sidebar:learning", v ? "0" : "1"); return !v; });
  }

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
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktopViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isDesktopViewport) return;
    void fetchUnread();

    const client = createClient({ authEndpoint: "/api/liveblocks-auth" });
    const { room, leave } = client.enterRoom(`user-inbox-${user.id}`);
    const unsub = room.events.customEvent.subscribe(({ event }) => {
      if (!event || typeof event !== "object" || Array.isArray(event)) return;
      const e = event as { type?: string };
      if (e.type === "new_message" || e.type === "new_notification") void fetchUnread();
      if (e.type === "new_notification") window.dispatchEvent(new Event("skillpulse:new-notification"));
    });
    const interval = setInterval(fetchUnread, 120000);
    return () => { unsub(); leave(); clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktopViewport, user.id]);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/messages")) void fetchUnread();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const NavLink = ({ href, label, icon: Icon, exact }: typeof primaryNav[0]) => {
    const active = isActive(href, exact);
    const isMessages = href === "/dashboard/messages";
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <Icon size={18} className={active ? "text-indigo-600" : "text-slate-400"} />
        <span className="flex-1">{label}</span>
        {isMessages && unreadMessages > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold text-white">
            {unreadMessages > 99 ? "99+" : unreadMessages}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">

      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-5">
        <Link href="/" className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-xl font-extrabold text-transparent">
          {appName}
        </Link>
      </div>

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto px-3 pt-4 pb-2 space-y-4 min-h-0">
        <nav className="space-y-0.5">
          {primaryNav.map((item) => <NavLink key={item.href} {...item} />)}
        </nav>

        {/* Divider + secondary nav */}
        <div>
          <button
            onClick={toggleExplore}
            className="flex w-full items-center justify-between px-3 mb-1.5 group"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
              Create & Explore
            </p>
            <ChevronDown
              size={12}
              className={`text-slate-400 transition-transform duration-200 ${exploreOpen ? "" : "-rotate-90"}`}
            />
          </button>
          {exploreOpen && (
            <div className="space-y-0.5">
              {secondaryNav.map((item) => <NavLink key={item.href} {...item} />)}
            </div>
          )}
        </div>

        {/* Learning nav */}
        <div>
          <button
            onClick={toggleLearning}
            className="flex w-full items-center justify-between px-3 mb-1.5 group"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
              Learning
            </p>
            <ChevronDown
              size={12}
              className={`text-slate-400 transition-transform duration-200 ${learningOpen ? "" : "-rotate-90"}`}
            />
          </button>
          {learningOpen && (
            <div className="space-y-0.5">
              {learningNav.map((item) => <NavLink key={item.href} {...item} />)}
            </div>
          )}
        </div>
      </div>

      {/* Spacer removed — flex-1 is now on the scroll container */}

      {/* Go Live */}
      <div className="px-3 pb-2">
        <GoLiveModal userRole={user.role} disabled={goLiveDisabled} />
      </div>

      {/* Become Expert — learners only */}
      {user.role === "learner" && (
        <div className="px-3 pb-2">
          <Link
            href="/dashboard/become-expert"
            className="flex items-center gap-2 w-full rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:from-indigo-100 hover:to-purple-100"
          >
            <Sparkles size={14} className="text-indigo-500" />
            Become an Expert
          </Link>
        </div>
      )}

      {/* Admin — platform admins only */}
      {user.isAdmin && (
        <div className="px-3 pb-2">
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-2 w-full rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
          >
            <ShieldCheck size={14} className="text-slate-500" />
            Admin Panel
          </Link>
        </div>
      )}

      {/* User footer — avatar + name + settings icon */}
      <div className="border-t border-slate-100 px-3 py-3 flex items-center gap-2.5">
        <UserButton />
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${user.id}`}
            className="block truncate text-xs font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
          >
            {user.displayName}
          </Link>
          <p className="truncate text-[11px] capitalize text-slate-400">{user.role}</p>
        </div>
        <Link
          href="/dashboard/settings"
          title="Settings"
          className={`shrink-0 rounded-lg p-1.5 transition-colors ${
            pathname.startsWith("/dashboard/settings")
              ? "bg-indigo-50 text-indigo-600"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          }`}
        >
          <Settings size={15} />
        </Link>
      </div>
    </aside>
  );
}
