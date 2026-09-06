import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOrders, useParcelReturns, type ParcelReturn } from "@/lib/data";
import { currency } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/returns")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Returned parcels — Muuchstac Glow BD" },
      {
        name: "description",
        content:
          "Every returned parcel in one list: order, refunded sale value, product cost back and the courier charge you paid for the return.",
      },
      { property: "og:title", content: "Returned parcels — Muuchstac Glow BD" },
      {
        property: "og:description",
        content:
          "Every returned parcel with refunded sale value, product cost back and return courier charge.",
      },
    ],
  }),
  component: ReturnsPage,
});

function ReturnsPage() {
  const qc = useQueryClient();
  const { data: returns = [], isLoading } = useParcelReturns();
  const { data: orders = [] } = useOrders();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const totals = useMemo(() => {
    const sum = (f: (r: ParcelReturn) => number) => returns.reduce((a, r) => a + (f(r) || 0), 0);
    return {
      qty: sum((r) => Number(r.qty)),
      refunded: sum((r) => Number(r.refunded_revenue)),
      cogsBack: sum((r) => Number(r.cogs_back)),
      courier: sum((r) => Number(r.courier_cost)),
    };
  }, [returns]);

  const saveCost = useMutation({
    mutationFn: async ({ id, courier_cost }: { id: string; courier_cost: number }) => {
      const { error } = await (
        supabase as unknown as { from: (t: string) => any }
      )
        .from("parcel_returns")
        .update({ courier_cost })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Return courier cost saved");
      qc.invalidateQueries({ queryKey: ["parcel_returns"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <AppShell
      title="Returned parcels"
      subtitle={`${totals.qty} returned · ${currency(totals.courier)} courier charge`}
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <Card label="Returned parcels" value={String(totals.qty)} />
        <Card label="Refunded sales" value={currency(totals.refunded)} />
        <Card label="Product cost back" value={currency(totals.cogsBack)} />
        <Card label="Return courier cost" value={currency(totals.courier)} />
      </div>

      <div className="surface mt-4 overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Returned on</th>
                <th className="px-4 py-2.5 font-semibold">Order</th>
                <th className="px-4 py-2.5 font-semibold">Customer</th>
                <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                <th className="px-4 py-2.5 text-right font-semibold">Refunded sale</th>
                <th className="px-4 py-2.5 text-right font-semibold">Product cost back</th>
                <th className="px-4 py-2.5 text-right font-semibold">Courier cost</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && returns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Undo2 className="mx-auto size-6 text-muted-foreground" />
                    <p className="mt-2 font-semibold">No returned parcels</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Press Returned on an order and it lands here on its own.
                    </p>
                  </td>
                </tr>
              )}
              {returns.map((r) => {
                const order = r.order_id ? orderById.get(r.order_id) : undefined;
                const value = draft[r.id] ?? String(Number(r.courier_cost) || 0);
                return (
                  <tr key={r.id} className="border-t border-border/70 hover:bg-muted/40">
                    <td className="num px-4 py-2.5">{r.returned_on}</td>
                    <td className="px-4 py-2.5">
                      {order ? (
                        <Link
                          to="/orders/$id"
                          params={{ id: order.id }}
                          className="font-medium hover:text-primary"
                        >
                          #{order.order_no}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{r.note ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {order?.customer_name ?? "—"}
                    </td>
                    <td className="num px-4 py-2.5 text-right">{r.qty}</td>
                    <td className="num px-4 py-2.5 text-right">
                      {currency(Number(r.refunded_revenue))}
                    </td>
                    <td className="num px-4 py-2.5 text-right">{currency(Number(r.cogs_back))}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Input
                        className="ml-auto h-8 w-24 text-right"
                        inputMode="decimal"
                        aria-label="Return courier cost"
                        value={value}
                        onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                        onBlur={() => {
                          const next = Number(value);
                          if (!Number.isFinite(next) || next === Number(r.courier_cost)) return;
                          saveCost.mutate({ id: r.id, courier_cost: next });
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-5">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="num mt-3 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
