"use client";

import { useFormStatus } from "react-dom";
import { Loader2, CheckCircle, XCircle, Ban, UserCheck } from "lucide-react";

type Variant = "emerald" | "red" | "outline" | "emerald-outline" | "amber-outline";
type Size = "sm" | "xs";
type IconName = "check" | "x" | "ban" | "user";

const ICONS: Record<IconName, typeof CheckCircle> = {
  check: CheckCircle,
  x: XCircle,
  ban: Ban,
  user: UserCheck,
};

const VARIANT_CLASSES: Record<Variant, string> = {
  "emerald":        "bg-emerald-600 hover:bg-emerald-700 text-white",
  "red":            "bg-red-600 hover:bg-red-700 text-white",
  "outline":        "border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600",
  "emerald-outline":"border border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  "amber-outline":  "border border-amber-200 text-amber-700 hover:bg-amber-50",
};

function PendingButton({
  label, pendingLabel, icon, variant, size,
}: {
  label: string;
  pendingLabel: string;
  icon: IconName;
  variant: Variant;
  size: Size;
}) {
  const { pending } = useFormStatus();
  const Icon = ICONS[icon];
  const sizeClass = size === "xs" ? "px-2.5 py-1.5 text-xs rounded-lg" : "px-4 py-2 text-sm rounded-xl";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex items-center gap-1.5 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${VARIANT_CLASSES[variant]}`}
    >
      {pending
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Icon className="h-3.5 w-3.5" />
      }
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AdminActionButton({
  action,
  fields,
  label,
  pendingLabel,
  icon,
  variant,
  size = "sm",
  asChild,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  pendingLabel: string;
  icon: IconName;
  variant: Variant;
  size?: Size;
  asChild?: boolean;
}) {
  if (asChild) {
    // Render just the button inside an existing form
    return (
      <PendingButton label={label} pendingLabel={pendingLabel} icon={icon} variant={variant} size={size} />
    );
  }

  return (
    <form action={action}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <PendingButton label={label} pendingLabel={pendingLabel} icon={icon} variant={variant} size={size} />
    </form>
  );
}
