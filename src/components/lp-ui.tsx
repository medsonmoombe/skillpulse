/**
 * LP (Learning Pages) reusable component kit.
 * Matches the exact HTML prototype design — violet palette, DM Sans, Playfair Display.
 * No hover transforms. Shimmer progress bars. Animated counters. Activity chart. Streak dots.
 */

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ─── Page shell ──────────────────────────────────────────────────────────────

export function LPPage({ children }: { children: ReactNode }) {
  return (
    <div className="lp-page">
      <div className="lp-page-blobs" />
      <div className="lp-content">{children}</div>
    </div>
  );
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────

export function LPReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add("in"); },
      { threshold: 0.08 }
    );
    obs.observe(el);
    // Force-reveal if already in viewport
    setTimeout(() => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
    }, 50);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`lp-reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────

export function LPHeader({
  eyebrow, title, subtitle, actions,
}: {
  eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode;
}) {
  return (
    <LPReveal>
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-10">
        <div>
          {eyebrow && <p className="lp-label mb-2">{eyebrow}</p>}
          <h1 className="lp-display" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>{title}</h1>
          {subtitle && (
            <p className="mt-2 leading-relaxed" style={{ fontSize: 15, color: "var(--lp-muted)", maxWidth: 400 }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </header>
    </LPReveal>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────

export function LPCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const dur = 900;
        const start = performance.now();
        function tick(now: number) {
          const p = Math.min((now - start) / dur, 1);
          setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return <span ref={ref}>{display}</span>;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

type StatAccent = "lp-purple" | "lp-green" | "lp-amber";

export function LPStat({
  label,
  value,
  icon,
  accent,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent: StatAccent;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className={`lp-stat ${accent}`}>
      <div className="lp-stat-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="lp-stat-num"><LPCount value={value} /></div>
      <div className="lp-stat-lbl">{label}</div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

export function LPProgress({ pct }: { pct: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 300); return () => clearTimeout(t); }, [pct]);
  return (
    <div className="lp-track">
      <div className="lp-fill" style={{ width: `${width}%`, transition: "width 1s cubic-bezier(0.25,0.46,0.45,0.94)" }} />
    </div>
  );
}

// ─── Circular ring progress ───────────────────────────────────────────────────

export function LPRing({ pct }: { pct: number }) {
  const circumference = 2 * Math.PI * 20; // r=20 → 125.66
  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    const t = setTimeout(() => setOffset(circumference - (pct / 100) * circumference), 400);
    return () => clearTimeout(t);
  }, [pct, circumference]);
  return (
    <div style={{ width: 50, height: 50, position: "relative", flexShrink: 0 }}>
      <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: "rotate(-90deg)" }}>
        <circle className="lp-ring-bg" cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
        <circle
          className="lp-ring-fill"
          cx="25" cy="25" r="20" fill="none" strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: "var(--lp-accent)",
        fontFamily: "var(--font-dm)",
      }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Lesson row ───────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function LPLesson({
  title,
  duration,
  done,
  onToggle,
}: {
  title: string;
  duration?: string;
  done: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="lp-lesson" onClick={onToggle}>
      <div className={`lp-lesson-check ${done ? "done" : "pending"}`}>
        {done && <CheckIcon />}
      </div>
      <span className={`lp-lesson-title ${done ? "done" : ""}`}>{title}</span>
      {duration && <span className="lp-lesson-dur">{duration}</span>}
    </div>
  );
}

// ─── Nav pills ────────────────────────────────────────────────────────────────

export function LPPills<T extends string>({
  options,
  active,
  onChange,
}: {
  options: { value: T; label: string }[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          className={`lp-pill ${active === o.value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

export function LPButton({
  children,
  variant = "primary",
  onClick,
  href,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  variant?: "primary" | "ghost";
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: "button" | "submit";
}) {
  const cls = `lp-btn lp-btn-${variant} ${className}`;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <button type={type} className={cls} onClick={onClick}>{children}</button>;
}

// ─── Activity chart ───────────────────────────────────────────────────────────

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function LPActivityChart({ data }: { data: { pct: number; label: string }[] }) {
  const [heights, setHeights] = useState<number[]>(data.map(() => 0));
  useEffect(() => {
    data.forEach((d, i) => {
      setTimeout(() => {
        setHeights((prev) => {
          const next = [...prev];
          next[i] = d.pct;
          return next;
        });
      }, 500 + i * 80);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between gap-2" style={{ height: 80 }}>
        {data.map((d, i) => (
          <div key={i} className="lp-bar-wrap" style={{ position: "relative" }}>
            <div
              className="lp-bar-fill"
              style={{ height: `${heights[i]}%`, transition: "height 0.8s cubic-bezier(0.25,0.46,0.45,0.94)" }}
            />
            <div className="lp-bar-tip">{d.label}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2.5">
        {DAYS.map((d, i) => (
          <span key={i} style={{ fontSize: 10, color: "var(--lp-muted)" }}>{d}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Streak dots ──────────────────────────────────────────────────────────────

export function LPStreak({ days, total = 7 }: { days: number; total?: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`lp-dot ${i < days ? "lit" : "dim"}`} style={{ flex: 1 }} />
      ))}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

let _showToast: ((msg: string) => void) | null = null;

export function LPToast() {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    _showToast = (m: string) => {
      setMsg(m);
      setVisible(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 2800);
    };
    return () => { _showToast = null; };
  }, []);

  return (
    <div className={`lp-toast ${visible ? "show" : ""}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lp-accent-lt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      {msg}
    </div>
  );
}

export function showToast(msg: string) {
  _showToast?.(msg);
}

// ─── "Up Next" sidebar card ───────────────────────────────────────────────────

export function LPUpNext({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--lp-success-bg)", border: "1px solid rgba(5,150,105,0.12)" }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(5,150,105,0.12)", color: "var(--lp-success)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--lp-fg)" }}>{title}</p>
        <p style={{ fontSize: 11, color: "var(--lp-muted)" }}>{meta}</p>
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

export function LPSectionHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 style={{ fontWeight: 600, fontSize: 18, color: "var(--lp-fg)", letterSpacing: "-0.3px" }}>
        {title}
      </h2>
      {right}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function LPBadge({
  children,
  variant = "accent",
}: {
  children: ReactNode;
  variant?: "accent" | "success" | "warm" | "muted";
}) {
  const styles: Record<string, React.CSSProperties> = {
    accent:  { background: "var(--lp-accent-bg)",  color: "var(--lp-accent)"  },
    success: { background: "var(--lp-success-bg)", color: "var(--lp-success)" },
    warm:    { background: "var(--lp-warm-bg)",    color: "var(--lp-warm)"    },
    muted:   { background: "var(--lp-border)",     color: "var(--lp-muted)"   },
  };
  return (
    <span style={{
      ...styles[variant],
      padding: "4px 10px",
      borderRadius: 100,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "var(--font-dm)",
    }}>
      {children}
    </span>
  );
}
