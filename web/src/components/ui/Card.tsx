import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("bg-white rounded-xl2 border border-mist-200/70 shadow-card", className)} {...rest} />;
}

export function CategoryBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

export function StatusBadge({ status }: { status: "ISSUED" | "CHECKED_IN" | "VOID" }) {
  const map = {
    ISSUED: { label: "Not arrived", cls: "bg-mist-100 text-mist-400" },
    CHECKED_IN: { label: "Checked in", cls: "bg-good/10 text-good" },
    VOID: { label: "Voided", cls: "bg-bad/10 text-bad" },
  } as const;
  const s = map[status];
  return <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", s.cls)}>{s.label}</span>;
}
