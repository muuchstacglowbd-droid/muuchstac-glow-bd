export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";

export type OrderSource =
  | "facebook"
  | "whatsapp"
  | "walkin"
  | "instagram"
  | "phone"
  | "other";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
];

export const ORDER_SOURCES: OrderSource[] = [
  "facebook",
  "whatsapp",
  "instagram",
  "phone",
  "walkin",
  "other",
];

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  buy_price: number;
  sell_price: number;
  stock: number;
  low_stock_threshold: number;
  expiry_date: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  email: string | null;
  email_subscribed: boolean;
  subscribed_at: string | null;
  blacklisted: boolean;
  created_at: string;
}

export type DeliveryZone = "inside_dhaka" | "outside_dhaka" | "free";

export const DELIVERY_ZONES: { value: DeliveryZone; label: string }[] = [
  { value: "inside_dhaka", label: "Inside Dhaka" },
  { value: "outside_dhaka", label: "Outside Dhaka" },
  { value: "free", label: "Free delivery" },
];

export function deliveryZoneLabel(zone?: string | null) {
  return DELIVERY_ZONES.find((z) => z.value === zone)?.label ?? "Delivery";
}

export interface ShopSettings {
  user_id: string;
  company_name: string;
  tagline: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  inside_dhaka_charge: number;
  outside_dhaka_charge: number;
  thank_you_message: string;
  report_email?: string | null;
  daily_report_enabled?: boolean;

}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image_url?: string | null;
  product_image_urls?: string[] | null;
  qty: number;
  unit_price: number;
  unit_cost: number;
}

export interface Order {
  id: string;
  order_no: number;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  status: OrderStatus;
  source: OrderSource;
  discount: number;
  shipping_charge: number;
  delivery_zone?: DeliveryZone | string | null;
  packaging_cost: number;
  other_cost: number;
  advance_paid: number;
  note: string | null;
  tracking_code: string | null;
  consignment_id: string | null;
  courier_provider?: string | null;
  courier_status?: string | null;
  courier_status_updated_at?: string | null;
  courier_last_error?: string | null;
  courier_sent_at?: string | null;
  cod_amount?: number | null;
  created_at: string;
  order_items?: OrderItem[];
}

/** Stable invoice series, e.g. INV-202609-0007 (year+month of the order + order number). */
export function invoiceNo(order: Pick<Order, "order_no" | "created_at">) {
  const d = new Date(order.created_at);
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `INV-${ym}-${String(order.order_no).padStart(4, "0")}`;
}

export function currency(n: number) {
  return "৳" + (Math.round((n || 0) * 100) / 100).toLocaleString("en-BD");
}

export function orderTotals(order: Order) {
  const items = order.order_items ?? [];
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const cogs = items.reduce((s, i) => s + i.qty * i.unit_cost, 0);
  const total =
    subtotal - (order.discount || 0) + (order.shipping_charge || 0);
  const due = total - (order.advance_paid || 0);
  const profit =
    subtotal -
    (order.discount || 0) -
    cogs -
    (order.packaging_cost || 0) -
    (order.other_cost || 0);
  return { subtotal, cogs, total, due, profit, units: items.reduce((s, i) => s + i.qty, 0) };
}

export function countsRevenue(status: OrderStatus) {
  return status === "delivered";
}

export function statusTone(status: OrderStatus) {
  switch (status) {
    case "delivered":
      return "bg-success/12 text-success border-success/25";
    case "shipped":
    case "packed":
      return "bg-gold/25 text-foreground border-gold/50";
    case "confirmed":
      return "bg-primary/12 text-primary border-primary/25";
    case "returned":
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/25";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function dayKey(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}
