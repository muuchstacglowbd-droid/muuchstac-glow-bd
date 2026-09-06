import { useServerFn } from "@tanstack/react-start";
import { autoSendOrderToCourier } from "@/lib/courier.functions";
import { COURIER_LABEL } from "@/lib/courier";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Eye, Plus, Search, Trash2, X } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { Shimmer } from "@/components/ds/skeletons";
import { AppShell } from "@/components/AppShell";
import { CourierCell, RefreshAllCourierButton } from "@/components/CourierCell";
import {
  createOrder,
  ensureCustomer,
  markOrderShipped,
  markOrderCancelled,
  markOrderDelivered,
  markOrderReturned,
  findCustomer,
  useShopSettings,
  useCustomers,
  useOrders,
  useProducts,
  useTableMutation,
} from "@/lib/data";
import {
  currency,
  orderTotals,
  statusTone,
  ORDER_STATUSES,
  ORDER_SOURCES,
  DELIVERY_ZONES,
  type DeliveryZone,
  type Order,
  type OrderSource,
  type OrderStatus,
} from "@/lib/shop";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/orders/")({
  validateSearch: (search: Record<string, unknown>): { new?: true } =>
    search["new"] === true || search["new"] === "true" ? { new: true } : {},


  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Orders — Muuchstac Glow BD Control Panel" },
      {
        name: "description",
        content:
          "Browse, filter and manage every cosmetics order, update status and open invoices.",
      },
      { property: "og:title", content: "Orders — Muuchstac Glow BD Control Panel" },
      {
        property: "og:description",
        content:
          "Browse, filter and manage every cosmetics order, update status and open invoices.",
      },
    ],
  }),
  component: OrdersPage,
});

type Draft = {
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  product_image_urls: string[];
  qty: number;
  unit_price: number;
  unit_cost: number;
};

