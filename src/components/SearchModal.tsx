"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Users, Hash, Loader2, X } from "lucide-react";

type Result = {
  id: string;
  type: "article" | "person" | "group";
  title: string;
  subtitle: string;
  href: string;
};

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
          if (res.ok) setResults(await res.json());
        } catch { /* quiet */ }
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const ICONS = { article: BookOpen, person: Users, group: Hash };
  const COLORS = {
    article: "bg-indigo-50 text-indigo-500",
    person:  "bg-purple-50 text-purple-500",
    group:   "bg-emerald-50 text-emerald-500",
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          {isPending
            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
            : <Search className="h-4 w-4 shrink-0 text-slate-400" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, people, groups…"
            className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((r) => {
              const Icon = ICONS[r.type];
              return (
                <li key={r.id}>
                  <button
                    onClick={() => go(r.href)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${COLORS[r.type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
                      <p className="truncate text-xs text-slate-400">{r.subtitle}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-500">
                      {r.type}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query && !isPending ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No results for &ldquo;{query}&rdquo;
          </div>
        ) : !query ? (
          <div className="px-4 py-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Quick links</p>
            <div className="space-y-1">
              {[
                { label: "Browse Articles",  href: "/",                      icon: BookOpen },
                { label: "Find People",       href: "/dashboard",             icon: Users    },
                { label: "Explore Groups",    href: "/dashboard/groups",      icon: Hash     },
              ].map(({ label, href, icon: Icon }) => (
                <button
                  key={href}
                  onClick={() => go(href)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <Icon className="h-4 w-4 text-slate-400" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
          <p className="text-[10px] text-slate-400">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono">⌘K</kbd> to open
          </p>
          <p className="text-[10px] text-slate-400">↑↓ navigate · Enter select</p>
        </div>
      </div>
    </div>
  );
}
