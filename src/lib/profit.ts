import type { DailyEntry, Expense, ParcelReturn } from "./data";
import { dayKey, orderTotals, type Order } from "./shop";

export interface AdSpend {
  id: string;
  amount: number;
  platform: string;
  campaign: string | null;
  spent_on: string;
}

export interface ParcelStatusCounts {
  /** Booked with the courier and still on the way. */
  onTheWay: number;
  delivered: number;
  returned: number;
  cancelled: number;
  /** Saved as an order but not booked with the courier yet. */
  notSent: number;
}

export interface DayProfit {
  date: string;
  revenue: number;
  cogs: number;
  adCost: number;
  packagingCost: number;
  otherCost: number;
  shippingCost: number;
  returnCourierCost: number;
  parcels: number;
  returnedParcels: number;
  netParcels: number;
  refundedRevenue: number;
  netProfit: number;
  autoRevenue: number;
  autoCogs: number;
  autoParcels: number;
  autoShipping: number;
  status: ParcelStatusCounts;
  hasEntry: boolean;
  note: string | null;
}


export interface RangeTotals {
  revenue: number;
  cogs: number;
  adCost: number;
  packagingCost: number;
  otherCost: number;
  shippingCost: number;
  returnCourierCost: number;
  refundedRevenue: number;
  parcels: number;
  returnedParcels: number;
  netParcels: number;
  netProfit: number;
  status: ParcelStatusCounts;

  totalCost: number;
  returnRate: number;
  profitPerParcel: number;
  adPerParcel: number;
}

export function todayKey() {
  return dayKey(new Date());
}

export function shiftDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function listDays(from: string, to: string) {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 1000) {
    out.push(cur);
    cur = shiftDays(cur, 1);
    guard += 1;
  }
  return out;
}

function num(v: unknown) {
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
}

export interface ProfitSources {
  orders: Order[];
  entries: DailyEntry[];
  returns: ParcelReturn[];
  expenses: Expense[];
  adSpends: AdSpend[];
}

/** Builds one profit row per calendar day between from and to (inclusive). */
export function buildDailyProfit(
  { orders, entries, returns, expenses, adSpends }: ProfitSources,
  from: string,
  to: string,
): DayProfit[] {
  const entryByDate = new Map(entries.map((e) => [e.entry_date, e]));

  const auto = new Map<
    string,
    {
      revenue: number;
      cogs: number;
      parcels: number;
      packaging: number;
      other: number;
      shipping: number;
    }
  >();
  const bucket = (key: string) => {
    let b = auto.get(key);
    if (!b) {
      b = { revenue: 0, cogs: 0, parcels: 0, packaging: 0, other: 0, shipping: 0 };
      auto.set(key, b);
    }
    return b;
  };

  const statusByDate = new Map<string, ParcelStatusCounts>();
  const statusBucket = (key: string) => {
    let s = statusByDate.get(key);
    if (!s) {
      s = { onTheWay: 0, delivered: 0, returned: 0, cancelled: 0, notSent: 0 };
      statusByDate.set(key, s);
    }
    return s;
  };

  for (const o of orders) {
    const key = dayKey(o.created_at);
    const s = statusBucket(key);
    const courier = (o as { courier_status?: string | null }).courier_status ?? null;
    const consignment = (o as { consignment_id?: string | null }).consignment_id ?? null;
    if (o.status === "cancelled" || courier === "cancelled") s.cancelled += 1;
    else if (o.status === "returned" || courier === "returned") s.returned += 1;
    else if (
      o.status === "delivered" ||
      courier === "delivered" ||
      courier === "partial_delivered"
    )
      s.delivered += 1;
    else if (consignment) s.onTheWay += 1;
    else s.notSent += 1;

    if (o.status === "cancelled") continue;
    const t = orderTotals(o);
    const b = bucket(key);
    b.revenue += t.subtotal - num(o.discount) + num(o.shipping_charge);
    b.cogs += t.cogs;
    b.parcels += 1;
    b.packaging += num(o.packaging_cost);
    b.other += num(o.other_cost);
    b.shipping += num(o.shipping_charge);
  }


  const adByDate = new Map<string, number>();
  for (const a of adSpends) {
    adByDate.set(a.spent_on, (adByDate.get(a.spent_on) ?? 0) + num(a.amount));
  }
  const expByDate = new Map<string, number>();
  for (const e of expenses) {
    expByDate.set(e.spent_on, (expByDate.get(e.spent_on) ?? 0) + num(e.amount));
  }

  const retByDate = new Map<
    string,
    { qty: number; refunded: number; cogsBack: number; courier: number }
  >();
  for (const r of returns) {
    let b = retByDate.get(r.sent_date);
    if (!b) {
      b = { qty: 0, refunded: 0, cogsBack: 0, courier: 0 };
      retByDate.set(r.sent_date, b);
    }
    b.qty += r.qty || 0;
    b.refunded += num(r.refunded_revenue);
    b.cogsBack += num(r.cogs_back);
    b.courier += num(r.courier_cost);
  }

  return listDays(from, to).map((date) => {
    const a = auto.get(date) ?? {
      revenue: 0,
      cogs: 0,
      parcels: 0,
      packaging: 0,
      other: 0,
      shipping: 0,
    };
    const e = entryByDate.get(date);
    const r = retByDate.get(date) ?? { qty: 0, refunded: 0, cogsBack: 0, courier: 0 };

    const parcels = e?.manual_parcels ?? a.parcels;
    const grossRevenue = e?.manual_revenue ?? a.revenue;
    const grossCogs = e?.manual_cogs ?? a.cogs;

    const revenue = grossRevenue - r.refunded;
    const cogs = Math.max(0, grossCogs - r.cogsBack);
    const adCost = num(e?.ad_cost) + (adByDate.get(date) ?? 0);
    const packagingCost = num(e?.packaging_cost) + a.packaging;
    const otherCost = num(e?.other_cost) + a.other + (expByDate.get(date) ?? 0);
    // Courier charge is taken straight from the day's orders, plus anything typed in by hand.
    const shippingCost =
      num((e as { shipping_cost?: number } | undefined)?.shipping_cost) + a.shipping;

    const netProfit =
      revenue - cogs - adCost - packagingCost - otherCost - shippingCost - r.courier;

    return {
      status:
        statusByDate.get(date) ??
        { onTheWay: 0, delivered: 0, returned: 0, cancelled: 0, notSent: 0 },
      date,

      revenue,
      cogs,
      adCost,
      packagingCost,
      otherCost,
      shippingCost,
      returnCourierCost: r.courier,
      parcels,
      returnedParcels: r.qty,
      netParcels: Math.max(0, parcels - r.qty),
      refundedRevenue: r.refunded,
      netProfit,
      autoRevenue: a.revenue,
      autoCogs: a.cogs,
      autoParcels: a.parcels,
      autoShipping: a.shipping,
      hasEntry: Boolean(e),
      note: e?.note ?? null,
    };
  });
}

