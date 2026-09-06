import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Box,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCustomers, useOrders, useProducts } from "@/lib/data";
import { currency, orderTotals, type Customer, type Order, type Product } from "@/lib/shop";

const PAGES = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Orders", to: "/orders", icon: ShoppingBag },
  { label: "New order", to: "/orders", icon: Receipt },
  { label: "Products", to: "/products", icon: Box },
  { label: "Customers", to: "/customers", icon: Users },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Profit", to: "/profit", icon: Wallet },
  { label: "Expenses", to: "/expenses", icon: Wallet },
  { label: "Reports", to: "/reports", icon: FileText },
  { label: "Data import", to: "/import", icon: FileText },
  { label: "Courier settings", to: "/settings/courier", icon: Truck },
  { label: "Invoice settings", to: "/settings/invoice", icon: Settings },
];

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();

  const recentOrders = useMemo(() => (orders as Order[]).slice(0, 6), [orders]);

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, orders, products, customers…" />
      <CommandList>
        <CommandEmpty>Nothing found.</CommandEmpty>
        <CommandGroup heading="Go to">
          {PAGES.map((p) => (
            <CommandItem key={p.to} value={p.label} onSelect={() => go(p.to)}>
              <p.icon className="size-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Recent orders">
          {recentOrders.map((o) => (
            <CommandItem
              key={o.id}
              value={`order ${o.order_no} ${o.customer_name} ${o.customer_phone}`}
              onSelect={() => go(`/orders/${o.id}`)}
            >
              <ShoppingBag className="size-4" />
              <span className="truncate">
                #{o.order_no} · {o.customer_name}
              </span>
              <span className="num ml-auto text-caption text-muted-foreground">
                {currency(orderTotals(o).total)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Products">
          {(products as Product[]).slice(0, 8).map((p) => (
            <CommandItem key={p.id} value={`product ${p.name}`} onSelect={() => go("/products")}>
              <Box className="size-4" />
              <span className="truncate">{p.name}</span>
              <span className="num ml-auto text-caption text-muted-foreground">
                {p.stock} in stock
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Customers">
          {(customers as Customer[]).slice(0, 8).map((c) => (
            <CommandItem
              key={c.id}
              value={`customer ${c.name} ${c.phone ?? ""}`}
              onSelect={() => go(`/customers/${c.id}`)}
            >
              <Users className="size-4" />
              <span className="truncate">{c.name}</span>
              <span className="ml-auto text-caption text-muted-foreground">{c.phone}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
