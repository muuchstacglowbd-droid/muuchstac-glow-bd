import { useShopSettings } from "@/lib/data";
import { currency, deliveryZoneLabel, invoiceNo, orderTotals, type Order } from "@/lib/shop";
import { BRAND_LOGO_URL, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

const FALLBACK = {
  company_name: BRAND_NAME,
  tagline: BRAND_TAGLINE,
  logo_url: BRAND_LOGO_URL,
  address: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  thank_you_message:
    "Thank you for shopping with us! Your trust means the world to us. Payment is Cash on Delivery — please pay the courier on arrival.",
};

export function Invoice({ order }: { order: Order }) {
  const { data: settings } = useShopSettings();
  const shop = {
    ...FALLBACK,
    ...(settings ?? {}),
    company_name: BRAND_NAME,
    tagline: settings?.tagline || BRAND_TAGLINE,
    logo_url: BRAND_LOGO_URL,
  };
  const t = orderTotals(order);
  const items = order.order_items ?? [];
  const isFree = (order.shipping_charge || 0) <= 0 || order.delivery_zone === "free";
  const date = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="print-area mx-auto w-full max-w-2xl bg-card p-8 text-foreground">
      <header className="flex items-start justify-between gap-6 border-b border-border pb-6">
        <div className="flex items-start gap-4">
          <img
            src={shop.logo_url}
            alt={`${shop.company_name} logo`}
            className="size-16 rounded-lg object-cover"
          />
          <div>
            <h2 className="font-display text-3xl leading-none">{shop.company_name}</h2>
            {shop.tagline && <p className="mt-1 text-xs text-muted-foreground">{shop.tagline}</p>}
            {shop.address && (
              <p className="mt-2 max-w-56 text-xs text-muted-foreground">{shop.address}</p>
            )}
            {(shop.phone || shop.email) && (
              <p className="num text-xs text-muted-foreground">
                {[shop.phone, shop.email].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-display text-2xl leading-none">Invoice</p>
          <p className="num mt-1 font-medium">{invoiceNo(order)}</p>
          <p className="num text-muted-foreground">Order #{order.order_no}</p>
          <p className="text-muted-foreground">{date}</p>
          <span className="mt-2 inline-block rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide">
            Cash on Delivery
          </span>
        </div>
      </header>

      <div className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Billed to</p>
          <p className="mt-1 font-medium">{order.customer_name || "Walk-in customer"}</p>
          {order.customer_phone && (
            <p className="num text-sm text-muted-foreground">{order.customer_phone}</p>
          )}
          {order.customer_address && (
            <p className="text-sm text-muted-foreground">{order.customer_address}</p>
          )}
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="mt-1 capitalize">{order.status}</p>
          <p className="text-sm capitalize text-muted-foreground">via {order.source}</p>
          <p className="text-sm text-muted-foreground">
            {isFree ? "Free delivery" : deliveryZoneLabel(order.delivery_zone)}
          </p>
          {order.tracking_code && (
            <p className="num text-sm text-muted-foreground">Tracking: {order.tracking_code}</p>
          )}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 font-medium">Product</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Price</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-border/60 align-middle">
              <td className="py-2.5">
                <div className="flex items-center gap-3">
                  {(() => {
                    const photos = (
                      i.product_image_urls?.length
                        ? i.product_image_urls
                        : i.product_image_url
                          ? [i.product_image_url]
                          : []
                    ).slice(0, 3);
                    if (photos.length === 0)
                      return (
                        <div className="size-11 rounded-lg border border-dashed border-border" />
                      );
                    return (
                      <div className="flex shrink-0 gap-1">
                        {photos.map((src, n) => (
                          <img
                            key={src + n}
                            src={src}
                            alt={i.product_name}
                            className="size-11 rounded-lg border border-border object-cover"
                          />
                        ))}
                      </div>
                    );
                  })()}
                  <span className="min-w-0 truncate">{i.product_name}</span>
                </div>
              </td>
              <td className="num py-2.5 text-right">{i.qty}</td>
              <td className="num py-2.5 text-right">{currency(i.unit_price)}</td>
              <td className="num py-2.5 text-right">{currency(i.qty * i.unit_price)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-muted-foreground">
                No items on this order.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
        <Row label="Product total" value={currency(t.subtotal)} />
        {order.discount > 0 && <Row label="Discount" value={"-" + currency(order.discount)} />}
        <Row
          label={isFree ? "Delivery" : deliveryZoneLabel(order.delivery_zone)}
          value={isFree ? "Free" : currency(order.shipping_charge)}
        />
        <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-muted/60 px-3 py-2.5">
          <span className="font-medium">Total (Cash on Delivery)</span>
          <span className="num font-display text-2xl">{currency(t.total)}</span>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          Please pay {currency(t.total)} to the delivery agent.
        </p>
      </div>

      {order.note && (
        <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
          {order.note}
        </p>
      )}

      <footer className="mt-8 rounded-xl border border-border bg-muted/40 px-5 py-4 text-center">
        <p className="font-display text-lg">Thank you for your order ♥</p>
        <p className="mt-1 text-sm text-muted-foreground">{shop.thank_you_message}</p>
      </footer>
    </div>
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
