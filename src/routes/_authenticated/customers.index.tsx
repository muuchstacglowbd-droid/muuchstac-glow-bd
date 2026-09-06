import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, MailCheck, Plus, Send, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  queueEmail,
  useCustomers,
  useEmailLog,
  useOrders,
  useTableMutation,
} from "@/lib/data";
import { currency, orderTotals, type Customer, type Order } from "@/lib/shop";
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
import { useQueryClient } from "@tanstack/react-query";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Customers & Email List — Muuchstac Glow BD" },
      {
        name: "description",
        content:
          "Keep customer name, mobile, address and email in one book, manage email subscriptions and send order updates.",
      },
      { property: "og:title", content: "Customers & Email List — Muuchstac Glow BD" },
      {
        property: "og:description",
        content:
          "Keep customer name, mobile, address and email in one book, manage email subscriptions and send order updates.",
      },
    ],
  }),
  component: CustomersPage,
});

const EMPTY = { name: "", phone: "", address: "", email: "", notes: "", email_subscribed: true };

function CustomersPage() {
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders();
  const { data: emailLog = [] } = useEmailLog();
  const qc = useQueryClient();
  const mutation = useTableMutation("customers", ["customers"]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ ...EMPTY });
  const [mailTo, setMailTo] = useState<Customer | null>(null);
  const [mailOrderId, setMailOrderId] = useState("");
  const [sending, setSending] = useState(false);

  const stats = useMemo(() => {
    const map = new Map<string, { spend: number; count: number; returns: number }>();
    for (const o of orders as Order[]) {
      if (!o.customer_id) continue;
      const row = map.get(o.customer_id) ?? { spend: 0, count: 0, returns: 0 };
      row.count += 1;
      if (o.status === "delivered") row.spend += orderTotals(o).total;
      if (o.status === "returned") row.returns += 1;
      map.set(o.customer_id, row);
    }
    return map;
  }, [orders]);

  const subscribed = customers.filter((c) => c.email_subscribed && c.email).length;

  const filtered = customers.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [c.name, c.phone, c.address, c.email].some((v) => v?.toLowerCase().includes(s));
  });

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone ?? "",
      address: c.address ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
      email_subscribed: c.email_subscribed,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const values = {
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      email: form.email.trim() || null,
      notes: form.notes || null,
      email_subscribed: Boolean(form.email.trim()) && form.email_subscribed,
      subscribed_at:
        Boolean(form.email.trim()) && form.email_subscribed ? new Date().toISOString() : null,
    };
    try {
      if (editing) {
        await mutation.mutateAsync({ action: "update", id: editing.id, values });
        toast.success("Customer updated");
      } else {
        await mutation.mutateAsync({ action: "insert", values });
        toast.success("Customer added");
      }
      setForm({ ...EMPTY });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function toggleSubscribe(c: Customer) {
    if (!c.email) {
      toast.error("Add an email address first.");
      return;
    }
    const next = !c.email_subscribed;
    await mutation.mutateAsync({
      action: "update",
      id: c.id,
      values: {
        email_subscribed: next,
        subscribed_at: next ? new Date().toISOString() : null,
      },
    });
    toast.success(next ? `${c.name} subscribed` : `${c.name} unsubscribed`);
  }

  async function toggleBlacklist(c: Customer) {
    await mutation.mutateAsync({
      action: "update",
      id: c.id,
      values: { blacklisted: !c.blacklisted },
    });
  }

  async function remove(c: Customer) {
    if (!confirm(`Delete ${c.name}?`)) return;
    await mutation.mutateAsync({ action: "delete", id: c.id });
    toast.success("Customer deleted");
  }

  const customerOrders = mailTo
    ? (orders as Order[]).filter((o) => o.customer_id === mailTo.id)
    : [];

  async function sendOrderMail(e: React.FormEvent) {
    e.preventDefault();
    if (!mailTo?.email) return;
    const order = customerOrders.find((o) => o.id === mailOrderId);
    if (!order) {
      toast.error("Pick an order first.");
      return;
    }
    const t = orderTotals(order);
    const lines = (order.order_items ?? [])
      .map((i) => `- ${i.product_name} x${i.qty} — ${currency(i.qty * i.unit_price)}`)
      .join("\n");
    setSending(true);
    try {
      await queueEmail({
        customer_id: mailTo.id,
        order_id: order.id,
        to_email: mailTo.email,
        subject: `${BRAND_NAME} — order #${order.order_no} is ${order.status}`,
        body: `Hi ${mailTo.name},\n\nHere is an update on your order #${order.order_no} (${order.status}).\n\n${lines}\n\nTotal: ${currency(t.total)}\nPaid: ${currency(order.advance_paid)}\nDue: ${currency(t.due)}\n\nThank you for shopping with ${BRAND_NAME}.`,
      });
      qc.invalidateQueries({ queryKey: ["email_log"] });
      toast.success("Order email queued for " + mailTo.email);
      setMailTo(null);
      setMailOrderId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not queue email");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell
      title="Customers"
      subtitle={`${customers.length} people · ${subscribed} subscribed to email`}
      actions={
        <Button onClick={openNew}>
          <Plus className="size-4" /> Add customer
        </Button>
      }
    >
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, mobile, address or email…"
        className="mb-4 w-full sm:max-w-sm"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No customers yet.</p>
        )}
        {filtered.map((c) => {
          const s = stats.get(c.id) ?? { spend: 0, count: 0, returns: 0 };
          return (
            <div key={c.id} className="surface p-4">
              <div className="flex items-start justify-between gap-2">
                <button className="min-w-0 text-left" onClick={() => openEdit(c)}>
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="num truncate text-xs text-muted-foreground">
                    {c.phone || "No mobile"}
                  </p>
                </button>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" asChild title="Open profile">
                    <Link to="/customers/$id" params={{ id: c.id }}>
                      <UserRound className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={c.email_subscribed ? "Unsubscribe from emails" : "Subscribe to emails"}
                    onClick={() => toggleSubscribe(c)}
                  >
                    {c.email_subscribed ? (
                      <MailCheck className="size-4 text-success" />
                    ) : (
                      <Mail className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Send order email"
                    disabled={!c.email}
                    onClick={() => {
                      setMailTo(c);
                      setMailOrderId("");
                    }}
                  >
                    <Send className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={c.blacklisted ? "Remove blacklist" : "Blacklist"}
                    onClick={() => toggleBlacklist(c)}
                  >
                    <ShieldAlert
                      className={`size-4 ${c.blacklisted ? "text-destructive" : "text-muted-foreground"}`}
                    />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {c.email || "No email address"}
              </p>
              {c.address && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.address}</p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                <div>
                  <p className="num text-sm font-medium">{s.count}</p>
                  <p className="text-[11px] text-muted-foreground">Orders</p>
                </div>
                <div>
                  <p className="num text-sm font-medium">{currency(s.spend)}</p>
                  <p className="text-[11px] text-muted-foreground">Spend</p>
                </div>
                <div>
                  <p className="num text-sm font-medium">{s.returns}</p>
                  <p className="text-[11px] text-muted-foreground">Returns</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {emailLog.length > 0 && (
        <div className="surface mt-8 overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 font-display text-2xl">Sent emails</h2>
          <ul className="divide-y divide-border text-sm">
            {emailLog.slice(0, 10).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="min-w-0 flex-1 truncate">{m.subject}</span>
                <span className="truncate text-xs text-muted-foreground">{m.to_email}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                  {m.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing ? "Edit customer" : "Add customer"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={form.email_subscribed}
                onChange={(e) => setForm({ ...form, email_subscribed: e.target.checked })}
              />
              Subscribe to order emails and offers
            </label>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {editing ? "Save changes" : "Add customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mailTo} onOpenChange={(v) => !v && setMailTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Email {mailTo?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={sendOrderMail} className="space-y-3">
            <p className="text-sm text-muted-foreground">Sending to {mailTo?.email}</p>
            <div className="space-y-1.5">
              <Label>Order</Label>
              <select
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={mailOrderId}
                onChange={(e) => setMailOrderId(e.target.value)}
                required
              >
                <option value="">Choose an order…</option>
                {customerOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.order_no} — {o.status} — {currency(orderTotals(o).total)}
                  </option>
                ))}
              </select>
              {customerOrders.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  This customer has no orders linked yet.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={sending || customerOrders.length === 0}>
                <Send className="size-4" /> Send order email
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
