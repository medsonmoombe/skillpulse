"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard, Users, PenLine, Search, Radio,
  BookOpen, Clock, Settings
} from "lucide-react";
import { GoLiveModal } from "./GoLiveModal";

type User = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: "learner" | "expert";
};

const navLinks = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/groups", label: "Groups", icon: Users, exact: false },
  { href: "/dashboard/articles/new", label: "Write Article", icon: PenLine, exact: false },
  { href: "/", label: "Public Feed", icon: BookOpen, exact: true },
];

export function DashboardSidebar({ user }: { user: User }) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

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
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <GoLiveModal />
      </div>

      {/* User footer */}
      <div className="border-t px-3 py-3 flex items-center gap-3">
        <UserButton />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{user.displayName}</p>
          <p className="text-[11px] text-slate-400 truncate capitalize">{user.role}</p>
        </div>
      </div>
    </aside>
  );
}
