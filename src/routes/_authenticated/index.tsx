import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  PackageX,
  TrendingUp,
  Wallet,
  ShoppingBag,
  Users,
} from "lucide-react";
import { ChartSkeleton, StatGridSkeleton } from "@/components/ds/skeletons";
import { AppShell } from "@/components/AppShell";
import { OnboardingPrompt } from "@/components/OnboardingPrompt";
import { useOrders, useProducts, useCustomers } from "@/lib/data";
import {
  currency,
  dayKey,
  orderTotals,
  statusTone,
  ORDER_STATUSES,
  type Order,
} from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { COURIER_LABEL, courierStatusLabel, courierStatusTone } from "@/lib/courier";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Dashboard — Muuchstac Glow BD Control Panel" },
      {
        name: "description",
        content:
          "Daily revenue, profit, order pipeline and low-stock alerts for your cosmetics shop.",
      },
      { property: "og:title", content: "Dashboard — Muuchstac Glow BD Control Panel" },
      {
        property: "og:description",
        content:
          "Daily revenue, profit, order pipeline and low-stock alerts for your cosmetics shop.",
      },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  featured,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface surface-hover relative overflow-hidden p-5",
        featured && "rose-gradient",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="num mt-4 font-display text-3xl font-bold leading-none tracking-tight">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const { data: orders = [], isLoading } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();

  const stats = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let pendingValue = 0;
    for (const o of orders) {
      const t = orderTotals(o as Order);
      if (o.status === "delivered") {
        revenue += t.total;
        profit += t.profit;
      } else if (o.status !== "cancelled" && o.status !== "returned") {
        pendingValue += t.total;
      }
    }
    return { revenue, profit, pendingValue };
  }, [orders]);

  const chart = useMemo(() => {
    const days: { day: string; revenue: number; orders: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ day: dayKey(d), revenue: 0, orders: 0 });
    }
    const map = new Map(days.map((d) => [d.day, d]));
    for (const o of orders) {
      const row = map.get(dayKey(o.created_at));
      if (!row) continue;
      row.orders += 1;
      if (o.status === "delivered") row.revenue += orderTotals(o as Order).total;
    }
    return days.map((d) => ({ ...d, label: d.day.slice(5) }));
  }, [orders]);

  const pipeline = useMemo(
    () =>
      ORDER_STATUSES.map((s) => ({
        status: s,
        count: orders.filter((o) => o.status === s).length,
      })),
    [orders],
  );

  const courierBuckets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders as Order[]) {
      const key = (o as { courier_status?: string | null }).courier_status ?? "__not_sent";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const order = [
      "__not_sent",
      "pending",
      "in_review",
      "hold",
      "delivered",
      "partial_delivered",
      "returned",
      "cancelled",
    ];
    const known = order
      .filter((k) => counts.has(k))
      .map((k) => ({
        key: k,
        label: k === "__not_sent" ? "Not sent yet" : courierStatusLabel(k),
        tone: k === "__not_sent" ? courierStatusTone(null) : courierStatusTone(k),
        count: counts.get(k) ?? 0,
      }));
    const extra = [...counts.entries()]
      .filter(([k]) => !order.includes(k))
      .map(([k, count]) => ({
        key: k,
        label: courierStatusLabel(k),
        tone: courierStatusTone(k),
        count,
      }));
    return [...known, ...extra];
  }, [orders]);


  const today = useMemo(() => {
    const key = dayKey(new Date());
    const list = (orders as Order[]).filter((o) => dayKey(o.created_at) === key);
    let revenue = 0;
    let profit = 0;
    for (const o of list) {
      if (o.status === "cancelled" || o.status === "returned") continue;
      const t = orderTotals(o);
      revenue += t.total;
      profit += t.profit;
    }
    return { count: list.length, revenue, profit, toShip: list.filter((o) => o.status === "confirmed").length };
  }, [orders]);

  const pipelineMax = Math.max(1, ...pipeline.map((p) => p.count));
  const lowStock = products.filter((p) => p.stock <= p.low_stock_threshold);
  const recent = orders.slice(0, 8);

  return (
    <AppShell
      title="Dashboard"
      subtitle={
        isLoading ? "Loading your shop…" : `${orders.length} orders · ${customers.length} customers`
      }
      actions={
        <Button asChild className="rounded-xl">
          <Link to="/orders">New order</Link>
        </Button>
      }
    >
      <OnboardingPrompt />

      {isLoading && (
        <div className="mb-4 space-y-4">
          <StatGridSkeleton />
          <ChartSkeleton height={220} />
        </div>
      )}

      <div className="surface mb-4 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <div>
          <p className="eyebrow">Today · orders</p>
          <p className="num mt-1 font-display text-2xl font-bold leading-none">{today.count}</p>
        </div>
        <div>
          <p className="eyebrow">Today · sales</p>
          <p className="num mt-1 font-display text-2xl font-bold leading-none">
            {currency(today.revenue)}
          </p>
        </div>
        <div>
          <p className="eyebrow">Today · profit</p>
          <p className="num mt-1 font-display text-2xl font-bold leading-none">
            {currency(today.profit)}
          </p>
        </div>
        <div>
          <p className="eyebrow">Ready to ship</p>
          <p className="num mt-1 font-display text-2xl font-bold leading-none">{today.toShip}</p>
        </div>
      </div>

      <div className="bento">

        {/* KPI row */}
        <div className="xl:col-span-3">
          <Kpi
            label="Delivered revenue"
            value={currency(stats.revenue)}
            hint="Only delivered orders"
            icon={Wallet}
            featured
          />
        </div>
        <div className="xl:col-span-3">
          <Kpi
            label="Net profit"
            value={currency(stats.profit)}
            hint="After cost, packaging & discount"
            icon={TrendingUp}
          />
        </div>
        <div className="xl:col-span-2">
          <Kpi
            label="In pipeline"
            value={currency(stats.pendingValue)}
            hint="Pending → shipped"
            icon={ShoppingBag}
          />
        </div>
        <div className="xl:col-span-2">
          <Kpi
            label="Low stock"
            value={String(lowStock.length)}
            hint="At or below threshold"
            icon={PackageX}
          />
        </div>
        <div className="xl:col-span-2">
          <Kpi
            label="Customers"
            value={String(customers.length)}
            hint="Saved in your book"
            icon={Users}
          />
        </div>

        {/* Chart */}
        <div className="surface p-5 sm:col-span-2 xl:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Last 14 days</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-primary">
              Revenue
            </span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => currency(v)}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline */}
        <div className="surface p-5 xl:col-span-2">
          <h2 className="text-lg">Order pipeline</h2>
          <ul className="mt-4 space-y-3">
            {pipeline.map((p) => (
              <li key={p.status} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${statusTone(p.status)}`}
                  >
                    {p.status}
                  </span>
                  <span className="num font-semibold">{p.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full gold-gradient transition-all duration-500"
                    style={{ width: `${(p.count / pipelineMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Courier parcels */}
        <div className="surface p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">{COURIER_LABEL} parcels</h2>
            <Link
              to="/orders"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Refresh in orders <ArrowUpRight className="size-3" />
            </Link>
          </div>
          {courierBuckets.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No parcels yet.</p>
          ) : (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {courierBuckets.map((b) => (
                <li
                  key={b.key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                >
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${b.tone}`}>
                    {b.label}
                  </span>
                  <span className="num font-semibold">{b.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>



        {/* Recent orders */}
        <div className="surface overflow-hidden sm:col-span-2 xl:col-span-4">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg">Recent orders</h2>
            <Link
              to="/orders"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View all <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">#</th>
                  <th className="px-5 py-2.5 font-semibold">Customer</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                      No orders yet.
                    </td>
                  </tr>
                )}
                {recent.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-border/60 transition-colors hover:bg-accent/40"
                  >
                    <td className="num px-5 py-2.5 text-muted-foreground">{o.order_no}</td>
                    <td className="px-5 py-2.5">
                      <Link
                        to="/orders/$id"
                        params={{ id: o.id }}
                        className="font-medium hover:text-primary"
                      >
                        {o.customer_name || "Walk-in"}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusTone(o.status)}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="num px-5 py-2.5 text-right font-semibold">
                      {currency(orderTotals(o as Order).total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low stock */}
        <div className="surface flex flex-col p-5 xl:col-span-2">
          <h2 className="text-lg">Low stock</h2>
          <ul className="mt-3 flex-1 space-y-2.5 text-sm">
            {lowStock.length === 0 && (
              <li className="text-muted-foreground">Everything is well stocked.</li>
            )}
            {lowStock.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span className="truncate">{p.name}</span>
                <span className="num rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  {p.stock} left
                </span>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-4 w-full rounded-xl">
            <Link to="/products">Manage inventory</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
