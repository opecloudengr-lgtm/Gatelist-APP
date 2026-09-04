import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardStats } from "../../api/dashboard";
import { downloadExport } from "../../api/dashboard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { getSocket, joinEventRoom, leaveEventRoom } from "../../lib/socket";
import type { EventOutletContext } from "./EventDetailLayout";
import { useToast } from "../../components/ui/Toast";
import { apiErrorMessage } from "../../lib/api";

export default function EventDashboardTab() {
  const { event } = useOutletContext<EventOutletContext>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", event.id],
    queryFn: () => getDashboardStats(event.id),
    refetchInterval: 15000,
  });

  useEffect(() => {
    joinEventRoom(event.id);
    const socket = getSocket();
    const onCheckin = () => queryClient.invalidateQueries({ queryKey: ["dashboard", event.id] });
    socket.on("checkin", onCheckin);
    return () => {
      socket.off("checkin", onCheckin);
      leaveEventRoom(event.id);
    };
  }, [event.id, queryClient]);

  async function onExport(format: "csv" | "pdf") {
    try {
      await downloadExport(event.id, format);
    } catch (err) {
      toast.push(apiErrorMessage(err, `Could not export ${format.toUpperCase()}`), "error");
    }
  }

  if (isLoading || !stats) return <p className="text-sm text-mist-400">Loading dashboard…</p>;

  const pct = stats.totals.invited === 0 ? 0 : Math.round((stats.totals.checkedIn / stats.totals.invited) * 100);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-mist-400">Checked in</p>
            <p className="font-display text-4xl text-ink-950">
              {stats.totals.checkedIn}
              <span className="text-xl text-mist-400"> / {stats.totals.invited}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onExport("csv")}>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => onExport("pdf")}>
              Export PDF
            </Button>
          </div>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-mist-100">
          <div className="h-full rounded-full bg-brass-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-mist-400">{pct}% of invited guests have arrived</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {stats.categories.map((c) => {
          const catPct = c.invited === 0 ? 0 : Math.round((c.checkedIn / c.invited) * 100);
          return (
            <Card key={c.categoryId ?? "uncategorized"} className="p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: c.color }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
                <span className="text-sm font-semibold text-ink-950">
                  {c.checkedIn} / {c.invited}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-mist-100">
                <div className="h-full rounded-full" style={{ width: `${catPct}%`, backgroundColor: c.color }} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-wrap gap-6 p-5 text-sm text-mist-400">
        <span>
          <strong className="text-ink-950">{stats.manualCount}</strong> manual check-ins
        </span>
        <span>
          <strong className="text-ink-950">{stats.voidedCount}</strong> voided tickets
        </span>
        <span>
          <strong className="text-ink-950">{event._count.guests}</strong> guest records
        </span>
      </Card>
    </div>
  );
}
