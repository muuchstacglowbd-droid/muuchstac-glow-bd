import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import {
  useAdSpends,
  useDailyEntries,
  useExpenses,
  useOrders,
  useParcelReturns,
  useSaveDailyEntry,
  useTableMutation,
  type ParcelReturn,
} from "@/lib/data";
import { currency, DELIVERY_ZONES } from "@/lib/shop";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildDailyProfit,
  daysToCsv,
  shiftDays,
  sumDays,
  todayKey,
} from "@/lib/profit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profit")({
  head: () => ({
    meta: [
      { title: "Daily Profit & Returns — Rose Nude" },
      {
        name: "description",
        content:
          "Track daily ad cost, packaging, product cost, parcels sent and returns to see the exact net profit for any day, week, month or custom date range.",
      },
      { property: "og:title", content: "Daily Profit & Returns — Rose Nude" },
      {
        property: "og:description",
        content:
          "Day-by-day net profit: sales minus product cost, ad spend, packaging, other costs and return courier charges.",
      },
    ],
  }),
  component: ProfitPage,
});

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: -1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "6 months", days: 180 },
] as const;

function ProfitPage() {
  const today = todayKey();
  const [from, setFrom] = useState(shiftDays(today, -6));
  const [to, setTo] = useState(today);
  const [activePreset, setActivePreset] = useState<string>("7 days");

  const { data: orders = [] } = useOrders();
  const { data: entries = [] } = useDailyEntries();
  const { data: returns = [] } = useParcelReturns();
  const { data: expenses = [] } = useExpenses();
  const { data: adSpends = [] } = useAdSpends();

  const saveEntry = useSaveDailyEntry();
  const returnMutation = useTableMutation("parcel_returns", ["parcel_returns"]);

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    entry_date: today,
    ad_cost: "",
    packaging_cost: "",
    other_cost: "",
    shipping_cost: "",
    manual_parcels: "",
    manual_revenue: "",
    manual_cogs: "",
    ret_qty: "",
    ret_courier: "",
    ret_refunded: "",
    ret_cogs_back: "",
    note: "",
  });


  const [productFilter, setProductFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const filtering =
    productFilter !== "all" || customerFilter !== "all" || zoneFilter !== "all";

  const productOptions = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) for (const i of o.order_items ?? []) s.add(i.product_name);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const customerOptions = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) if (o.customer_name) s.add(o.customer_name);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (zoneFilter !== "all" && (o.delivery_zone ?? "inside_dhaka") !== zoneFilter)
          return false;
        if (customerFilter !== "all" && (o.customer_name ?? "") !== customerFilter)
          return false;
        if (
          productFilter !== "all" &&
          !(o.order_items ?? []).some((i) => i.product_name === productFilter)
        )
          return false;
        return true;
      }),
    [orders, zoneFilter, customerFilter, productFilter],
  );

  const days = useMemo(
    () =>
      buildDailyProfit(
        {
          orders: filteredOrders,
          entries: filtering ? [] : entries,
          returns: filtering ? [] : returns,
          expenses: filtering ? [] : expenses,
          adSpends: filtering ? [] : adSpends,
        },
        from <= to ? from : to,
        to >= from ? to : from,
      ),
    [filteredOrders, filtering, entries, returns, expenses, adSpends, from, to],
  );
  const totals = useMemo(() => sumDays(days), [days]);
  const rows = useMemo(() => [...days].reverse(), [days]);

  const chartData = useMemo(
    () => days.map((d) => ({ date: d.date.slice(5), profit: Math.round(d.netProfit) })),
    [days],
  );

  const autoForEntryDate = useMemo(() => {
    const d = buildDailyProfit(
      { orders, entries: [], returns: [], expenses: [], adSpends: [] },
      entryForm.entry_date,
      entryForm.entry_date,
    )[0];
    return d;
  }, [orders, entryForm.entry_date]);

  // Return amounts are derived automatically from the day the parcels were sent:
  // per-parcel sale value and per-parcel buy cost of that day x returned parcels.
  const autoReturn = useMemo(() => {
    const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const parcels =
      entryForm.manual_parcels.trim() !== ""
        ? Math.round(num(entryForm.manual_parcels))
        : (autoForEntryDate?.autoParcels ?? 0);
    const revenue =
      entryForm.manual_revenue.trim() !== ""
        ? num(entryForm.manual_revenue)
        : (autoForEntryDate?.autoRevenue ?? 0);
    const cogs =
      entryForm.manual_cogs.trim() !== ""
        ? num(entryForm.manual_cogs)
        : (autoForEntryDate?.autoCogs ?? 0);
    const rawQty = Math.round(num(entryForm.ret_qty));
    const qty = Math.max(0, parcels > 0 ? Math.min(rawQty, parcels) : rawQty);
    const perParcelRevenue = parcels > 0 ? revenue / parcels : 0;
    const perParcelCogs = parcels > 0 ? cogs / parcels : 0;
    return {
      qty,
      perParcelRevenue,
      perParcelCogs,
      refunded: perParcelRevenue * qty,
      cogsBack: perParcelCogs * qty,
    };
  }, [
    autoForEntryDate,
    entryForm.manual_parcels,
    entryForm.manual_revenue,
    entryForm.manual_cogs,
    entryForm.ret_qty,
  ]);


  const draftDay = useMemo(() => {
    const n = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const nn = (v: string) => (v.trim() === "" ? null : n(v));
    const draftEntry = {
      id: "draft",
      entry_date: entryForm.entry_date,
      ad_cost: n(entryForm.ad_cost),
      packaging_cost: n(entryForm.packaging_cost),
      other_cost: n(entryForm.other_cost),
      shipping_cost: n(entryForm.shipping_cost),
      manual_parcels: nn(entryForm.manual_parcels),
      manual_revenue: nn(entryForm.manual_revenue),
      manual_cogs: nn(entryForm.manual_cogs),
      note: null,
    };
    const draftReturn = {
      id: "draft-return",
      order_id: null,
      sent_date: entryForm.entry_date,
      returned_on: entryForm.entry_date,
      qty: autoReturn.qty,
      refunded_revenue: autoReturn.refunded,
      cogs_back: autoReturn.cogsBack,
      courier_cost: n(entryForm.ret_courier),
      note: null,
    };
    return buildDailyProfit(
      {
        orders,
        entries: [draftEntry],
        returns: [draftReturn],
        expenses,
        adSpends,
      },
      entryForm.entry_date,
      entryForm.entry_date,
    )[0];
  }, [orders, expenses, adSpends, entryForm, autoReturn]);


  function applyPreset(label: string, days_: number) {
    setActivePreset(label);
    if (days_ === 0) {
      setFrom(today);
      setTo(today);
    } else if (days_ === -1) {
      setFrom(shiftDays(today, -1));
      setTo(shiftDays(today, -1));
    } else {
      setFrom(shiftDays(today, -(days_ - 1)));
      setTo(today);
    }
  }

  function openEntry(date: string) {
    const existing = entries.find((e) => e.entry_date === date);
    const rs = returns.filter((r) => r.sent_date === date);
    const sum = (f: (r: ParcelReturn) => number) => rs.reduce((a, r) => a + (f(r) || 0), 0);
    setEntryForm({
      entry_date: date,
      ad_cost: existing ? String(existing.ad_cost) : "",
      packaging_cost: existing ? String(existing.packaging_cost) : "",
      other_cost: existing ? String(existing.other_cost) : "",
      shipping_cost: existing ? String(existing.shipping_cost ?? 0) : "",
      manual_parcels: existing?.manual_parcels != null ? String(existing.manual_parcels) : "",
      manual_revenue: existing?.manual_revenue != null ? String(existing.manual_revenue) : "",
      manual_cogs: existing?.manual_cogs != null ? String(existing.manual_cogs) : "",
      ret_qty: rs.length ? String(sum((r) => r.qty)) : "",
      ret_courier: rs.length ? String(sum((r) => Number(r.courier_cost))) : "",
      ret_refunded: rs.length ? String(sum((r) => Number(r.refunded_revenue))) : "",
      ret_cogs_back: rs.length ? String(sum((r) => Number(r.cogs_back))) : "",
      note: existing?.note ?? "",
    });
    setEntryOpen(true);
  }


  function numOrZero(v: string) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function numOrNull(v: string) {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async function submitEntry() {
    try {
      await saveEntry.mutateAsync({
        entry_date: entryForm.entry_date,
        ad_cost: numOrZero(entryForm.ad_cost),
        packaging_cost: numOrZero(entryForm.packaging_cost),
        other_cost: numOrZero(entryForm.other_cost),
        shipping_cost: numOrZero(entryForm.shipping_cost),
        manual_parcels: numOrNull(entryForm.manual_parcels) as number | null,
        manual_revenue: numOrNull(entryForm.manual_revenue),
        manual_cogs: numOrNull(entryForm.manual_cogs),
        note: entryForm.note.trim() || null,
      });
      await saveDayReturn();
      toast.success("Day saved");
      setEntryOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }


  async function saveDayReturn() {
    const qty = autoReturn.qty;
    const values = {
      sent_date: entryForm.entry_date,
      returned_on: entryForm.entry_date,
      qty,
      refunded_revenue: autoReturn.refunded,
      cogs_back: autoReturn.cogsBack,
      courier_cost: numOrZero(entryForm.ret_courier),
      note: null as string | null,
    };
    const ids = returns
      .filter((r) => r.sent_date === entryForm.entry_date)
      .map((r) => r.id);
    const empty = !qty && !values.courier_cost;

    if (empty) {
      for (const id of ids) {
        await returnMutation.mutateAsync({ action: "delete", id });
      }
      return;
    }
    const first = ids[0];
    if (first) {
      await returnMutation.mutateAsync({ action: "update", id: first, values });
      for (const id of ids.slice(1)) {
        await returnMutation.mutateAsync({ action: "delete", id });
      }

    } else {
      await returnMutation.mutateAsync({ action: "insert", values });
    }
  }


  function downloadCsv() {
    const blob = new Blob([daysToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
    const parts = [
      productFilter !== "all" ? slug(productFilter) : "",
      customerFilter !== "all" ? slug(customerFilter) : "",
      zoneFilter !== "all" ? zoneFilter : "",
    ].filter(Boolean);
    a.download = `profit-${from}-to-${to}${parts.length ? "-" + parts.join("-") : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  

  return (
    <AppShell
      title="Daily Profit"
      subtitle="Ad cost, product cost, parcels and returns — net profit for any date range"
      actions={
        <>
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="mr-1 size-4" /> CSV
          </Button>
          <Button onClick={() => openEntry(today)}>
            <Plus className="mr-1 size-4" /> Today's costs
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <section className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-4">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              variant={activePreset === p.label ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(p.label, p.days)}
            >
              {p.label}
            </Button>
          ))}
          <div className="ml-auto flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setActivePreset("Custom");
                }}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setActivePreset("Custom");
                }}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Product</Label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  {productOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Customer</Label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {customerOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Delivery type</Label>
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All delivery types</SelectItem>
                  {DELIVERY_ZONES.map((z) => (
                    <SelectItem key={z.value} value={z.value}>
                      {z.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {filtering && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Filtered view — only matching orders are counted. Hand-typed day costs, ad
                spend and returns are left out.
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setProductFilter("all");
                  setCustomerFilter("all");
                  setZoneFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total sales" value={currency(totals.revenue)} />
          <Stat label="Total cost" value={currency(totals.totalCost)} />
          <Stat
            label="Net profit"
            value={currency(totals.netProfit)}
            tone={totals.netProfit >= 0 ? "good" : "bad"}
          />
          <Stat
            label="Parcels (net)"
            value={`${totals.netParcels} / ${totals.parcels}`}
            hint={`${totals.returnedParcels} returned · ${totals.returnRate.toFixed(1)}%`}
          />
          <Stat label="Product cost" value={currency(totals.cogs)} />
          <Stat label="Ad cost" value={currency(totals.adCost)} hint={`${currency(totals.adPerParcel)} / parcel`} />
          <Stat
            label="Packaging + other"
            value={currency(totals.packagingCost + totals.otherCost)}
          />
          <Stat label="Shipping cost" value={currency(totals.shippingCost)} />
          <Stat
            label="Return courier cost"
            value={currency(totals.returnCourierCost)}
            hint={`Refunded sales ${currency(totals.refundedRevenue)}`}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-xl">Net profit per day</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => currency(v)} />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.profit >= 0 ? "var(--color-success)" : "var(--color-destructive)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* On phones this wide table is swiped sideways, so we say so. */}
        <p className="text-caption text-muted-foreground lg:hidden">
          Swipe the table sideways to see every column.
        </p>
        <section className="table-scroll rounded-2xl border border-border bg-card">

          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Parcels</th>
                <th className="p-3 text-right">Return</th>
                <th className="p-3 text-right">Sales</th>
                <th className="p-3 text-right">Product cost</th>
                <th className="p-3 text-right">Ad</th>
                <th className="p-3 text-right">Packaging</th>
                <th className="p-3 text-right">Other</th>
                <th className="p-3 text-right">Shipping</th>
                <th className="p-3 text-right">Return courier</th>
                <th className="p-3 text-right">Net profit</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.date} className="border-b border-border/60 last:border-0">
                  <td className="p-3 whitespace-nowrap">{d.date}</td>
                  <td className="p-3 text-right">{d.parcels}</td>
                  <td className="p-3 text-right">{d.returnedParcels || "—"}</td>
                  <td className="p-3 text-right">{currency(d.revenue)}</td>
                  <td className="p-3 text-right">{currency(d.cogs)}</td>
                  <td className="p-3 text-right">{currency(d.adCost)}</td>
                  <td className="p-3 text-right">{currency(d.packagingCost)}</td>
                  <td className="p-3 text-right">{currency(d.otherCost)}</td>
                  <td className="p-3 text-right">{currency(d.shippingCost)}</td>
                  <td className="p-3 text-right">{currency(d.returnCourierCost)}</td>
                  <td
                    className={cn(
                      "p-3 text-right font-semibold",
                      d.netProfit >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {currency(d.netProfit)}
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEntry(d.date)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-muted-foreground">
                    No days in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

      </div>


      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-xl">
          <DialogHeader className="border-b border-border px-5 pt-5 pb-4">
            <DialogTitle className="font-display text-2xl">Day sheet</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Fill it top to bottom — the net profit at the bottom updates live.
            </p>
          </DialogHeader>

          <div className="px-5 pt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-40">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={entryForm.entry_date}
                  onChange={(e) => openEntry(e.target.value)}
                />
              </div>
              <div className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                From orders: {autoForEntryDate?.autoParcels ?? 0} parcels ·{" "}
                {currency(autoForEntryDate?.autoRevenue ?? 0)} sales ·{" "}
                {currency(autoForEntryDate?.autoCogs ?? 0)} buy cost
              </div>
            </div>
          </div>

          <div className="mt-4 divide-y divide-border border-y border-border">
            <LedgerRow
              step={1}
              label="Total sales"
              hint="Leave empty to use your orders"
              sign="+"
              amount={draftDay?.revenue ?? 0}
            >
              <Input
                inputMode="decimal"
                className="text-right"
                placeholder="auto"
                value={entryForm.manual_revenue}
                onChange={(e) => setEntryForm({ ...entryForm, manual_revenue: e.target.value })}
              />
            </LedgerRow>

            <LedgerRow
              step={2}
              label="Product buy cost"
              hint="What you paid for the products"
              sign="-"
              amount={draftDay?.cogs ?? 0}
            >
              <Input
                inputMode="decimal"
                className="text-right"
                placeholder="auto"
                value={entryForm.manual_cogs}
                onChange={(e) => setEntryForm({ ...entryForm, manual_cogs: e.target.value })}
              />
            </LedgerRow>

            <LedgerRow
              step={3}
              label="Ad cost"
              hint="Facebook / boosting spend today"
              sign="-"
              amount={draftDay?.adCost ?? 0}
            >
              <Input
                inputMode="decimal"
                className="text-right"
                placeholder="0"
                value={entryForm.ad_cost}
                onChange={(e) => setEntryForm({ ...entryForm, ad_cost: e.target.value })}
              />
            </LedgerRow>

            <LedgerRow
              step={4}
              label="Total parcel sent"
              hint="Leave empty to count your orders"
              amount={draftDay?.parcels ?? 0}
              unit="pcs"
            >
              <Input
                inputMode="numeric"
                className="text-right"
                placeholder="auto"
                value={entryForm.manual_parcels}
                onChange={(e) => setEntryForm({ ...entryForm, manual_parcels: e.target.value })}
              />
            </LedgerRow>

            <LedgerRow
              step={5}
              label="Total parcel return"
              hint="How many of this day's parcels came back"
              amount={draftDay?.returnedParcels ?? 0}
              unit="pcs"
            >
              <Input
                inputMode="numeric"
                className="text-right"
                placeholder="0"
                value={entryForm.ret_qty}
                onChange={(e) => setEntryForm({ ...entryForm, ret_qty: e.target.value })}
              />
            </LedgerRow>

            <LedgerRow
              step={6}
              label="Return sales back"
              hint={`Auto from this day: ${currency(autoReturn.perParcelRevenue)} per parcel`}
              sign="-"
              amount={autoReturn.refunded}
            >
              <p className="text-right text-xs text-muted-foreground">
                auto ({autoReturn.qty} pcs)
              </p>
            </LedgerRow>

            <LedgerRow
              step={7}
              label="Return product cost back"
              hint={`Auto from this day: ${currency(autoReturn.perParcelCogs)} per parcel back in stock`}
              sign="+"
              amount={autoReturn.cogsBack}
            >
              <p className="text-right text-xs text-muted-foreground">
                auto ({autoReturn.qty} pcs)
              </p>
            </LedgerRow>


            <LedgerRow
              step={8}
              label="Return courier cost"
              hint="Courier charge you paid for the returns"
              sign="-"
              amount={draftDay?.returnCourierCost ?? 0}
            >
              <Input
                inputMode="decimal"
                className="text-right"
                placeholder="0"
                value={entryForm.ret_courier}
                onChange={(e) => setEntryForm({ ...entryForm, ret_courier: e.target.value })}
              />
            </LedgerRow>


            <LedgerRow
              step={9}
              label="Packaging cost"
              hint="Boxes, tape, polybags"
              sign="-"
              amount={draftDay?.packagingCost ?? 0}
            >
              <Input
                inputMode="decimal"
                className="text-right"
                placeholder="0"
                value={entryForm.packaging_cost}
                onChange={(e) => setEntryForm({ ...entryForm, packaging_cost: e.target.value })}
              />
            </LedgerRow>

            <LedgerRow
              step={10}
              label="Others cost"
              hint="Salary, bills, anything else"
              sign="-"
              amount={draftDay?.otherCost ?? 0}
            >
              <Input
                inputMode="decimal"
                className="text-right"
                placeholder="0"
                value={entryForm.other_cost}
                onChange={(e) => setEntryForm({ ...entryForm, other_cost: e.target.value })}
              />
            </LedgerRow>

            <LedgerRow
              step={11}
              label="Shipping cost"
              hint={`Auto from today's orders: ${currency(autoForEntryDate?.autoShipping ?? 0)} — type extra only`}
              sign="-"
              amount={draftDay?.shippingCost ?? 0}
            >
              <Input
                inputMode="decimal"
                className="text-right"
                placeholder="0"
                value={entryForm.shipping_cost}
                onChange={(e) => setEntryForm({ ...entryForm, shipping_cost: e.target.value })}
              />
            </LedgerRow>
          </div>

          <div className="px-5 pt-4">
            <Field label="Note">
              <Input
                value={entryForm.note}
                onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })}
              />
            </Field>
          </div>

          <div className="sticky bottom-0 mt-4 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Net profit ({entryForm.entry_date})
                </p>
                <p
                  className={`num font-display text-3xl leading-tight ${
                    (draftDay?.netProfit ?? 0) >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {currency(draftDay?.netProfit ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {draftDay?.netParcels ?? 0} net parcels ·{" "}
                  {currency(
                    (draftDay?.netParcels ?? 0)
                      ? (draftDay?.netProfit ?? 0) / (draftDay?.netParcels ?? 1)
                      : 0,
                  )}{" "}
                  per parcel
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEntryOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitEntry} disabled={saveEntry.isPending}>
                  Save day
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-2xl",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function LedgerRow({
  step,
  label,
  hint,
  sign,
  amount,
  unit,
  children,
}: {
  step: number;
  label: string;
  hint?: string;
  sign?: "+" | "-";
  amount: number;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[2rem_1fr] items-start gap-3 px-5 py-3 sm:grid-cols-[2rem_1fr_9rem_7rem]">
      <span className="num mt-1.5 flex size-7 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
        {step}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="col-span-2 sm:col-span-1">{children}</div>
      <p
        className={`num col-span-2 text-right text-sm sm:col-span-1 ${
          sign === "-" ? "text-destructive" : "text-foreground"
        }`}
      >
        {unit ? `${amount} ${unit}` : `${sign ?? ""}${currency(amount)}`}
      </p>
    </div>
  );
}
