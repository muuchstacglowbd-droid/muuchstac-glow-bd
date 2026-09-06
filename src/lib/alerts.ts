import { useMemo } from "react";
import { useOrders, useProducts } from "./data";
import { orderTotals, type Order, type Product } from "./shop";

export type AlertTone = "warning" | "destructive" | "primary" | "success";

export interface ShopAlert {
  id: string;
  title: string;
  detail: string;
  tone: AlertTone;
  to: string;
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

/** Derives the notification list from live orders and products — no extra table needed. */
export function useShopAlerts(): ShopAlert[] {
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();

  return useMemo(() => {
    const list: ShopAlert[] = [];

    for (const p of products as Product[]) {
      if (p.stock <= 0) {
        list.push({
          id: `oos-${p.id}`,
          title: `${p.name} is out of stock`,
          detail: "Restock before taking new orders.",
          tone: "destructive",
          to: "/products",
        });
      } else if (p.stock <= p.low_stock_threshold) {
        list.push({
          id: `low-${p.id}`,
          title: `${p.name} running low`,
          detail: `${p.stock} left in stock.`,
          tone: "warning",
          to: "/products",
        });
      }
      if (p.expiry_date) {
        const d = daysUntil(p.expiry_date);
        if (d <= 30) {
          list.push({
            id: `exp-${p.id}`,
            title: `${p.name} expires ${d < 0 ? "already expired" : `in ${d} days`}`,
            detail: "Plan a discount or pull it from sale.",
            tone: d < 0 ? "destructive" : "warning",
            to: "/products",
          });
        }
      }
    }

    const pending = (orders as Order[]).filter((o) => o.status === "pending");
    if (pending.length) {
      list.push({
        id: "pending-orders",
        title: `${pending.length} orders waiting to be confirmed`,
        detail: `Worth ${Math.round(pending.reduce((s, o) => s + orderTotals(o).total, 0))} tk.`,
        tone: "primary",
        to: "/orders",
      });
    }

    const stuck = (orders as Order[]).filter(
      (o) =>
        o.status === "shipped" &&
        Date.now() - new Date(o.created_at).getTime() > 5 * 86_400_000,
    );
    if (stuck.length) {
      list.push({
        id: "stuck-orders",
        title: `${stuck.length} parcels shipped over 5 days ago`,
        detail: "Check the courier status for these.",
        tone: "warning",
        to: "/orders",
      });
    }

    return list.slice(0, 25);
  }, [orders, products]);
}