export function sumDays(days: DayProfit[]): RangeTotals {
  const t = days.reduce(
    (acc, d) => {
      acc.revenue += d.revenue;
      acc.cogs += d.cogs;
      acc.adCost += d.adCost;
      acc.packagingCost += d.packagingCost;
      acc.otherCost += d.otherCost;
      acc.shippingCost += d.shippingCost;
      acc.returnCourierCost += d.returnCourierCost;
      acc.refundedRevenue += d.refundedRevenue;
      acc.parcels += d.parcels;
      acc.returnedParcels += d.returnedParcels;
      acc.netParcels += d.netParcels;
      acc.netProfit += d.netProfit;
      return acc;
    },
    {
      revenue: 0,
      cogs: 0,
      adCost: 0,
      packagingCost: 0,
      otherCost: 0,
      shippingCost: 0,
      returnCourierCost: 0,
      refundedRevenue: 0,
      parcels: 0,
      returnedParcels: 0,
      netParcels: 0,
      netProfit: 0,
    },
  );

  const totalCost =
    t.cogs + t.adCost + t.packagingCost + t.otherCost + t.shippingCost + t.returnCourierCost;

  const status = days.reduce<ParcelStatusCounts>(
    (acc, d) => ({
      onTheWay: acc.onTheWay + d.status.onTheWay,
      delivered: acc.delivered + d.status.delivered,
      returned: acc.returned + d.status.returned,
      cancelled: acc.cancelled + d.status.cancelled,
      notSent: acc.notSent + d.status.notSent,
    }),
    { onTheWay: 0, delivered: 0, returned: 0, cancelled: 0, notSent: 0 },
  );

  return {
    ...t,
    status,
    totalCost,
    returnRate: t.parcels ? (t.returnedParcels / t.parcels) * 100 : 0,
    profitPerParcel: t.netParcels ? t.netProfit / t.netParcels : 0,
    adPerParcel: t.parcels ? t.adCost / t.parcels : 0,
  };
}

export function daysToCsv(days: DayProfit[]) {
  const head = [
    "Date",
    "Parcels",
    "On the way",
    "Delivered",
    "Returned parcels",
    "Cancelled",
    "Not sent",
    "Returned",
    "Sales",
    "Product cost",
    "Ad cost",
    "Packaging",
    "Other",
    "Shipping",
    "Return courier",
    "Net profit",
  ];
  const rows = days.map((d) => [
    d.date,
    d.parcels,
    d.status.onTheWay,
    d.status.delivered,
    d.status.returned,
    d.status.cancelled,
    d.status.notSent,
    d.returnedParcels,
    Math.round(d.revenue),
    Math.round(d.cogs),
    Math.round(d.adCost),
    Math.round(d.packagingCost),
    Math.round(d.otherCost),
    Math.round(d.shippingCost),
    Math.round(d.returnCourierCost),
    Math.round(d.netProfit),
  ]);

  return [head, ...rows].map((r) => r.join(",")).join("\n");
}
