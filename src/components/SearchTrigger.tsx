"use client";

import { Search } from "lucide-react";
import { appName } from "@/data/constant";

export function SearchTrigger() {
  const open = () =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );

  return (
    <>
      {/* Mobile: icon-only button */}
      <button
        type="button"
        onClick={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 md:hidden"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Desktop: full search bar */}
      <div className="relative hidden md:block md:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <button
          type="button"
          onClick={open}
          className="w-full h-9 pl-9 pr-12 rounded-lg bg-slate-100 text-sm text-slate-400 text-left outline-none cursor-pointer hover:bg-slate-200 transition-colors"
        >
          Search {appName}...
        </button>
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          ⌘K
        </kbd>
      </div>
    </>
  );
}
