import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Download,
  LineChart as LineChartIcon,
  PackageSearch,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Grid, Panel, Section, Stack, Eyebrow, EmptyState, Pill } from "@/components/ds";
import { ChartSkeleton, StatGridSkeleton } from "@/components/ds/skeletons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomers, useExpenses, useOrders, useProducts } from "@/lib/data";
import {
  currency,
  countsRevenue,
  orderTotals,
  ORDER_SOURCES,
  type Order,
  type Product,
} from "@/lib/shop";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Muuchstac Glow BD Control Panel" },
      {
        name: "description",
        content:
          "See sales trends, best selling products, order sources and repeat customers for your cosmetics shop.",
      },
      { property: "og:title", content: "Analytics — Muuchstac Glow BD Control Panel" },
      {
        property: "og:description",
        content: "Sales trends, top products, order sources and repeat customer share.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
] as const;

const METRICS = [
  { key: "revenue", label: "Revenue" },
  { key: "orders", label: "Orders" },
] as const;
type MetricKey = (typeof METRICS)[number]["key"];

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const EXPENSE_GROUPS = [
  { key: "ads", label: "Ads", match: ["ads"] },
  { key: "packaging", label: "Packaging", match: ["packaging"] },
  { key: "delivery", label: "Delivery", match: ["delivery"] },
  { key: "people", label: "Salary & rent", match: ["salary", "rent"] },
  { key: "other", label: "Other", match: [] },
] as const;

const CHART_TOOLTIP = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.9rem",
  boxShadow: "var(--shadow-raised)",
  fontSize: "0.75rem",
};