function OrdersPage() {
  const { data: orders = [], isLoading } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: shopSettings } = useShopSettings();
  const qc = useQueryClient();
  const autoSend = useServerFn(autoSendOrderToCourier);
  const navigate = useNavigate();
  const orderMutation = useTableMutation("orders", ["orders", "products"]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [source, setSource] = useState<OrderSource | "all">("all");

  const { new: openNew } = Route.useSearch();
  const [open, setOpen] = useState(!!openNew);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [newSource, setNewSource] = useState<OrderSource>("facebook");
  const [discount, setDiscount] = useState(0);
  const [zone, setZone] = useState<DeliveryZone>("inside_dhaka");
  const [shipping, setShipping] = useState(0);
  const [items, setItems] = useState<Draft[]>([]);
  const [customerSaved, setCustomerSaved] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const insideCharge = Number(shopSettings?.inside_dhaka_charge ?? 70);
  const outsideCharge = Number(shopSettings?.outside_dhaka_charge ?? 130);

  function chargeFor(z: DeliveryZone) {
    if (z === "free") return 0;
    return z === "inside_dhaka" ? insideCharge : outsideCharge;
  }

  function pickZone(z: DeliveryZone) {
    setZone(z);
    setShipping(chargeFor(z));
  }

  /** Save the customer box: store the details and auto-fill the rest of the order. */
  async function saveCustomer() {
    if (!customerName.trim() && !customerPhone.trim()) {
      toast.error("Add a name or a mobile number first.");
      return;
    }
    setSavingCustomer(true);
    try {
      const existing = await findCustomer({ phone: customerPhone, name: customerName });
      await ensureCustomer({
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
      });
      const name = customerName || existing?.name || "";
      const phone = customerPhone || existing?.phone || "";
      const address = customerAddress || existing?.address || "";
      setCustomerName(name);
      setCustomerPhone(phone);
      setCustomerAddress(address);
      const guessedZone: DeliveryZone = /dhaka|ঢাকা/i.test(address)
        ? "inside_dhaka"
        : address
          ? "outside_dhaka"
          : zone;
      pickZone(guessedZone);
      setCustomerSaved(true);
      await qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(
        existing ? "Customer found — details filled in" : "Customer saved — details filled in",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the customer");
    } finally {
      setSavingCustomer(false);
    }
  }

  useEffect(() => {
    if (zone === "free") return;
    setShipping(zone === "inside_dhaka" ? insideCharge : outsideCharge);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insideCharge, outsideCharge]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (source !== "all" && o.source !== source) return false;
      if (!term) return true;
      return (
        String(o.order_no).includes(term) ||
        (o.customer_name ?? "").toLowerCase().includes(term) ||
        (o.customer_phone ?? "").toLowerCase().includes(term) ||
        (o.tracking_code ?? "").toLowerCase().includes(term)
      );
    });
  }, [orders, q, status, source]);

  const summary = useMemo(() => {
    let value = 0;
    let due = 0;
    for (const o of filtered) {
      const t = orderTotals(o as Order);
      value += t.total;
      due += Math.max(0, t.due);
    }
    return { value, due, count: filtered.length };
  }, [filtered]);

  function addItem(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setItems((prev) => [
      ...prev,
      {
        product_id: p.id,
        product_name: p.name,
        product_image_url: p.image_urls?.[0] ?? p.image_url ?? null,
        product_image_urls: p.image_urls?.length ? p.image_urls : p.image_url ? [p.image_url] : [],
        qty: 1,
        unit_price: Number(p.sell_price) || 0,
        unit_cost: Number(p.buy_price) || 0,
      },
    ]);
  }

  function resetForm() {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setNewSource("facebook");
    setDiscount(0);
    setZone("inside_dhaka");
    setShipping(chargeFor("inside_dhaka"));
    setItems([]);
    setCustomerSaved(false);
  }

  const draftSubtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const draftTotal = draftSubtotal - discount + (zone === "free" ? 0 : shipping);

  async function saveOrder() {
    if (!items.length) {
      toast.error("Add at least one product to the order.");
      return;
    }
    setSaving(true);
    try {
      const customerId = await ensureCustomer({
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
      });
      const id = await createOrder({
        order: {
          customer_id: customerId,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          source: newSource,
          discount,
          delivery_zone: zone,
          shipping_charge: zone === "free" ? 0 : shipping,
          advance_paid: 0,
        },
        items,
      });
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
      await qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Order created");

      // Hand the parcel to the courier straight away when auto-send is on.
      try {
        const auto = await autoSend({ data: { orderId: id } });
        if (auto.sent) {
          toast.success(`Parcel booked with ${COURIER_LABEL} — consignment ${auto.consignmentId}`);
          await qc.invalidateQueries({ queryKey: ["orders"] });
        } else if (auto.reason === "error") {
          toast.error(`Courier could not take the parcel: ${auto.error}`);
        }
      } catch {
        toast.error("Could not reach the courier — you can send this parcel by hand.");
      }

      setOpen(false);
      resetForm();
      navigate({ to: "/orders/$id", params: { id }, search: { invoice: true } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the order");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(order: Order, next: OrderStatus) {
    if (next === "returned" || next === "cancelled" || next === "delivered") {
      try {
        if (next === "returned") await markOrderReturned(order, 0);
        else if (next === "cancelled") await markOrderCancelled(order);
        else await markOrderDelivered(order);
        await qc.invalidateQueries({ queryKey: ["orders"] });
        await qc.invalidateQueries({ queryKey: ["products"] });
        await qc.invalidateQueries({ queryKey: ["parcel_returns"] });
        toast.success(
          next === "returned"
            ? "Return saved — stock put back, add the courier cost on the Returns page"
            : next === "cancelled"
              ? "Order cancelled — stock put back"
              : `Order #${order.order_no} is now delivered`,
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Update failed");
      }
      return;
    }
    if (next === "shipped") {
      try {
        const v = await markOrderShipped(order);
        await qc.invalidateQueries({ queryKey: ["orders"] });
        toast.success(`Parcel sent · tracking ${v.tracking_code}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not send the parcel");
      }
      return;
    }
    orderMutation.mutate(
      { action: "update", id: order.id, values: { status: next } },
      {
        onSuccess: () => toast.success(`Order #${order.order_no} is now ${next}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
      },
    );
  }

  function removeOrder(order: Order) {
    if (!confirm(`Delete order #${order.order_no}? This cannot be undone.`)) return;
    orderMutation.mutate(
      { action: "delete", id: order.id },
      {
        onSuccess: () => toast.success("Order deleted"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
      },
    );
  }

  return (
    <AppShell
      title="Orders"
      subtitle={
        isLoading ? "Loading orders…" : `${summary.count} shown · ${currency(summary.value)} value`
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <RefreshAllCourierButton />
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                `orders-${new Date().toISOString().slice(0, 10)}`,
                filtered.map((o) => {
                  const t = orderTotals(o as Order);
                  return {
                    order_no: o.order_no,
                    date: new Date(o.created_at).toLocaleDateString(),
                    customer: o.customer_name ?? "",
                    phone: o.customer_phone ?? "",
                    status: o.status,
                    source: o.source,
                    tracking: o.tracking_code ?? "",
                    total: Math.round(t.total),
                    due: Math.round(Math.max(0, t.due)),
                  };
                }),
              )
            }
          >
            <Download className="size-4" /> Export
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New order
          </Button>
        </div>
      }
    >

      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <div className="w-full sm:min-w-52 sm:flex-1">

          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Order no, name, phone, tracking"
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-full sm:w-40">

          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus | "all")}>
            <SelectTrigger className="mt-1 w-full capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <Label className="text-xs text-muted-foreground">Source</Label>
          <Select value={source} onValueChange={(v) => setSource(v as OrderSource | "all")}>
            <SelectTrigger className="mt-1 w-full capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {ORDER_SOURCES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(q || status !== "all" || source !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setQ("");
              setStatus("all");
              setSource("all");
            }}
          >
            <X className="size-4" /> Clear
          </Button>
        )}
      </div>

      {/* Phones get one card per order — everything readable without sliding sideways. */}
      <div className="mt-4 space-y-3 lg:hidden">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`mskel-${i}`} className="surface space-y-3 p-4">
              <Shimmer className="h-4 w-1/2" />
              <Shimmer className="h-3 w-1/3" />
              <Shimmer className="h-8 w-full" />
            </div>
          ))}
        {!isLoading && filtered.length === 0 && (
          <div className="surface p-10 text-center">
            <p className="text-title font-semibold">No orders match these filters</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Try a different status or search word — or create a new order.
            </p>
          </div>
        )}
        {!isLoading &&
          filtered.map((o) => {
            const t = orderTotals(o as Order);
            return (
              <div key={`m-${o.id}`} className="surface space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/orders/$id"
                      params={{ id: o.id }}
                      className="block truncate font-medium hover:text-primary"
                    >
                      {o.customer_name || "Walk-in"}
                    </Link>
                    {o.customer_phone && (
                      <p className="num text-xs text-muted-foreground">{o.customer_phone}</p>
                    )}
                    <p className="num mt-0.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                      #{o.order_no} · {o.source}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num font-display text-lg font-bold">{currency(t.total)}</p>
                    {t.due > 0 && (
                      <p className="num text-xs text-muted-foreground">
                        Due {currency(Math.max(0, t.due))}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={o.status}
                    onValueChange={(v) => changeStatus(o as Order, v as OrderStatus)}
                  >
                    <SelectTrigger
                      className={`h-8 w-36 rounded-full border px-2.5 text-xs capitalize ${statusTone(o.status)}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon" aria-label="Open order">
                      <Link to="/orders/$id" params={{ id: o.id }}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete order"
                      onClick={() => removeOrder(o as Order)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border/70 pt-3">
                  <CourierCell order={o as Order} />
                </div>
              </div>
            );
          })}
      </div>

      <div className="surface mt-4 hidden overflow-hidden lg:block">
        <div className="table-scroll">
          <table className="w-full text-sm" aria-label="Orders">

            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">#</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Customer</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Source</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Courier</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Total</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Due</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
{isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-t border-border/70">
                    {Array.from({ length: 8 }).map((__, c) => (
                      <td key={c} className="px-4 py-3">
                        <Shimmer className="h-3.5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <p className="text-title font-semibold">No orders match these filters</p>
                    <p className="mt-1 text-caption text-muted-foreground">
                      Try a different status, date or search word — or create a new order.
                    </p>
                  </td>
                </tr>
              )}
              {filtered.map((o) => {
                const t = orderTotals(o as Order);
                return (
                  <tr key={o.id} className="border-t border-border/70 hover:bg-muted/40">
                    <td className="num px-4 py-2.5 text-muted-foreground">{o.order_no}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        to="/orders/$id"
                        params={{ id: o.id }}
                        className="font-medium hover:text-primary"
                      >
                        {o.customer_name || "Walk-in"}
                      </Link>
                      {o.customer_phone && (
                        <p className="num text-xs text-muted-foreground">{o.customer_phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">{o.source}</td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={o.status}
                        onValueChange={(v) => changeStatus(o as Order, v as OrderStatus)}
                      >
                        <SelectTrigger
                          className={`h-7 w-32 rounded-full border px-2.5 text-xs capitalize ${statusTone(o.status)}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2.5">
                      <CourierCell order={o as Order} />
                    </td>
                    <td className="num px-4 py-2.5 text-right">{currency(t.total)}</td>
                    <td className="num px-4 py-2.5 text-right text-muted-foreground">
                      {currency(Math.max(0, t.due))}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" aria-label="Open order">
                          <Link to="/orders/$id" params={{ id: o.id }}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete order"
                          onClick={() => removeOrder(o as Order)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">New order</DialogTitle>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-medium">Customer details</h3>
                <p className="text-xs text-muted-foreground">
                  Fill in name, mobile and address, then press Save — the order fills itself in.
                </p>
              </div>
              {customerSaved && (
                <span className="rounded-full border border-success/25 bg-success/12 px-2.5 py-0.5 text-xs text-success">
                  Saved
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Customer name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerSaved(false);
                  }}
                  list="customer-names"
                  placeholder="Walk-in"
                />
                <datalist id="customer-names">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Mobile number</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setCustomerSaved(false);
                  }}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input
                  value={customerAddress}
                  onChange={(e) => {
                    setCustomerAddress(e.target.value);
                    setCustomerSaved(false);
                  }}
                />
              </div>
            </div>
            <Button
              className="mt-3"
              variant="secondary"
              onClick={saveCustomer}
              disabled={savingCustomer}
            >
              {savingCustomer ? "Saving…" : "Save customer"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Source</Label>
              <Select value={newSource} onValueChange={(v) => setNewSource(v as OrderSource)}>
                <SelectTrigger className="w-full capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_SOURCES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Add product</Label>
              <Select value="" onValueChange={addItem}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {currency(Number(p.sell_price))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {items.length === 0 && (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No products added yet.
              </p>
            )}
            {items.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-2">
                <span className="min-w-32 flex-1 truncate text-sm">{it.product_name}</span>
                <div className="w-20">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x,
                        ),
                      )
                    }
                  />
                </div>
                <div className="w-28">
                  <Label className="text-xs text-muted-foreground">Price</Label>
                  <Input
                    type="number"
                    value={it.unit_price}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, unit_price: Number(e.target.value) || 0 } : x,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove item"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label>Delivery</Label>
            <div className="mt-1 grid gap-2 sm:grid-cols-3">
              {DELIVERY_ZONES.map((z) => (
                <button
                  key={z.value}
                  type="button"
                  onClick={() => pickZone(z.value)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    zone === z.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="block">{z.label}</span>
                  <span className="num text-xs text-muted-foreground">
                    {z.value === "free" ? "Free" : currency(chargeFor(z.value))}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Discount</Label>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Delivery charge</Label>
              <Input
                type="number"
                value={zone === "free" ? 0 : shipping}
                disabled={zone === "free"}
                onChange={(e) => setShipping(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
            <span className="text-sm text-muted-foreground">Total (Cash on Delivery)</span>
            <span className="num font-display text-2xl">{currency(draftTotal)}</span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOrder} disabled={saving}>
              {saving ? "Saving…" : "Create order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
