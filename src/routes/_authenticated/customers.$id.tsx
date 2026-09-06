import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Mail, MapPin, Phone, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Grid, Panel, Section, Stack, Eyebrow } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { useCustomers, useOrders } from "@/lib/data";
import { currency, orderTotals, statusTone, countsRevenue, type Order } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/customers/$id")({
  head: () => ({
    meta: [
      { title: "Customer profile — Muuchstac Glow BD Control Panel" },
      {
        name: "description",
        content: "Full order history, lifetime value and contact details for one customer.",
      },
      { property: "og:title", content: "Customer profile — Muuchstac Glow BD Control Panel" },
      {
        property: "og:description",
        content: "Order history, lifetime value and contact details for one customer.",
      },
    ],
  }),
  component: CustomerProfile,
});

function CustomerProfile() {
  const { id } = Route.useParams();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders();

  const customer = customers.find((c) => c.id === id);

  const history = useMemo(() => {
    const list = (orders as Order[]).filter(
      (o) => o.customer_id === id || (customer?.phone && o.customer_phone === customer.phone),
    );
    const paid = list.filter((o) => countsRevenue(o.status));
    const lifetime = paid.reduce((s, o) => s + orderTotals(o).total, 0);
    return {
      list,
      lifetime,
      count: list.length,
      avg: paid.length ? lifetime / paid.length : 0,
      returned: list.filter((o) => o.status === "returned").length,
      last: list[0]?.created_at,
    };
  }, [orders, id, customer?.phone]);

  return (
    <AppShell
      title={customer?.name ?? "Customer"}
      subtitle={customer?.phone ?? "Full order history and lifetime value."}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/customers">
            <ArrowLeft className="size-4" /> All customers
          </Link>
        </Button>
      }
    >
      <Stack gap="section">
        <Grid cols={4}>
          <Panel interactive>
            <Eyebrow>Lifetime value</Eyebrow>
            <p className="num mt-1 text-display font-semibold leading-none">
              {currency(history.lifetime)}
            </p>
          </Panel>
          <Panel interactive>
            <Eyebrow>Orders</Eyebrow>
            <p className="num mt-1 text-display font-semibold leading-none">{history.count}</p>
          </Panel>
          <Panel interactive>
            <Eyebrow>Average order</Eyebrow>
            <p className="num mt-1 text-display font-semibold leading-none">
              {currency(history.avg)}
            </p>
          </Panel>
          <Panel interactive>
            <Eyebrow>Returns</Eyebrow>
            <p className="num mt-1 text-display font-semibold leading-none">{history.returned}</p>
          </Panel>
        </Grid>

        <Section title="Contact">
          <Panel padding="lg" className="grid gap-3 sm:grid-cols-3">
            <p className="flex items-center gap-2 text-body">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              {customer?.phone || "—"}
            </p>
            <p className="flex items-center gap-2 text-body">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{customer?.email || "—"}</span>
            </p>
            <p className="flex items-center gap-2 text-body">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{customer?.address || "—"}</span>
            </p>
          </Panel>
        </Section>

        <Section title="Order history">
          {history.list.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              description="This customer has not placed an order so far."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {history.list.map((o) => (
                <Link key={o.id} to="/orders/$id" params={{ id: o.id }}>
                  <Panel
                    padding="sm"
                    interactive
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body font-medium">
                        #{o.order_no} · {new Date(o.created_at).toLocaleDateString()}
                      </p>
                      <p className="truncate text-caption text-muted-foreground">
                        {(o.order_items ?? []).map((i) => i.product_name).join(", ") || "No items"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-1 text-caption capitalize ${statusTone(o.status)}`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                      <span className="num text-title font-semibold">
                        {currency(orderTotals(o).total)}
                      </span>
                    </div>
                  </Panel>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </Stack>
    </AppShell>
  );
}