function dayLabel(key: string) {
  const d = new Date(key);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function TrendBadge({ delta, suffix }: { delta: number | null; suffix: string }) {
  if (delta === null) return null;
  const up = delta >= 0;
  return (
    <p
      className={cn(
        "mt-2 inline-flex items-center gap-1 text-caption font-medium",
        up ? "text-success" : "text-destructive",
      )}
    >
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      <span className="num">{Math.abs(delta).toFixed(1)}%</span>
      <span className="text-muted-foreground">{suffix}</span>
    </p>
  );
}

function AnalyticsPage() {
  const { data: orders = [], isLoading } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: expenses = [] } = useExpenses();
  const { data: customers = [] } = useCustomers();
  const [days, setDays] = useState<number>(30);
  const [source, setSource] = useState<string>("all");
  const [metric, setMetric] = useState<MetricKey>("revenue");
  const [drillDay, setDrillDay] = useState<string | null>(null);

  const stats = useMemo(() => {
    const now = Date.now();
    const start = now - days * 86_400_000;
    const prevStart = start - days * 86_400_000;
    const all = (orders as Order[]).filter((o) => source === "all" || o.source === source);

    const inRange = all.filter((o) => new Date(o.created_at).getTime() >= start);
    const prevRange = all.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= prevStart && t < start;
    });

    const revenueOf = (list: Order[]) =>
      list.filter((o) => countsRevenue(o.status)).reduce((s, o) => s + orderTotals(o).total, 0);

    const revenue = revenueOf(inRange);
    const prevRevenue = revenueOf(prevRange);
    const pct = (now2: number, prev: number) => (prev > 0 ? ((now2 - prev) / prev) * 100 : null);

    const byDay = new Map<string, { revenue: number; orders: number }>();
    const buckets = Math.min(days, 120);
    const step = Math.ceil(days / buckets);
    for (let i = days - 1; i >= 0; i -= step) {
      const key = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
      byDay.set(key, { revenue: 0, orders: 0 });
    }
    const keys = [...byDay.keys()];
    const bucketFor = (iso: string) => {
      let found = keys[0];
      for (const k of keys) if (k <= iso) found = k;
      return found;
    };
    for (const o of inRange) {
      const key = bucketFor(new Date(o.created_at).toISOString().slice(0, 10));
      const row = key ? byDay.get(key) : undefined;
      if (!row) continue;
      row.orders += 1;
      if (countsRevenue(o.status)) row.revenue += orderTotals(o).total;
    }

    const productSales = new Map<
      string,
      { id: string | null; name: string; qty: number; revenue: number }
    >();
    for (const o of inRange) {
      if (!countsRevenue(o.status)) continue;
      for (const item of o.order_items ?? []) {
        const key = item.product_id ?? item.product_name;
        const row = productSales.get(key) ?? {
          id: item.product_id ?? null,
          name: item.product_name,
          qty: 0,
          revenue: 0,
        };
        row.qty += item.qty;
        row.revenue += item.qty * item.unit_price;
        productSales.set(key, row);
      }
    }

    const sourceCount = new Map<string, number>();
    for (const o of inRange) {
      sourceCount.set(o.source ?? "other", (sourceCount.get(o.source ?? "other") ?? 0) + 1);
    }

    const phoneCount = new Map<string, number>();
    for (const o of all) {
      if (!o.customer_phone) continue;
      phoneCount.set(o.customer_phone, (phoneCount.get(o.customer_phone) ?? 0) + 1);
    }
    const repeat = [...phoneCount.values()].filter((c) => c > 1).length;

    const delivered = inRange.filter((o) => o.status === "delivered").length;
    const returned = inRange.filter((o) => o.status === "returned").length;

    return {
      revenue,
      revenueDelta: pct(revenue, prevRevenue),
      orderCount: inRange.length,
      orderDelta: pct(inRange.length, prevRange.length),
      aov: inRange.length ? revenue / inRange.length : 0,
      series: [...byDay.entries()].map(([key, v]) => ({ day: dayLabel(key), key, ...v })),
      average:
        byDay.size > 0
          ? [...byDay.values()].reduce(
              (s2, v) => s2 + (metric === "revenue" ? v.revenue : v.orders),
              0,
            ) / byDay.size
          : 0,
      topProducts: [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      sources: [...sourceCount.entries()].map(([name, value]) => ({ name, value })),
      repeatShare: phoneCount.size ? (repeat / phoneCount.size) * 100 : 0,
      deliveryRate: delivered + returned ? (delivered / (delivered + returned)) * 100 : 0,
      lowStock: (products as Product[]).filter((p) => p.stock <= p.low_stock_threshold).length,
      inRange,
    };
  }, [orders, products, days, source, metric]);

  const monthly = useMemo(() => {
    const now = new Date();
    type MonthRow = {
      key: string;
      label: string;
      revenue: number;
      ads: number;
      packaging: number;
      delivery: number;
      people: number;
      other: number;
    };
    const rows: MonthRow[] = [];
    const index = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = {
        key,
        label: d.toLocaleDateString("en-GB", { month: "short" }),
        revenue: 0,
        ads: 0,
        packaging: 0,
        delivery: 0,
        people: 0,
        other: 0,
      };
      index.set(key, rows.length);
      rows.push(row);
    }
    let total = 0;
    for (const e of expenses) {
      const i = index.get(e.spent_on.slice(0, 7));
      if (i === undefined) continue;
      const group =
        EXPENSE_GROUPS.find((g) => (g.match as readonly string[]).includes(e.category))?.key ??
        "other";
      const target = rows[i]! as unknown as Record<string, number>;
      target[group] = (target[group] ?? 0) + Number(e.amount);
      total += Number(e.amount);
    }
    for (const o of orders) {
      if (!countsRevenue(o.status)) continue;
      const i = index.get(o.created_at.slice(0, 7));
      if (i === undefined) continue;
      rows[i]!.revenue = (rows[i]!.revenue ?? 0) + orderTotals(o).total;
    }
    const last = rows[rows.length - 1];
    const thisMonth = last
      ? EXPENSE_GROUPS.reduce(
          (s2, g) => s2 + ((last as unknown as Record<string, number>)[g.key] ?? 0),
          0,
        )
      : 0;
    return { rows, total, thisMonth };
  }, [expenses, orders]);

  const split = useMemo(() => {
    const firstByPhone = new Map<string, string>();
    for (const o of orders) {
      const phone = o.customer_phone;
      if (!phone) continue;
      const cur = firstByPhone.get(phone);
      if (!cur || o.created_at < cur) firstByPhone.set(phone, o.created_at);
    }
    const keys = stats.series.map((s2) => s2.key);
    const rows = stats.series.map((s2) => ({
      day: s2.day,
      key: s2.key,
      newRevenue: 0,
      returningRevenue: 0,
    }));
    const idxFor = (iso: string) => {
      let found = 0;
      keys.forEach((k, i) => {
        if (k <= iso) found = i;
      });
      return found;
    };

    const byCustomer = new Map<
      string,
      {
        key: string;
        id: string | null;
        name: string;
        orders: number;
        revenue: number;
        returning: boolean;
      }
    >();
    const byPhoneId = new Map<string, string>();
    for (const c of customers) {
      if (c.phone) byPhoneId.set(c.phone, c.id);
    }

    let newTotal = 0;
    let returningTotal = 0;
    for (const o of stats.inRange) {
      if (!countsRevenue(o.status)) continue;
      const value = orderTotals(o).total;
      const phone = o.customer_phone ?? "";
      const isReturning = phone ? firstByPhone.get(phone) !== o.created_at : false;
      const row = rows[idxFor(o.created_at.slice(0, 10))];
      if (row) {
        if (isReturning) row.returningRevenue += value;
        else row.newRevenue += value;
      }
      if (isReturning) returningTotal += value;
      else newTotal += value;

      const ck = phone || o.customer_name || o.id;
      const entry = byCustomer.get(ck) ?? {
        key: ck,
        id: o.customer_id ?? (phone ? (byPhoneId.get(phone) ?? null) : null),
        name: o.customer_name || phone || "Walk-in",
        orders: 0,
        revenue: 0,
        returning: false,
      };
      entry.orders += 1;
      entry.revenue += value;
      entry.returning = entry.returning || isReturning;
      byCustomer.set(ck, entry);
    }

    const totalRevenue = newTotal + returningTotal;
    return {
      rows,
      topCustomers: [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      returningShare: totalRevenue > 0 ? (returningTotal / totalRevenue) * 100 : 0,
    };
  }, [orders, customers, stats.series, stats.inRange]);

  const drillOrders = useMemo(() => {
    if (!drillDay) return [];
    return stats.inRange.filter((o) => o.created_at.slice(0, 10) === drillDay);
  }, [drillDay, stats.inRange]);

  const hasData = stats.orderCount > 0;

  return (
    <AppShell
      title="Analytics"
      subtitle="Where your sales are coming from and what is selling best."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(`sales-${days}-days`, stats.series)}
        >
          <Download className="size-4" aria-hidden="true" /> Export
        </Button>
      }
    >
      <Stack gap="section">
        <Panel padding="sm" className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Date range">
            {RANGES.map((r) => (
              <Button
                key={r.days}
                size="sm"
                role="radio"
                aria-checked={days === r.days}
                variant={days === r.days ? "default" : "ghost"}
                onClick={() => {
                  setDays(r.days);
                  setDrillDay(null);
                }}
              >
                {r.label}
              </Button>
            ))}
          </div>

          <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Chart metric">
            {METRICS.map((m) => (
              <Button
                key={m.key}
                size="sm"
                role="radio"
                aria-checked={metric === m.key}
                variant={metric === m.key ? "secondary" : "ghost"}
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </Button>
            ))}
          </div>

          <div className="ms-auto">
            <Select
              value={source}
              onValueChange={(v) => {
                setSource(v);
                setDrillDay(null);
              }}
            >
              <SelectTrigger className="h-9 w-44" aria-label="Filter by order source">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {ORDER_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Panel>

        {isLoading ? (
          <>
            <StatGridSkeleton />
            <ChartSkeleton />
            <div className="grid gap-gutter lg:grid-cols-2">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </>
        ) : !hasData ? (
          <EmptyState
            icon={PackageSearch}
            title="No orders in this period yet"
            description="Once orders start coming in, your sales trend, best sellers and customer insights will appear here."
            action={
              <Button asChild size="sm">
                <Link to="/orders">Go to orders</Link>
              </Button>
            }
          />
        ) : (
          <>
            <Grid cols={4} className="stagger-in">
              <Panel interactive>
                <Eyebrow>Revenue</Eyebrow>
                <p className="num mt-1 text-display font-semibold leading-none">
                  {currency(stats.revenue)}
                </p>
                <TrendBadge delta={stats.revenueDelta} suffix={`vs previous ${days} days`} />
              </Panel>
              <Panel interactive>
                <Eyebrow>Orders</Eyebrow>
                <p className="num mt-1 text-display font-semibold leading-none">
                  {stats.orderCount}
                </p>
                <TrendBadge delta={stats.orderDelta} suffix={`vs previous ${days} days`} />
                <p className="mt-1 text-caption text-muted-foreground">
                  Average order {currency(stats.aov)}
                </p>
              </Panel>
              <Panel interactive>
                <Eyebrow>Delivery success</Eyebrow>
                <p className="num mt-1 text-display font-semibold leading-none">
                  {stats.deliveryRate.toFixed(0)}%
                </p>
                <p className="mt-2 text-caption text-muted-foreground">
                  Delivered vs returned parcels
                </p>
              </Panel>
              <Panel interactive>
                <Eyebrow>Repeat customers</Eyebrow>
                <p className="num mt-1 text-display font-semibold leading-none">
                  {stats.repeatShare.toFixed(0)}%
                </p>
                <p className="mt-2 text-caption text-muted-foreground">
                  {stats.lowStock} products need restock
                </p>
              </Panel>
            </Grid>

            <Section
              title="Sales timeline"
              description="Bars are daily orders, the glowing line is money in. Select any point to open that day. Drag the slider under the chart to zoom."
            >
              <Panel padding="lg">
                <div
                  className="h-[22rem] w-full"
                  role="img"
                  aria-label={`${metric} timeline chart`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={stats.series}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      onClick={(e: { activeLabel?: string; activePayload?: unknown[] }) => {
                        const payload = e?.activePayload?.[0] as
                          { payload?: { key?: string } } | undefined;
                        if (payload?.payload?.key) setDrillDay(payload.payload.key);
                      }}
                    >
                      <defs>
                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                          <stop offset="55%" stopColor="var(--color-chart-1)" stopOpacity={0.16} />
                          <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.75} />
                          <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--color-border)"
                      />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        stroke="var(--color-muted-foreground)"
                        minTickGap={16}
                      />
                      <YAxis
                        yAxisId="left"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        stroke="var(--color-muted-foreground)"
                        width={54}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        stroke="var(--color-muted-foreground)"
                        width={36}
                      />
                      <Tooltip
                        cursor={{ stroke: "var(--color-primary)", strokeWidth: 1 }}
                        contentStyle={CHART_TOOLTIP}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ fontSize: "0.75rem", paddingBottom: 8 }}
                      />
                      <ReferenceLine
                        yAxisId="left"
                        y={stats.average}
                        stroke="var(--color-chart-4)"
                        strokeDasharray="5 5"
                        label={{
                          value: "avg",
                          position: "insideTopRight",
                          fill: "var(--color-muted-foreground)",
                          fontSize: 11,
                        }}
                      />
                      <Bar
                        yAxisId="right"
                        name={metric === "revenue" ? "Orders" : "Revenue"}
                        dataKey={metric === "revenue" ? "orders" : "revenue"}
                        fill="url(#barFill)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={22}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        name={metric === "revenue" ? "Revenue" : "Orders"}
                        dataKey={metric}
                        stroke="var(--color-chart-1)"
                        strokeWidth={2.5}
                        fill="url(#revFill)"
                        activeDot={{ r: 5 }}
                      />
                      <Brush
                        dataKey="day"
                        height={26}
                        travellerWidth={8}
                        stroke="var(--color-chart-1)"
                        fill="color-mix(in oklab, var(--color-primary) 6%, transparent)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </Section>

            <Section
              title="Monthly spending"
              description="Last 12 months of costs by kind, with money in as the line on top."
            >
              <Panel padding="lg">
                {monthly.total === 0 ? (
                  <EmptyState
                    icon={Wallet}
                    title="No expenses recorded yet"
                    description="Add costs on the Expenses page, or bring your old expense book in from the Data import page."
                    action={
                      <Button asChild size="sm">
                        <Link to="/import">Import expenses</Link>
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <div className="h-80 w-full" role="img" aria-label="Monthly expenses chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthly.rows} margin={{ top: 8, right: 8, left: 0 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="var(--color-border)"
                          />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                            stroke="var(--color-muted-foreground)"
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                            stroke="var(--color-muted-foreground)"
                            width={60}
                          />
                          <Tooltip
                            cursor={{
                              fill: "color-mix(in oklab, var(--color-primary) 8%, transparent)",
                            }}
                            contentStyle={CHART_TOOLTIP}
                          />
                          <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            wrapperStyle={{ fontSize: "0.75rem", paddingBottom: 8 }}
                          />
                          {EXPENSE_GROUPS.map((g, i) => (
                            <Bar
                              key={g.key}
                              dataKey={g.key}
                              name={g.label}
                              stackId="spend"
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                              radius={
                                i === EXPENSE_GROUPS.length - 1
                                  ? ([6, 6, 0, 0] as [number, number, number, number])
                                  : 0
                              }
                              maxBarSize={38}
                            />
                          ))}
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Money in"
                            stroke="var(--color-chart-1)"
                            strokeWidth={2.5}
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-caption text-muted-foreground">
                      <span>
                        12-month spend{" "}
                        <span className="num font-semibold text-foreground">
                          {currency(monthly.total)}
                        </span>
                      </span>
                      <span>
                        This month{" "}
                        <span className="num font-semibold text-foreground">
                          {currency(monthly.thisMonth)}
                        </span>
                      </span>
                      <Link to="/expenses" className="text-primary hover:underline">
                        Open expense book
                      </Link>
                    </div>
                  </>
                )}
              </Panel>
            </Section>

            <Section
              title="New vs returning customers"
              description="How much of each day's money comes from first-time buyers against people coming back."
            >
              <div className="grid gap-gutter lg:grid-cols-[1.6fr_1fr]">
                <Panel padding="lg">
                  <div
                    className="h-72 w-full"
                    role="img"
                    aria-label="New versus returning customer revenue"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={split.rows} margin={{ top: 8, right: 8, left: 0 }}>
                        <defs>
                          <linearGradient id="newFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.6} />
                            <stop
                              offset="100%"
                              stopColor="var(--color-chart-2)"
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                          <linearGradient id="retFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-chart-5)" stopOpacity={0.6} />
                            <stop
                              offset="100%"
                              stopColor="var(--color-chart-5)"
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="var(--color-border)"
                        />
                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                          stroke="var(--color-muted-foreground)"
                          minTickGap={16}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                          stroke="var(--color-muted-foreground)"
                          width={54}
                        />
                        <Tooltip contentStyle={CHART_TOOLTIP} />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          iconType="circle"
                          wrapperStyle={{ fontSize: "0.75rem", paddingBottom: 8 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="newRevenue"
                          name="First-time"
                          stackId="split"
                          stroke="var(--color-chart-2)"
                          strokeWidth={2}
                          fill="url(#newFill)"
                        />
                        <Area
                          type="monotone"
                          dataKey="returningRevenue"
                          name="Returning"
                          stackId="split"
                          stroke="var(--color-chart-5)"
                          strokeWidth={2}
                          fill="url(#retFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <Panel padding="lg">
                  <Eyebrow>Top customers in this period</Eyebrow>
                  {split.topCustomers.length === 0 ? (
                    <p className="mt-3 text-caption text-muted-foreground">
                      No customer sales in this period yet.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {split.topCustomers.map((c) => (
                        <li key={c.key} className="flex items-center justify-between gap-3">
                          <span className="min-w-0">
                            {c.id ? (
                              <Link
                                to="/customers/$id"
                                params={{ id: c.id }}
                                className="block truncate text-caption font-medium hover:text-primary hover:underline"
                              >
                                {c.name}
                              </Link>
                            ) : (
                              <span className="block truncate text-caption font-medium">
                                {c.name}
                              </span>
                            )}
                            <span className="block text-caption text-muted-foreground">
                              {c.orders} order(s) · {c.returning ? "returning" : "first-time"}
                            </span>
                          </span>
                          <span className="num shrink-0 text-caption font-semibold">
                            {currency(c.revenue)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-4 text-caption text-muted-foreground">
                    {split.returningShare.toFixed(0)}% of this period's money came from customers
                    who bought before.
                  </p>
                </Panel>
              </div>
            </Section>

            {drillDay && (
              <Section
                title={`Orders on ${dayLabel(drillDay)}`}
                description={`${drillOrders.length} order(s) in this day.`}
                actions={
                  <Button size="sm" variant="ghost" onClick={() => setDrillDay(null)}>
                    <X className="size-4" aria-hidden="true" /> Close
                  </Button>
                }
              >
                <Panel padding="lg">
                  {drillOrders.length === 0 ? (
                    <p className="text-caption text-muted-foreground">No orders on this day.</p>
                  ) : (
                    <ul className="divide-y divide-border/70">
                      {drillOrders.map((o) => (
                        <li key={o.id}>
                          <Link
                            to="/orders/$id"
                            params={{ id: o.id }}
                            className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-accent"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-body font-medium">
                                #{o.order_no} · {o.customer_name}
                              </span>
                              <span className="block text-caption text-muted-foreground">
                                {o.customer_phone}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-3">
                              <Pill>{o.status.replace(/_/g, " ")}</Pill>
                              <span className="num text-body font-semibold">
                                {currency(orderTotals(o).total)}
                              </span>
                              <ArrowRight
                                className="size-4 text-muted-foreground"
                                aria-hidden="true"
                              />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </Section>
            )}

            <div className="grid gap-gutter lg:grid-cols-2">
              <Section title="Best sellers" description="By revenue in the selected period.">
                <Panel padding="lg">
                  {stats.topProducts.length === 0 ? (
                    <EmptyState
                      icon={LineChartIcon}
                      title="No product sales yet"
                      description="Confirmed orders will show your best selling products here."
                    />
                  ) : (
                    <>
                      <div className="h-72 w-full" role="img" aria-label="Best selling products">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.topProducts} layout="vertical">
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                              stroke="var(--color-border)"
                            />
                            <XAxis
                              type="number"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11 }}
                              stroke="var(--color-muted-foreground)"
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={110}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11 }}
                              stroke="var(--color-muted-foreground)"
                            />
                            <Tooltip
                              cursor={{
                                fill: "color-mix(in oklab, var(--color-primary) 8%, transparent)",
                              }}
                              contentStyle={CHART_TOOLTIP}
                            />
                            <Bar
                              dataKey="revenue"
                              fill="var(--color-chart-2)"
                              radius={[0, 8, 8, 0]}
                              maxBarSize={26}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <ul className="mt-4 space-y-1.5">
                        {stats.topProducts.map((p) => (
                          <li key={p.name} className="flex items-center justify-between gap-3">
                            {p.id ? (
                              <Link
                                to="/products/$id"
                                params={{ id: p.id }}
                                className="truncate rounded-md text-caption hover:text-primary hover:underline"
                              >
                                {p.name}
                              </Link>
                            ) : (
                              <span className="truncate text-caption">{p.name}</span>
                            )}
                            <span className="num shrink-0 text-caption text-muted-foreground">
                              {p.qty} pcs · {currency(p.revenue)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Panel>
              </Section>

              <Section title="Where orders come from" description="Order sources share.">
                <Panel padding="lg">
                  <div className="h-72 w-full" role="img" aria-label="Order sources share">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.sources}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={100}
                          paddingAngle={3}
                          onClick={(d: { name?: string }) => d?.name && setSource(d.name)}
                        >
                          {stats.sources.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={CHART_TOOLTIP} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-3">
                    {stats.sources.map((s, i) => (
                      <li key={s.name}>
                        <button
                          type="button"
                          onClick={() => setSource(s.name)}
                          className="flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-caption transition-colors hover:bg-accent"
                          aria-label={`Filter by ${s.name.replace(/_/g, " ")}`}
                        >
                          <span
                            className="size-2.5 rounded-full"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                            aria-hidden="true"
                          />
                          {s.name.replace(/_/g, " ")} · <span className="num">{s.value}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </Section>
            </div>
          </>
        )}
      </Stack>
    </AppShell>
  );
}
