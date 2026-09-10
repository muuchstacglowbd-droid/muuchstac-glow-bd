import { useShopSettings } from "@/lib/data";
import { currency } from "@/lib/shop";
import { BRAND_LOGO_URL, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

const FALLBACK = {
  company_name: BRAND_NAME,
  tagline: BRAND_TAGLINE,
  logo_url: BRAND_LOGO_URL,
  address: null as string | null,
  phone: null as string | null,
  email: null as string | null,
};

export type ProductSummaryRow = {
  product_name: string;
  qty: number;
  orders: number;
  value: number;
};

export type ProductSummaryTotals = {
  products: number;
  pieces: number;
  orders: number;
  value: number;
};

/**
 * Printable "which product sold how many pieces" report for a set of
 * orders. Rendered on screen inside a dialog and also used as the
 * source element for the PDF download (see downloadInvoicePdf).
 */
export function OrderProductReport({
  rows,
  totals,
  filterLabel,
}: {
  rows: ProductSummaryRow[];
  totals: ProductSummaryTotals;
  filterLabel?: string;
}) {
  const { data: settings } = useShopSettings();
  const shop = {
    ...FALLBACK,
    ...(settings ?? {}),
    company_name: BRAND_NAME,
    tagline: settings?.tagline || BRAND_TAGLINE,
    logo_url: BRAND_LOGO_URL,
  };
  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
          <p className="font-display text-2xl leading-none">Product Report</p>
          <p className="text-muted-foreground">Order-wise product quantity</p>
          <p className="num mt-1 text-xs text-muted-foreground">Generated {generatedAt}</p>
        </div>
      </header>

      {filterLabel && (
        <p className="mt-4 text-xs text-muted-foreground">
          <span className="uppercase tracking-wide">Filters:</span> {filterLabel}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Orders" value={String(totals.orders)} />
        <Stat label="Products" value={String(totals.products)} />
        <Stat label="Total pieces" value={String(totals.pieces)} />
        <Stat label="Total value" value={currency(totals.value)} />
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 font-medium">#</th>
            <th className="py-2 font-medium">Product</th>
            <th className="py-2 text-right font-medium">Orders</th>
            <th className="py-2 text-right font-medium">Qty ordered</th>
            <th className="py-2 text-right font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.product_name} className="border-b border-border/60 align-middle">
              <td className="num py-2.5 text-muted-foreground">{idx + 1}</td>
              <td className="py-2.5">{r.product_name}</td>
              <td className="num py-2.5 text-right">{r.orders}</td>
              <td className="num py-2.5 text-right font-medium">{r.qty}</td>
              <td className="num py-2.5 text-right">{currency(r.value)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-muted-foreground">
                No products in the selected orders.
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-border font-medium">
              <td className="py-2.5" colSpan={3}>
                Total
              </td>
              <td className="num py-2.5 text-right">{totals.pieces}</td>
              <td className="num py-2.5 text-right">{currency(totals.value)}</td>
            </tr>
          </tfoot>
        )}
      </table>

      <footer className="mt-8 rounded-xl border border-border bg-muted/40 px-5 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          {shop.company_name} · {totals.orders} orders · {totals.pieces} pieces across{" "}
          {totals.products} products
        </p>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="num mt-0.5 font-display text-lg">{value}</p>
    </div>
  );
}
