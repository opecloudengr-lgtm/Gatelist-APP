import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={`flex max-h-[92dvh] w-full flex-col rounded-t-xl2 bg-white shadow-lifted sm:max-h-[85vh] sm:rounded-xl2 ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-mist-200 px-5 py-4">
          <h2 className="font-display text-lg text-ink-950">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-mist-400 hover:bg-mist-100 hover:text-ink-950" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
