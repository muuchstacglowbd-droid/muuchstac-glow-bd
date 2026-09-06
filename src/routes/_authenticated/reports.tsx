import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { useExpenses, useOrders, useProducts, useTableMutation } from "@/lib/data";
import { currency, orderTotals, type Order } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Stock & Income Report — Muuchstac Glow BD" },
      {
        name: "description",
        content:
          "Monthly income from delivered orders minus expenses, plus a stock bar chart of every product in your shop.",
      },
      { property: "og:title", content: "Stock & Income Report — Muuchstac Glow BD" },
      {
        property: "og:description",
        content:
          "Monthly income from delivered orders minus expenses, plus a stock bar chart of every product in your shop.",
      },
    ],
  }),
  component: ReportsPage,
});

function monthKey(d: string) {
  return new Date(d).toISOString().slice(0, 7);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

function ReportsPage() {
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: expenses = [] } = useExpenses();
  const expenseMutation = useTableMutation("expenses", ["expenses"]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amount: 0,
    category: "general",
    note: "",
    spent_on: new Date().toISOString().slice(0, 10),
  });

  const monthly = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; revenue: number; profit: number; expense: number; orders: number }
    >();
    const row = (k: string) =>
      map.get(k) ??
      map.set(k, { key: k, label: monthLabel(k), revenue: 0, profit: 0, expense: 0, orders: 0 }).get(k)!;

    for (const o of orders as Order[]) {
      if (o.status !== "delivered") continue;
      const r = row(monthKey(o.created_at));
      const t = orderTotals(o);
      r.revenue += t.total;
      r.profit += t.profit;
      r.orders += 1;
    }
    for (const e of expenses) {
      row(monthKey(e.spent_on)).expense += Number(e.amount);
    }
    return [...map.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-12)
      .map((r) => ({ ...r, net: r.profit - r.expense }));
  }, [orders, expenses]);

  const thisMonth = monthly.find((m) => m.key === new Date().toISOString().slice(0, 7));

  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  const stockCost = products.reduce((s, p) => s + p.stock * p.buy_price, 0);
  const stockRetail = products.reduce((s, p) => s + p.stock * p.sell_price, 0);
  const lowCount = products.filter((p) => p.stock <= p.low_stock_threshold).length;

  const stockBars = [...products]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 12)
    .map((p) => ({
      name: p.name.length > 14 ? p.name.slice(0, 13) + "…" : p.name,
      stock: p.stock,
      low: p.stock <= p.low_stock_threshold,
    }));

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      await expenseMutation.mutateAsync({
        action: "insert",
        values: {
          amount: Number(form.amount),
          category: form.category || "general",
          note: form.note || null,
          spent_on: form.spent_on,
        },
      });
      toast.success("Expense added");
      setForm({ ...form, amount: 0, note: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save expense");
    }
  }

  return (
    <AppShell
      title="Stock & Income"
      subtitle="Monthly earnings from every order and expense, with live stock levels"
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add expense
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="This month income" value={currency(thisMonth?.revenue ?? 0)} />
        <Stat
          label="This month net earning"
          value={currency(thisMonth?.net ?? 0)}
          tone={(thisMonth?.net ?? 0) >= 0 ? "good" : "bad"}
        />
        <Stat label="Stock in hand" value={`${totalUnits} pcs`} hint={`${lowCount} low`} />
        <Stat
          label="Stock value (cost)"
          value={currency(stockCost)}
          hint={`Retail ${currency(stockRetail)}`}
        />
      </div>

      <div className="surface mt-6 p-5">
        <h2 className="font-display text-2xl">Stock bar</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Pieces in hand per product — red bars are at or below your low-stock alert.
        </p>
        {stockBars.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add products to see the stock bar.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockBars} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="stock" radius={[6, 6, 0, 0]}>
                  {stockBars.map((b, i) => (
                    <Cell key={i} fill={b.low ? "var(--destructive)" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="surface mt-6 p-5">
        <h2 className="font-display text-2xl">Monthly income</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Delivered order income, profit after cost, and expenses for each month.
        </p>
        {monthly.length === 0 ? (
          <p className="text-sm text-muted-foreground">No delivered orders or expenses yet.</p>
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                    formatter={(v: number) => currency(Number(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Income" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="net" name="Net earning" fill="var(--gold)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 table-scroll">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Month</th>
                    <th className="px-4 py-2 text-right font-medium">Orders</th>
                    <th className="px-4 py-2 text-right font-medium">Income</th>
                    <th className="px-4 py-2 text-right font-medium">Profit</th>
                    <th className="px-4 py-2 text-right font-medium">Expense</th>
                    <th className="px-4 py-2 text-right font-medium">Net earning</th>
                  </tr>
                </thead>
                <tbody>
                  {[...monthly].reverse().map((m) => (
                    <tr key={m.key} className="border-t border-border/70">
                      <td className="px-4 py-2">{m.label}</td>
                      <td className="num px-4 py-2 text-right">{m.orders}</td>
                      <td className="num px-4 py-2 text-right">{currency(m.revenue)}</td>
                      <td className="num px-4 py-2 text-right">{currency(m.profit)}</td>
                      <td className="num px-4 py-2 text-right">{currency(m.expense)}</td>
                      <td
                        className={`num px-4 py-2 text-right font-medium ${m.net >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {currency(m.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="surface mt-6 overflow-hidden">
        <h2 className="border-b border-border px-5 py-4 font-display text-2xl">Recent expenses</h2>
        {expenses.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No expenses recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {expenses.slice(0, 12).map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 truncate">
                  <span className="capitalize">{e.category}</span>
                  {e.note && <span className="text-muted-foreground"> · {e.note}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{e.spent_on}</span>
                <span className="num font-medium">{currency(Number(e.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Add expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={addExpense} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="packaging, delivery, ads…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.spent_on}
                onChange={(e) => setForm({ ...form, spent_on: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={expenseMutation.isPending}>
                Add expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
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
    <div className="surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`num mt-1 font-display text-2xl ${
          tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
