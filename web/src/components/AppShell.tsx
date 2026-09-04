import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-mist-50">
      <header className="sticky top-0 z-40 border-b border-mist-200 bg-white/90 backdrop-blur safe-top">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <NavLink to="/events" className="flex items-center gap-2 text-ink-950">
            <span className="grid h-8 w-8 place-items-center rounded-full border-[3px] border-brass-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brass-400" />
            </span>
            <span className="font-display text-xl tracking-tight">GateList</span>
          </NavLink>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-ink-950">{user?.name}</p>
              <p className="text-xs leading-tight text-mist-400">{user?.role === "ORGANIZER" ? "Organizer" : "Event staff"}</p>
            </div>
            <button
              onClick={() => {
                clear();
                navigate("/login", { replace: true });
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-mist-400 hover:bg-mist-100 hover:text-ink-950"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 safe-bottom">
        <Outlet />
      </main>
    </div>
  );
}
