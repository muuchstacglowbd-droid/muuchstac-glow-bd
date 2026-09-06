import { Link } from "@tanstack/react-router";
import { Bell, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useShopAlerts, type AlertTone } from "@/lib/alerts";
import { cn } from "@/lib/utils";

const toneClass: Record<AlertTone, string> = {
  warning: "bg-warning",
  destructive: "bg-destructive",
  primary: "bg-primary",
  success: "bg-success",
};

export function NotificationBell() {
  const alerts = useShopAlerts();

  return (
    <Popover>
      <PopoverTrigger
        className="ring-focus relative grid size-9 place-items-center rounded-xl border border-border bg-card/70 transition-colors hover:bg-accent"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {alerts.length > 0 && (
          <span className="num absolute -right-1 -top-1 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {alerts.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-title font-semibold">Alerts</p>
          <span className="text-caption text-muted-foreground">{alerts.length} items</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <CheckCircle2 className="size-6 text-success" />
              <p className="text-caption text-muted-foreground">
                Everything looks healthy right now.
              </p>
            </div>
          ) : (
            alerts.map((a) => (
              <Link
                key={a.id}
                to={a.to}
                className="flex gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-0 hover:bg-accent/60"
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneClass[a.tone])} />
                <span className="min-w-0">
                  <span className="block truncate text-body font-medium">{a.title}</span>
                  <span className="block text-caption text-muted-foreground">{a.detail}</span>
                </span>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
