import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 safe-top safe-bottom">
        <Link to="/" className="mb-8 flex items-center gap-2.5 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-full border-[3px] border-brass-400">
            <span className="h-2 w-2 rounded-full bg-brass-400" />
          </span>
          <span className="font-display text-2xl tracking-tight">GateList</span>
        </Link>
        <div className="w-full max-w-sm rounded-xl2 bg-white p-6 shadow-lifted sm:p-8">
          <h1 className="font-display text-2xl text-ink-950">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-mist-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-sm text-mist-400">{footer}</div>}
      </div>
    </div>
  );
}
