import { useServerFn } from "@tanstack/react-start";
import { autoSendOrderToCourier } from "@/lib/courier.functions";
import { COURIER_LABEL } from "@/lib/courier";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Eye, FileText, Plus, Search, Trash2, Users, X } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { Shimmer } from "@/components/ds/skeletons";
import { AppShell } from "@/components/AppShell";
import { CourierCell, RefreshAllCourierButton } from "@/components/CourierCell";
import { OrderProductReport } from "@/components/OrderProductReport";
import {
  createOrder,
  createTeamMember,
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
  useTeamMembers,
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
  type TeamMember,
} from "@/lib/shop";
import { parseCustomerPaste } from "@/lib/customer-paste";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: shopSettings } = useShopSettings();
  const qc = useQueryClient();
  const autoSend = useServerFn(autoSendOrderToCourier);
  const navigate = useNavigate();
  const orderMutation = useTableMutation("orders", ["orders", "products"]);
  const teamMutation = useTableMutation("team_members", ["team_members"]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [source, setSource] = useState<OrderSource | "all">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const { new: openNew } = Route.useSearch();
  const [open, setOpen] = useState(!!openNew);
  const [saving, setSaving] = useState(false);

  const [customerPaste, setCustomerPaste] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [newSource, setNewSource] = useState<OrderSource>("facebook");
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string>("");
  const [discount, setDiscount] = useState(0);
  const [zone, setZone] = useState<DeliveryZone>("inside_dhaka");
  const [shipping, setShipping] = useState(0);
  const [items, setItems] = useState<Draft[]>([]);
  const [customerSaved, setCustomerSaved] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [teamOpen, setTeamOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberCode, setNewMemberCode] = useState("");
  const [savingMember, setSavingMember] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportPdfBusy, setReportPdfBusy] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

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

  /**
   * Save the customer box: if a message was pasted in, parse the name,
   * mobile number and address out of it first (converting the mobile
   * number to English digits when the customer typed it in Bangla), then
   * store the details and auto-fill the rest of the order.
   */
  async function saveCustomer() {
    let nameInput = customerName;
    let phoneInput = customerPhone;
    let addressInput = customerAddress;

    if (customerPaste.trim()) {
      const parsed = parseCustomerPaste(customerPaste);
      nameInput = parsed.name || nameInput;
      phoneInput = parsed.phone || phoneInput;
      addressInput = parsed.address || addressInput;
      setCustomerName(nameInput);
      setCustomerPhone(phoneInput);
      setCustomerAddress(addressInput);
    }

    if (!nameInput.trim() && !phoneInput.trim()) {
      toast.error("Add a name or a mobile number first.");
      return;
    }
    setSavingCustomer(true);
    try {
      const existing = await findCustomer({ phone: phoneInput, name: nameInput });
      await ensureCustomer({
        name: nameInput,
        phone: phoneInput,
        address: addressInput,
      });
      const name = nameInput || existing?.name || "";
      const phone = phoneInput || existing?.phone || "";
      const address = addressInput || existing?.address || "";
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
      setCustomerPaste("");
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

  /** Auto-generates a code (e.g. TM-004) when the code field is left blank. */
  async function addTeamMember() {
    if (!newMemberName.trim()) {
      toast.error("Add a name for the team member.");
      return;
    }
    setSavingMember(true);
    try {
      await createTeamMember({
        name: newMemberName,
        phone: newMemberPhone,
        member_code: newMemberCode,
      });
      setNewMemberName("");
      setNewMemberPhone("");
      setNewMemberCode("");
      await qc.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Team member added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the team member");
    } finally {
      setSavingMember(false);
    }
  }

  function removeTeamMember(member: TeamMember) {
    if (!confirm(`Remove ${member.name} from the team? Their past orders stay as they are.`))
      return;
    teamMutation.mutate(
      { action: "delete", id: member.id },
      {
        onSuccess: () => {
          toast.success("Team member removed");
          if (selectedTeamMemberId === member.id) setSelectedTeamMemberId("");
          if (teamFilter === member.id) setTeamFilter("all");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove"),
      },
    );
  }

  /** How many orders (and how much revenue) each team member has booked so far. */
  const teamStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      const id = (o as Order).team_member_id;
      if (!id) continue;
      const t = orderTotals(o as Order);
      const prev = stats.get(id) ?? { count: 0, total: 0 };
      stats.set(id, { count: prev.count + 1, total: prev.total + t.total });
    }
    return stats;
  }, [orders]);

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
      if (teamFilter !== "all" && (o as Order).team_member_id !== teamFilter) return false;
      if (!term) return true;
      return (
        String(o.order_no).includes(term) ||
        (o.customer_name ?? "").toLowerCase().includes(term) ||
        (o.customer_phone ?? "").toLowerCase().includes(term) ||
        (o.tracking_code ?? "").toLowerCase().includes(term)
      );
    });
  }, [orders, q, status, source, teamFilter]);

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

  /** Which products were ordered, and how many pieces of each — across the
   * orders currently shown by the filters above. Powers the "Product
   * report" PDF. */
  const productSummary = useMemo(() => {
    const map = new Map<string, { product_name: string; qty: number; orders: number; value: number }>();
    for (const o of filtered) {
      const items = (o as Order).order_items ?? [];
      const seenInThisOrder = new Set<string>();
      for (const it of items) {
        const key = it.product_name || "Unnamed product";
        const row = map.get(key) ?? { product_name: key, qty: 0, orders: 0, value: 0 };
        row.qty += it.qty;
        row.value += it.qty * it.unit_price;
        if (!seenInThisOrder.has(key)) {
          row.orders += 1;
          seenInThisOrder.add(key);
        }
        map.set(key, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [filtered]);

  const productSummaryTotals = useMemo(
    () => ({
      orders: filtered.length,
      products: productSummary.length,
      pieces: productSummary.reduce((s, r) => s + r.qty, 0),
      value: productSummary.reduce((s, r) => s + r.value, 0),
    }),
    [filtered, productSummary],
  );

  const productReportFilterLabel = useMemo(() => {
    const parts: string[] = [];
    parts.push(status === "all" ? "All statuses" : `Status: ${status}`);
    parts.push(source === "all" ? "All sources" : `Source: ${source}`);
    if (teamFilter !== "all") {
      const member = teamMembers.find((m) => m.id === teamFilter);
      if (member) parts.push(`Team: ${member.name}`);
    }
    if (q.trim()) parts.push(`Search: "${q.trim()}"`);
    return parts.join(" · ");
  }, [status, source, teamFilter, q, teamMembers]);

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
    setCustomerPaste("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setNewSource("facebook");
    setSelectedTeamMemberId("");
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
      const teamMember = teamMembers.find((m) => m.id === selectedTeamMemberId) ?? null;
      const id = await createOrder({
        order: {
          customer_id: customerId,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          team_member_id: teamMember?.id ?? null,
          team_member_name: teamMember?.name ?? null,
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

  async function downloadProductReport() {
    const el = reportRef.current;
    if (!el) return;
    setReportPdfBusy(true);
    try {
      await downloadInvoicePdf(
        el,
        `product-order-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      toast.success("Product report PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the PDF");
    } finally {
      setReportPdfBusy(false);
    }
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
                    team_member: (o as Order).team_member_name ?? "",
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
          <Button variant="outline" onClick={() => setTeamOpen(true)}>
            <Users className="size-4" /> Team
          </Button>
          <Button variant="outline" onClick={() => setReportOpen(true)}>
            <FileText className="size-4" /> Product report
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
        <div className="w-full sm:w-44">
          <Label className="text-xs text-muted-foreground">Team member</Label>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team members</SelectItem>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(q || status !== "all" || source !== "all" || teamFilter !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setQ("");
              setStatus("all");
              setSource("all");
              setTeamFilter("all");
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
                      {(o as Order).team_member_name ? ` · ${(o as Order).team_member_name}` : ""}
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
                <th scope="col" className="px-4 py-2.5 font-medium">
                  #
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Customer
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Source
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Team
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Courier
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Due
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-t border-border/70">
                    {Array.from({ length: 9 }).map((__, c) => (
                      <td key={c} className="px-4 py-3">
                        <Shimmer className="h-3.5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
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
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {(o as Order).team_member_name || "—"}
                    </td>
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

            <div className="mt-3">
              <Label>Paste customer message (optional)</Label>
              <Textarea
                value={customerPaste}
                onChange={(e) => setCustomerPaste(e.target.value)}
                placeholder={
                  "কাস্টমারের নাম, মোবাইল নাম্বার ও ঠিকানা এখানে paste করুন, যেমন—\nরহিম উদ্দিন\n০১৭xxxxxxxx\nমিরপুর, ঢাকা"
                }
                rows={3}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Save customer চাপ দিলে এখান থেকে নাম, মোবাইল ও ঠিকানা নিচের ঘরগুলোতে
                automatic বসে যাবে। বাংলা সংখ্যায় লেখা মোবাইল নাম্বার ইংরেজি সংখ্যায় convert
                হয়ে যাবে।
              </p>
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
              <Label>Team member</Label>
              <Select
                value={selectedTeamMemberId || "none"}
                onValueChange={(v) => setSelectedTeamMemberId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Not assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      {m.member_code ? ` (${m.member_code})` : ""}
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
              <div
                key={idx}
                className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-2"
              >
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

      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Team work</DialogTitle>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <h3 className="font-medium">Add team member</h3>
            <p className="text-xs text-muted-foreground">
              Name and mobile are enough — the ID fills itself in (e.g. TM-004), but you can
              type your own instead.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. Rahim"
                />
              </div>
              <div>
                <Label>Mobile number</Label>
                <Input
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <Label>Member ID</Label>
                <Input
                  value={newMemberCode}
                  onChange={(e) => setNewMemberCode(e.target.value)}
                  placeholder="Auto — or type your own"
                />
              </div>
            </div>
            <Button className="mt-3" variant="secondary" onClick={addTeamMember} disabled={savingMember}>
              {savingMember ? "Adding…" : "Add team member"}
            </Button>
          </div>

          <div className="mt-2 space-y-2">
            {teamMembers.length === 0 && (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No team members yet — add one above.
              </p>
            )}
            {teamMembers.map((m) => {
              const stats = teamStats.get(m.id);
              return (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {m.name}
                      {m.member_code && (
                        <span className="num ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {m.member_code}
                        </span>
                      )}
                    </p>
                    {m.phone && <p className="num text-xs text-muted-foreground">{m.phone}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-muted-foreground">
                      <p className="num">{stats?.count ?? 0} orders</p>
                      <p className="num">{currency(stats?.total ?? 0)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${m.name}`}
                      onClick={() => removeTeamMember(m)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Product order report</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Shows how many pieces of each product were ordered, based on the orders currently
            shown by your filters above ({summary.count} orders).
          </p>

          <div className="overflow-hidden rounded-xl border border-border" ref={reportRef}>
            <OrderProductReport
              rows={productSummary}
              totals={productSummaryTotals}
              filterLabel={productReportFilterLabel}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Close
            </Button>
            <Button onClick={downloadProductReport} disabled={reportPdfBusy || productSummary.length === 0}>
              {reportPdfBusy ? "Preparing…" : "Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
