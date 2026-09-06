import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProducts, useTableMutation } from "@/lib/data";
import { currency } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/products/$id")({
  head: () => ({
    meta: [
      { title: "Edit product — Rose Nude" },
      {
        name: "description",
        content: "Update a product's price, stock level and details, or remove it from your shop.",
      },
      { property: "og:title", content: "Edit product — Rose Nude" },
      {
        property: "og:description",
        content: "Update a product's price, stock level and details, or remove it from your shop.",
      },
    ],
  }),
  component: ProductDetail,
});

const BLANK = {
  name: "",
  sku: "",
  brand: "",
  category: "",
  buy_price: 0,
  sell_price: 0,
  stock: 0,
  low_stock_threshold: 3,
};

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useProducts();
  const mutation = useTableMutation("products", ["products", "orders"]);
  const product = products.find((p) => p.id === id) ?? null;
  const [form, setForm] = useState({ ...BLANK });

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      brand: product.brand ?? "",
      category: product.category ?? "",
      buy_price: product.buy_price,
      sell_price: product.sell_price,
      stock: product.stock,
      low_stock_threshold: product.low_stock_threshold,
    });
  }, [product]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutation.mutateAsync({
        action: "update",
        id,
        values: {
          name: form.name,
          sku: form.sku || null,
          brand: form.brand || null,
          category: form.category || null,
          buy_price: Number(form.buy_price),
          sell_price: Number(form.sell_price),
          stock: Number(form.stock),
          low_stock_threshold: Number(form.low_stock_threshold),
        },
      });
      toast.success("Product updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function remove() {
    if (!confirm(`Delete "${product?.name ?? "this product"}"? This cannot be undone.`)) return;
    try {
      await mutation.mutateAsync({ action: "delete", id });
      toast.success("Product deleted");
      navigate({ to: "/products" });
    } catch {
      toast.error("Could not delete — it may be linked to existing orders.");
    }
  }

  if (isLoading) {
    return (
      <AppShell title="Product">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!product) {
    return (
      <AppShell title="Product not found">
        <p className="text-sm text-muted-foreground">This product no longer exists.</p>
        <Button className="mt-4" asChild>
          <Link to="/products">Back to products</Link>
        </Button>
      </AppShell>
    );
  }

  const margin = Number(form.sell_price) - Number(form.buy_price);
  const low = Number(form.stock) <= Number(form.low_stock_threshold);

  function step(by: number) {
    setForm((f) => ({ ...f, stock: Math.max(0, Number(f.stock) + by) }));
  }

  return (
    <AppShell
      title={product.name}
      subtitle={`In stock ${product.stock} · sells for ${currency(product.sell_price)}`}
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/products">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <Button variant="destructive" onClick={remove} disabled={mutation.isPending}>
            <Trash2 className="size-4" /> Delete
          </Button>
        </>
      }
    >
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface space-y-4 p-5">
          <h2 className="font-display text-2xl">Details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface space-y-4 p-5">
            <h2 className="font-display text-2xl">Price</h2>
            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>
            <p className="text-sm text-muted-foreground">
              Profit per piece:{" "}
              <span className={margin >= 0 ? "num text-success" : "num text-destructive"}>
                {currency(margin)}
              </span>
            </p>
          </div>

          <div className="surface space-y-4 p-5">
            <h2 className="font-display text-2xl">Stock</h2>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" onClick={() => step(-1)}>
                <Minus className="size-4" />
              </Button>
              <Input
                type="number"
                className="num text-center"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              />
              <Button type="button" size="icon" variant="outline" onClick={() => step(1)}>
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Low stock alert at</Label>
              <Input
                type="number"
                value={form.low_stock_threshold}
                onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })}
              />
            </div>
            {low && (
              <p className="text-sm text-destructive">Stock is at or below your alert level.</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
