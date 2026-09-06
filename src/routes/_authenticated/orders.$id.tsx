import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Link2, Printer, Share2 } from "lucide-react";
import { CourierPanel } from "@/components/CourierPanel";
import { AppShell } from "@/components/AppShell";
import { Invoice } from "@/components/Invoice";
import { useOrder, useTableMutation, markOrderShipped } from "@/lib/data";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import {
  currency,
  deliveryZoneLabel,
  invoiceNo,
  orderTotals,
  statusTone,
  ORDER_STATUSES,
  type Order,
  type OrderStatus,
} from "@/lib/shop";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  validateSearch: (search: Record<string, unknown>): { invoice?: true } =>
    search["invoice"] === true || search["invoice"] === "true" ? { invoice: true } : {},
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Order details & invoice — Muuchstac Glow BD" },
      {
        name: "description",
        content:
          "See order line items, costs and profit, update the status and print a customer invoice.",
      },
      { property: "og:title", content: "Order details & invoice — Muuchstac Glow BD" },
      {
        property: "og:description",
        content:
          "See order line items, costs and profit, update the status and print a customer invoice.",
      },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { invoice: autoInvoice } = Route.useSearch();
  const { data: order, isLoading } = useOrder(id);
  const qc = useQueryClient();
  const mutation = useTableMutation("orders", ["orders"]);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const autoDone = useRef(false);

  async function savePdf(silent = false) {
    const el = invoiceRef.current;
    if (!el || !order) return;
    setPdfBusy(true);
    try {
      await downloadInvoicePdf(el, `${invoiceNo(order as Order)}.pdf`);
      if (!silent) toast.success("Invoice PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the PDF");
    } finally {
      setPdfBusy(false);
    }
  }

  async function copyLink() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invoice link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  async function shareInvoice() {
    const o2 = order as Order;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const share = (navigator as Navigator).share;
    if (share) {
      try {
        await share.call(navigator, {
          title: `Invoice ${invoiceNo(o2)}`,
          text: `Invoice ${invoiceNo(o2)} — order #${o2.order_no}`,
          url,
        });
        return;
      } catch {
        // user cancelled or sharing unavailable — fall back to copying
      }
    }
    await copyLink();
  }

  // A fresh order gets its invoice PDF made and downloaded straight away.
  useEffect(() => {
    if (!autoInvoice || !order || autoDone.current) return;
    autoDone.current = true;
    const t = setTimeout(() => {
      void savePdf(true).then(() => toast.success("Invoice PDF saved for this order"));
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInvoice, order]);

  if (isLoading) {
    return (
      <AppShell title="Order" subtitle="Loading…">
        <div className="surface h-64 animate-pulse" />
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell title="Order not found" subtitle="This order may have been deleted.">
        <Button asChild variant="outline">
          <Link to="/orders">
            <ArrowLeft className="size-4" /> Back to orders
          </Link>
        </Button>
      </AppShell>
    );
  }

  const o = order as Order;
  const t = orderTotals(o);
  const items = o.order_items ?? [];

  function setStatus(next: OrderStatus) {
    if (next === "shipped") {
      markOrderShipped(o)
        .then((v) => {
          qc.invalidateQueries({ queryKey: ["orders"] });
          qc.invalidateQueries({ queryKey: ["orders", o.id] });
          toast.success(`Parcel sent · tracking ${v.tracking_code}`);
        })
        .catch((e) =>
          toast.error(e instanceof Error ? e.message : "Could not send the parcel"),
        );
      return;
    }
    mutation.mutate(
      { action: "update", id: o.id, values: { status: next } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["orders", o.id] });
          toast.success(`Marked as ${next}`);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
      },
    );
  }

  return (
    <AppShell
      title={`Order #${o.order_no}`}
      subtitle={`${invoiceNo(o)} · ${new Date(o.created_at).toLocaleString("en-GB")}`}
      actions={
        <div className="no-print flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/orders">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
          <Button variant="outline" onClick={() => void copyLink()}>
            <Link2 className="size-4" /> Copy link
          </Button>
          <Button variant="outline" onClick={() => void shareInvoice()}>
            <Share2 className="size-4" /> Share
          </Button>
          <Button onClick={() => savePdf()} disabled={pdfBusy}>
            <Download className="size-4" /> {pdfBusy ? "Making PDF…" : "Download PDF"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="no-print space-y-4">
          <div className="surface p-4">
            <h2 className="text-lg">Status</h2>
            <span
              className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs capitalize ${statusTone(o.status)}`}
            >
              {o.status}
            </span>
            <Select value={o.status} onValueChange={(v) => setStatus(v as OrderStatus)}>
              <SelectTrigger className="mt-3 w-full capitalize">
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
          </div>

          <CourierPanel order={o} />

          <div className="surface p-4">
            <h2 className="text-lg">Line items</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {items.length === 0 && (
                <li className="text-muted-foreground">No products on this order.</li>
              )}
              {items.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    {(i.product_image_urls?.length
                      ? i.product_image_urls
                      : i.product_image_url
                        ? [i.product_image_url]
                        : []
                    ).length > 0 && (
                      <span className="mb-1 flex gap-1">
                        {(i.product_image_urls?.length
                          ? i.product_image_urls
                          : [i.product_image_url as string]
                        )
                          .slice(0, 3)
                          .map((src, n) => (
                            <img
                              key={src + n}
                              src={src}
                              alt={i.product_name}
                              className="size-9 rounded-md border border-border object-cover"
                            />
                          ))}
                      </span>
                    )}
                    <span className="block truncate">{i.product_name}</span>
                    <span className="num text-xs text-muted-foreground">
                      {i.qty} × {currency(i.unit_price)}
                    </span>
                  </span>
                  <span className="num">{currency(i.qty * i.unit_price)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface space-y-1.5 p-4 text-sm">
            <h2 className="text-lg">Money</h2>
            <Row label="Subtotal" value={currency(t.subtotal)} />
            <Row label="Product cost" value={currency(t.cogs)} />
            <Row label="Discount" value={currency(o.discount)} />
            <Row
              label={deliveryZoneLabel(o.delivery_zone)}
              value={o.shipping_charge > 0 ? currency(o.shipping_charge) : "Free"}
            />
            <Row label="Packaging" value={currency(o.packaging_cost)} />
            <Row label="Other cost" value={currency(o.other_cost)} />
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span>Total</span>
              <span className="num">{currency(t.total)}</span>
            </div>
            <Row label="Collect on delivery" value={currency(t.total)} />
            <div className="flex justify-between border-t border-border pt-2 font-medium text-success">
              <span>Profit</span>
              <span className="num">{currency(t.profit)}</span>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="surface overflow-hidden" ref={invoiceRef}>
            <Invoice order={o} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="num text-foreground">{value}</span>
    </div>
  );
}
