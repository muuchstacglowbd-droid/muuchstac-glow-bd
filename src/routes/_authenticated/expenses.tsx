import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Plus, Trash2, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Grid, Panel, Section, Stack, Eyebrow } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExpenses, useTableMutation } from "@/lib/data";
import { currency } from "@/lib/shop";
import { downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Muuchstac Glow BD Control Panel" },
      {
        name: "description",
        content:
          "Track packaging, delivery, ads, salary and other shop costs month by month in one simple book.",
      },
      { property: "og:title", content: "Expenses — Muuchstac Glow BD Control Panel" },
      {
        property: "og:description",
        content: "Track packaging, delivery, ads and other shop costs month by month.",
      },
    ],
  }),
  component: ExpensesPage,
});

const CATEGORIES = [
  "packaging",
  "delivery",
  "ads",
  "salary",
  "rent",
  "purchase",
  "other",
] as const;

const today = () => new Date().toISOString().slice(0, 10);

function ExpensesPage() {
  const { data: expenses = [] } = useExpenses();
  const mutation = useTableMutation("expenses", ["expenses"]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    category: "packaging",
    note: "",
    spent_on: today(),
  });
  const [month, setMonth] = useState(() => today().slice(0, 7));

  const filtered = useMemo(
    () => expenses.filter((e) => e.spent_on.startsWith(month)),
    [expenses, month],
  );

  const totals = useMemo(() => {
    const byCategory = new Map<string, number>();
    let total = 0;
    for (const e of filtered) {
      total += Number(e.amount);
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
    }
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    return { total, count: filtered.length, top, byCategory };
  }, [filtered]);

  async function save() {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Write an amount first.");
      return;
    }
    await mutation.mutateAsync({
      action: "insert",
      values: {
        amount,
        category: form.category,
        note: form.note || null,
        spent_on: form.spent_on,
      },
    });
    toast.success("Expense saved");
    setOpen(false);
    setForm({ amount: "", category: "packaging", note: "", spent_on: today() });
  }

  async function remove(id: string) {
    await mutation.mutateAsync({ action: "delete", id });
    toast.success("Expense removed");
  }

  return (
    <AppShell
      title="Expenses"
      subtitle="Every cost outside product purchase, kept month by month."
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                `expenses-${month}`,
                filtered.map((e) => ({
                  date: e.spent_on,
                  category: e.category,
                  amount: e.amount,
                  note: e.note ?? "",
                })),
              )
            }
          >
            <Download className="size-4" /> Export
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add expense
          </Button>
        </>
      }
    >
      <Stack gap="section">
        <Grid cols={3}>
          <Panel interactive>
            <Eyebrow>This month</Eyebrow>
            <p className="num mt-1 text-display font-semibold leading-none">
              {currency(totals.total)}
            </p>
            <p className="mt-2 text-caption text-muted-foreground">{totals.count} entries</p>
          </Panel>
          <Panel interactive>
            <Eyebrow>Biggest cost</Eyebrow>
            <p className="mt-1 text-display font-semibold capitalize leading-none">
              {totals.top ? totals.top[0] : "—"}
            </p>
            <p className="num mt-2 text-caption text-muted-foreground">
              {totals.top ? currency(totals.top[1]) : "No expense yet"}
            </p>
          </Panel>
          <Panel interactive className="flex flex-col justify-between">
            <Eyebrow>Month</Eyebrow>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-2"
            />
          </Panel>
        </Grid>

        {totals.byCategory.size > 0 && (
          <Section title="By category">
            <Panel padding="lg">
              <div className="flex flex-col gap-3">
                {[...totals.byCategory.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-caption capitalize">{cat}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full gold-gradient"
                          style={{
                            width: `${totals.total ? (amount / totals.total) * 100 : 0}%`,
                          }}
                        />
                      </span>
                      <span className="num w-24 shrink-0 text-right text-caption font-medium">
                        {currency(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </Panel>
          </Section>
        )}

        <Section title="Entries">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No expenses this month"
              description="Add packaging, ads or delivery costs to see the real profit."
              action={
                <Button size="sm" onClick={() => setOpen(true)}>
                  <Plus className="size-4" /> Add expense
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((e) => (
                <Panel
                  key={e.id}
                  padding="sm"
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium capitalize">{e.category}</p>
                    <p className="truncate text-caption text-muted-foreground">
                      {e.spent_on}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="num text-title font-semibold">{currency(Number(e.amount))}</span>
                    <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </Section>
      </Stack>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Add expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.spent_on}
                onChange={(e) => setForm({ ...form, spent_on: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Note</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Optional detail"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={mutation.isPending}>
              Save expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
