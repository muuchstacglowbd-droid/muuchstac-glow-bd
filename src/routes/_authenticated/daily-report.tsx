import { MiniFact } from "@/components/ds/MiniFact";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Download, Mail } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAdSpends,
  useDailyEntries,
  useExpenses,
  useOrders,
  useParcelReturns,
  useSaveShopSettings,
  useShopSettings,
} from "@/lib/data";

import { buildDailyProfit, daysToCsv, shiftDays, sumDays, todayKey } from "@/lib/profit";
import { currency } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/daily-report")({
  head: () => ({
    meta: [
      { title: "Daily Report — Rose Nude" },
      {
        name: "description",
        content:
          "Your day-end sheet: parcels sent, returns, sales, costs and net profit for every date, ready to download as a spreadsheet.",
      },
      { property: "og:title", content: "Daily Report — Rose Nude" },
      {
        property: "og:description",
        content:
          "Day-end sheet with parcels, returns, sales, costs and net profit for every date, ready to download.",
      },
    ],
  }),
  component: DailyReportPage,
});

function DailyReportPage() {
  const today = todayKey();
  const [from, setFrom] = useState(shiftDays(today, -6));
  const [to, setTo] = useState(today);

  const { data: orders = [] } = useOrders();
  const { data: entries = [] } = useDailyEntries();
  const { data: returns = [] } = useParcelReturns();
  const { data: expenses = [] } = useExpenses();
  const { data: adSpends = [] } = useAdSpends();

  const days = useMemo(
    () =>
      buildDailyProfit({ orders, entries, returns, expenses, adSpends }, from, to)
        .slice()
        .reverse(),
    [orders, entries, returns, expenses, adSpends, from, to],
  );
  const totals = useMemo(() => sumDays(days), [days]);
  const todayRow = days.find((d) => d.date === today);

  function download() {
    const csv = daysToCsv(days.slice().reverse());
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  }

  return (
    <AppShell
      title="Daily report"
      subtitle="Every day's sales, costs and profit — worked out on its own"
    >
      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { setFrom(today); setTo(today); }}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setFrom(shiftDays(today, -6)); setTo(today); }}
          >
            Last 7 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setFrom(shiftDays(today, -29)); setTo(today); }}
          >
            Last 30 days
          </Button>
        </div>
        <Button className="ml-auto" onClick={download}>
          <Download className="size-4" />
          Download report
        </Button>
      </div>

      {todayRow && (
        <div className="surface mt-4 p-5">
          <p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <CalendarDays className="size-3.5" /> Today · {today}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Stat label="Parcels sent" value={String(todayRow.parcels)} />
            <Stat label="Sales" value={currency(todayRow.revenue)} />
            <Stat label="Returned" value={String(todayRow.returnedParcels)} />
            <Stat label="Net profit" value={currency(todayRow.netProfit)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MiniStat label="On the way" value={todayRow.status.onTheWay} />
            <MiniStat label="Delivered" value={todayRow.status.delivered} />
            <MiniStat label="Returned" value={todayRow.status.returned} />
            <MiniStat label="Cancelled" value={todayRow.status.cancelled} />
            <MiniStat label="Not sent yet" value={todayRow.status.notSent} />
          </div>

        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Parcels in range" value={String(totals.parcels)} />
        <Stat label="Total sales" value={currency(totals.revenue)} />
        <Stat label="Total cost" value={currency(totals.totalCost)} />
        <Stat label="Net profit" value={currency(totals.netProfit)} />
      </div>

      <div className="surface mt-4 p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Parcel status in range
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <MiniStat label="On the way" value={totals.status.onTheWay} />
          <MiniStat label="Delivered" value={totals.status.delivered} />
          <MiniStat label="Returned" value={totals.status.returned} />
          <MiniStat label="Cancelled" value={totals.status.cancelled} />
          <MiniStat label="Not sent yet" value={totals.status.notSent} />
        </div>
      </div>

      {/* Phones get one card per day instead of an eleven column table. */}
      <div className="mt-4 space-y-3 lg:hidden">
        {days.length === 0 && (
          <div className="surface p-8 text-center text-caption text-muted-foreground">
            No days in this range yet.
          </div>
        )}
        {days.map((d) => (
          <div key={`m-${d.date}`} className="surface space-y-3 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="num font-display text-base font-bold">{d.date}</p>
              <p
                className={`num font-display text-lg font-bold ${d.netProfit < 0 ? "text-destructive" : "text-success"}`}
              >
                {currency(d.netProfit)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniFact label="Parcels" value={String(d.parcels)} />
              <MiniFact label="On the way" value={String(d.status.onTheWay)} />
              <MiniFact label="Delivered" value={String(d.status.delivered)} />
              <MiniFact
                label="Returned"
                value={String(d.status.returned || d.returnedParcels)}
              />
              <MiniFact label="Sales" value={currency(d.revenue)} />
              <MiniFact label="Product cost" value={currency(d.cogs)} />
              <MiniFact label="Ads" value={currency(d.adCost)} />
              <MiniFact label="Delivery" value={currency(d.shippingCost)} />
            </div>
          </div>
        ))}
      </div>

      <div className="surface mt-4 hidden overflow-hidden lg:block">
        <div className="table-scroll">
          <table className="w-full text-sm">

            <thead className="bg-muted/50 text-left text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 text-right font-semibold">Parcels</th>
                <th className="px-4 py-2.5 text-right font-semibold">On the way</th>
                <th className="px-4 py-2.5 text-right font-semibold">Delivered</th>
                <th className="px-4 py-2.5 text-right font-semibold">Returned</th>
                <th className="px-4 py-2.5 text-right font-semibold">Sales</th>
                <th className="px-4 py-2.5 text-right font-semibold">Product cost</th>
                <th className="px-4 py-2.5 text-right font-semibold">Ads</th>
                <th className="px-4 py-2.5 text-right font-semibold">Delivery</th>
                <th className="px-4 py-2.5 text-right font-semibold">Return courier</th>
                <th className="px-4 py-2.5 text-right font-semibold">Net profit</th>
              </tr>
            </thead>

            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-t border-border/70 hover:bg-muted/40">
                  <td className="num px-4 py-2.5">{d.date}</td>
                  <td className="num px-4 py-2.5 text-right">{d.parcels}</td>
                  <td className="num px-4 py-2.5 text-right">{d.status.onTheWay}</td>
                  <td className="num px-4 py-2.5 text-right">{d.status.delivered}</td>
                  <td className="num px-4 py-2.5 text-right">
                    {d.status.returned || d.returnedParcels}
                  </td>

                  <td className="num px-4 py-2.5 text-right">{currency(d.revenue)}</td>
                  <td className="num px-4 py-2.5 text-right">{currency(d.cogs)}</td>
                  <td className="num px-4 py-2.5 text-right">{currency(d.adCost)}</td>
                  <td className="num px-4 py-2.5 text-right">{currency(d.shippingCost)}</td>
                  <td className="num px-4 py-2.5 text-right">{currency(d.returnCourierCost)}</td>
                  <td
                    className={`num px-4 py-2.5 text-right font-semibold ${d.netProfit < 0 ? "text-destructive" : ""}`}
                  >
                    {currency(d.netProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReportEmailCard />
    </AppShell>

  );
}

function ReportEmailCard() {
  const { data: settings } = useShopSettings();
  const save = useSaveShopSettings();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const value = touched ? email : (settings?.report_email ?? "");
  const enabled = settings?.daily_report_enabled ?? false;

  return (
    <div className="surface mt-4 p-5">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Daily report by email
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Every night at 11:00 PM the full day — parcels, parcel status, sales, cost and net
        profit — is emailed to this address.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="report-email">Email address</Label>
          <Input
            id="report-email"
            type="email"
            placeholder="you@example.com"
            className="w-full sm:w-64"
            value={value}
            onChange={(e) => {
              setTouched(true);
              setEmail(e.target.value);
            }}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const next = value.trim();
            if (!next.includes("@")) {
              toast.error("Write a valid email address");
              return;
            }
            save.mutate(
              { report_email: next, daily_report_enabled: true },
              {
                onSuccess: () => toast.success("Daily report email saved"),
                onError: (e) =>
                  toast.error(e instanceof Error ? e.message : "Could not save"),
              },
            );
          }}
          disabled={save.isPending}
        >
          <Mail className="size-4" />
          {enabled ? "Update" : "Turn on"}
        </Button>
        {enabled && (
          <Button
            variant="ghost"
            onClick={() =>
              save.mutate(
                { daily_report_enabled: false },
                { onSuccess: () => toast.success("Daily report email turned off") },
              )
            }
            disabled={save.isPending}
          >
            Turn off
          </Button>
        )}
      </div>
      {enabled && settings?.report_email && (
        <p className="mt-2 text-xs text-success">
          On — going to {settings.report_email} every night at 11:00 PM.
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="num mt-1.5 font-display text-xl font-bold">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {

  return (
    <div className="surface p-5">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="num mt-3 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
