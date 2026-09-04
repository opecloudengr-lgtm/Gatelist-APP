import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { listEvents } from "../../api/events";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/auth";

export default function EventsListPage() {
  const user = useAuthStore((s) => s.user);
  const { data: events, isLoading } = useQuery({ queryKey: ["events"], queryFn: listEvents });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink-950 sm:text-3xl">Your events</h1>
          <p className="mt-1 text-sm text-mist-400">Private, invite-only gatherings you organize or staff.</p>
        </div>
        {user?.role === "ORGANIZER" && (
          <Link to="/events/new" className="hidden sm:block">
            <Button>New event</Button>
          </Link>
        )}
      </div>

      {user?.role === "ORGANIZER" && (
        <Link to="/events/new" className="sm:hidden">
          <Button fullWidth>New event</Button>
        </Link>
      )}

      {isLoading && <p className="text-sm text-mist-400">Loading events…</p>}

      {!isLoading && events?.length === 0 && (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-mist-200 text-mist-400">◎</span>
          <h2 className="font-display text-lg text-ink-950">No events yet</h2>
          <p className="max-w-sm text-sm text-mist-400">
            {user?.role === "ORGANIZER"
              ? "Create your first private event to start building a guest list and issuing tickets."
              : "You haven't been added as staff to an event yet. Ask the organizer to send you an invite."}
          </p>
          {user?.role === "ORGANIZER" && (
            <Link to="/events/new">
              <Button className="mt-2">Create an event</Button>
            </Link>
          )}
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {events?.map((event) => (
          <Link key={event.id} to={event.staffRole === "STAFF" ? `/events/${event.id}/scan` : `/events/${event.id}`}>
            <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-lifted">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg leading-snug text-ink-950">{event.name}</h3>
                <span className="shrink-0 rounded-full bg-mist-100 px-2.5 py-1 text-xs font-semibold text-mist-400">
                  {event.staffRole === "OWNER" ? "Organizer" : event.staffRole === "CO_ORGANIZER" ? "Co-organizer" : "Staff"}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-sm text-mist-400">
                <span>{format(new Date(event.dateTime), "PPP · p")}</span>
                <span>{event.venue}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
