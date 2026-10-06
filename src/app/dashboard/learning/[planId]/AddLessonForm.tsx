"use client";

import { useState } from "react";
import { Plus, Loader2, Calendar, Timer } from "lucide-react";

type Lesson = {
  id: string; title: string; summary: string | null; objective: string | null;
  status: string; position: number; scheduledAt: Date | null; durationMinutes: number | null;
};

export function AddLessonForm({
  planId,
  onAdded,
}: {
  planId: string;
  onAdded?: (lesson: Lesson) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", objective: "", scheduledAt: "", durationMinutes: "30" });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/learning-plans/${planId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          objective: form.objective.trim() || null,
          scheduledAt: form.scheduledAt || null,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : 30,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to add lesson");
      }
      const data = await res.json() as { lesson: Lesson };
      setForm({ title: "", objective: "", scheduledAt: "", durationMinutes: "30" });
      setOpen(false);
      // Immediately add to parent list — no page refresh needed
      onAdded?.(data.lesson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", borderRadius: 8, border: "1px solid var(--lp-border)",
    padding: "8px 12px", fontSize: 13, outline: "none", background: "white",
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 12, border: "2px dashed var(--lp-border)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--lp-muted)" }}
      >
        <Plus size={15} /> Add Lesson
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: "var(--lp-accent-bg)", borderRadius: 12, padding: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--lp-accent)", marginBottom: 10 }}>New Lesson</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Lesson title *" required style={inputStyle} />
        <input type="text" value={form.objective} onChange={(e) => set("objective", e.target.value)} placeholder="Learning objective (optional)" style={inputStyle} />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Calendar size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--lp-muted)", pointerEvents: "none" }} />
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} style={{ ...inputStyle, paddingLeft: 28, fontSize: 12 }} />
          </div>
          <div style={{ position: "relative", width: 80 }}>
            <Timer size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--lp-muted)", pointerEvents: "none" }} />
            <input type="number" value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} placeholder="Mins" min={1} max={1440} required style={{ ...inputStyle, paddingLeft: 28, fontSize: 12 }} />
          </div>
        </div>
        {error && <p style={{ fontSize: 12, color: "#dc2626" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => { setOpen(false); setError(null); }} style={{ flex: 1, borderRadius: 8, border: "1px solid var(--lp-border)", padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "white", color: "var(--lp-fg2)" }}>Cancel</button>
          <button type="submit" disabled={loading || !form.title.trim()} style={{ flex: 1, borderRadius: 8, border: "none", padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "var(--lp-accent)", color: "white", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />}
            Add Lesson
          </button>
        </div>
      </div>
    </form>
  );
}
