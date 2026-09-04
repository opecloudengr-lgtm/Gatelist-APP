import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import clsx from "clsx";
import { getEvent } from "../../api/events";
import type { EventAccess, EventDetail } from "../../types";

export interface EventOutletContext {
  event: EventDetail;
  access: EventAccess;
}

const tabs = [
  { to: "", label: "Dashboard", end: true },
  { to: "guests", label: "Guests" },
  { to: "staff", label: "Staff" },
  { to: "settings", label: "Settings" },
];

export default function EventDetailLayout() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => getEvent(eventId),
    enabled: !!eventId,
  });

  if (isLoading) return <p className="text-sm text-mist-400">Loading event…</p>;
  if (isError || !data) return <p className="text-sm text-bad">Couldn't load this event.</p>;

  const { event, access } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <button onClick={() => navigate("/events")} className="w-fit text-sm font-medium text-mist-400 hover:text-ink-950">
          ← All events
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-ink-950 sm:text-3xl">{event.name}</h1>
            <p className="mt-1 text-sm text-mist-400">
              {format(new Date(event.dateTime), "PPP · p")} · {event.venue}
            </p>
          </div>
          {access.canScan && (
            <button
              onClick={() => navigate(`/events/${event.id}/scan`)}
              className="rounded-xl bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-900"
            >
              Open scanner
            </button>
          )}
        </div>
      </div>

      {access.canManage && (
        <nav className="flex gap-1 overflow-x-auto rounded-xl bg-mist-100 p-1 scrollbar-none">
          {tabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                clsx(
                  "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  isActive ? "bg-white text-ink-950 shadow-card" : "text-mist-400 hover:text-ink-950",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}

      <Outlet context={{ event, access } satisfies EventOutletContext} />
    </div>
  );
}
