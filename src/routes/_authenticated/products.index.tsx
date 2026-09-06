import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Shimmer } from "@/components/ds/skeletons";
import { MiniFact } from "@/components/ds/MiniFact";

import { AppShell } from "@/components/AppShell";
import { MultiImageUploadField } from "@/components/MultiImageUploadField";
import { useProducts, useTableMutation } from "@/lib/data";
import { currency, type Product } from "@/lib/shop";
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

export const Route = createFileRoute("/_authenticated/products/")({
  head: () => ({
    meta: [
      { title: "Products & Inventory — Rose Nude" },
      {
        name: "description",
        content:
          "Add, edit and track cosmetics products, buy/sell price, stock levels and low-stock alerts.",
      },
      { property: "og:title", content: "Products & Inventory — Rose Nude" },
      {
        property: "og:description",
        content:
          "Add, edit and track cosmetics products, buy/sell price, stock levels and low-stock alerts.",
      },
    ],
  }),
  component: ProductsPage,
});

const EMPTY = {
  name: "",
  sku: "",
  brand: "",
  category: "",
  buy_price: 0,
  sell_price: 0,
  stock: 0,
  low_stock_threshold: 3,
  image_url: null as string | null,
  image_urls: [] as string[],
};

function ProductsPage() {
  const { data: products = [], isLoading } = useProducts();
  const mutation = useTableMutation("products", ["products"]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) =>
      [p.name, p.sku, p.brand, p.category].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [products, q]);

  const stockValue = products.reduce((s, p) => s + p.stock * p.buy_price, 0);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      brand: p.brand ?? "",
      category: p.category ?? "",
      buy_price: p.buy_price,
      sell_price: p.sell_price,
      stock: p.stock,
      low_stock_threshold: p.low_stock_threshold,
      image_url: p.image_url ?? null,
      image_urls: p.image_urls?.length ? p.image_urls : p.image_url ? [p.image_url] : [],
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const values = {
      ...form,
      sku: form.sku || null,
      brand: form.brand || null,
      category: form.category || null,
      buy_price: Number(form.buy_price),
      sell_price: Number(form.sell_price),
      stock: Number(form.stock),
      low_stock_threshold: Number(form.low_stock_threshold),
      image_urls: form.image_urls,
      image_url: form.image_urls[0] ?? null,
    };
    try {
      if (editing) {
        await mutation.mutateAsync({ action: "update", id: editing.id, values });
        toast.success("Product updated");
      } else {
        await mutation.mutateAsync({ action: "insert", values });
        toast.success("Product added");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save product");
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await mutation.mutateAsync({ action: "delete", id: p.id });
      toast.success("Product deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <AppShell
      title="Products & Inventory"
      subtitle={`${products.length} products · stock value ${currency(stockValue)}`}
      actions={
        <Button onClick={openNew}>
          <Plus className="size-4" /> Add product
        </Button>
      }
    >
      <div className="surface overflow-hidden">
        <div className="border-b border-border p-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, SKU, brand or category…"
            className="w-full sm:max-w-sm"
          />
        </div>

        {/* Phones get one card per product. */}
        <div className="divide-y divide-border/70 lg:hidden">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`mskel-${i}`} className="space-y-2 p-4">
                <Shimmer className="h-4 w-2/3" />
                <Shimmer className="h-3 w-1/3" />
              </div>
            ))}
          {!isLoading && filtered.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-title font-semibold">No products yet</p>
              <p className="mt-1 text-caption text-muted-foreground">
                Add your first item to start tracking stock and margin.
              </p>
            </div>
          )}
          {!isLoading &&
            filtered.map((p) => {
              const low = p.stock <= p.low_stock_threshold;
              return (
                <div key={`m-${p.id}`} className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="size-12 shrink-0 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                        <ImagePlus className="size-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="wrap-anywhere font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[p.brand, p.category].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {p.sku && (
                        <p className="num text-xs text-muted-foreground">SKU {p.sku}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-border/70 pt-3 sm:grid-cols-4">
                    <MiniFact label="Buy" value={currency(p.buy_price)} />
                    <MiniFact label="Sell" value={currency(p.sell_price)} />
                    <MiniFact
                      label="Margin"
                      value={currency(p.sell_price - p.buy_price)}
                      tone="text-success"
                    />
                    <MiniFact
                      label="Stock"
                      value={String(p.stock)}
                      tone={low ? "text-destructive font-semibold" : undefined}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        <div className="hidden table-scroll lg:block">
          <table className="w-full text-sm" aria-label="Products">

            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Product</th>
                <th scope="col" className="px-4 py-2 font-medium">SKU</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Buy</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Sell</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Margin</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Stock</th>
                <th scope="col" className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
{isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-t border-border/70">
                    {Array.from({ length: 7 }).map((__, c) => (
                      <td key={c} className="px-4 py-3">
                        <Shimmer className="h-3.5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="text-title font-semibold">No products yet</p>
                    <p className="mt-1 text-caption text-muted-foreground">
                      Add your first item to start tracking stock and margin.
                    </p>
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const low = p.stock <= p.low_stock_threshold;
                return (
                  <tr key={p.id} className="border-t border-border/70">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="size-10 shrink-0 rounded-md border border-border object-cover"
                          />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                            <ImagePlus className="size-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {p.name}
                            {(p.image_urls?.length ?? 0) > 1 && (
                              <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {p.image_urls!.length} photos
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[p.brand, p.category].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{p.sku || "—"}</td>
                    <td className="num px-4 py-2 text-right">{currency(p.buy_price)}</td>
                    <td className="num px-4 py-2 text-right">{currency(p.sell_price)}</td>
                    <td className="num px-4 py-2 text-right text-success">
                      {currency(p.sell_price - p.buy_price)}
                    </td>
                    <td
                      className={`num px-4 py-2 text-right ${low ? "text-destructive font-medium" : ""}`}
                    >
                      {p.stock}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(p)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing ? "Edit product" : "Add product"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <MultiImageUploadField
                label="Product photos"
                value={form.image_urls}
                onChange={(urls) => setForm({ ...form, image_urls: urls, image_url: urls[0] ?? null })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Buy price</Label>
              <Input
                type="number"
                step="0.01"
                value={form.buy_price}
                onChange={(e) => setForm({ ...form, buy_price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sell price</Label>
              <Input
                type="number"
                step="0.01"
                value={form.sell_price}
                onChange={(e) => setForm({ ...form, sell_price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Low stock alert at</Label>
              <Input
                type="number"
                value={form.low_stock_threshold}
                onChange={(e) =>
                  setForm({ ...form, low_stock_threshold: Number(e.target.value) })
                }
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {editing ? "Save changes" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
