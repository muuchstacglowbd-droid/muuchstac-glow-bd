import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { orderTotals } from "./shop";
import type { Customer, Order, Product, ShopSettings } from "./shop";
import { BRAND_LOGO_URL, BRAND_NAME } from "./brand";

const db = () => supabase as unknown as {
  from: (t: string) => any;
  auth: typeof supabase.auth;
};

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await db()
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await db()
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await db()
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async (): Promise<Order | null> => {
      const { data, error } = await db()
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

type MutationArgs =
  | { action: "insert"; values: Record<string, unknown> }
  | { action: "update"; id: string; values: Record<string, unknown> }
  | { action: "delete"; id: string };

export function useTableMutation(table: string, keys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: MutationArgs) => {
      if (args.action === "insert") {
        const { error } = await db()
          .from(table)
          .insert({ ...args.values, user_id: await uid() });
        if (error) throw error;
      } else if (args.action === "update") {
        const { error } = await db().from(table).update(args.values).eq("id", args.id);
        if (error) throw error;
      } else {
        const { error } = await db().from(table).delete().eq("id", args.id);
        if (error) throw error;
      }
    },
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export interface NewOrderInput {
  order: Record<string, unknown>;
  items: {
    product_id: string | null;
    product_name: string;
    product_image_url?: string | null;
    product_image_urls?: string[];
    qty: number;
    unit_price: number;
    unit_cost: number;
  }[];
}

export async function createOrder({ order, items }: NewOrderInput) {
  const user_id = await uid();
  const { data, error } = await db()
    .from("orders")
    .insert({ ...order, user_id })
    .select("id")
    .single();
  if (error) throw error;
  const orderId = data.id as string;

  if (items.length) {
    const { error: itemErr } = await db()
      .from("order_items")
      .insert(items.map((i) => ({ ...i, order_id: orderId, user_id })));
    if (itemErr) throw itemErr;

    for (const it of items) {
      if (!it.product_id) continue;
      const { data: p } = await db()
        .from("products")
        .select("stock")
        .eq("id", it.product_id)
        .maybeSingle();
      if (p) {
        await db()
          .from("products")
          .update({ stock: Math.max(0, (p.stock ?? 0) - it.qty) })
          .eq("id", it.product_id);
        await db().from("stock_movements").insert({
          user_id,
          product_id: it.product_id,
          change: -it.qty,
          reason: "sale",
          note: `Order ${orderId.slice(0, 8)}`,
        });
      }
    }
  }
  return orderId;
}

/**
 * Marks an order as shipped and creates the parcel record in one step:
 * a tracking code, the send date and the cash-on-delivery amount are filled in
 * automatically, and the delivery history gets a first entry.
 */
export async function markOrderShipped(order: Order) {
  const user_id = await uid();
  const now = new Date().toISOString();
  const tracking =
    order.tracking_code ||
    `RN${String(order.order_no).padStart(4, "0")}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
  const provider = order.courier_provider || "manual";
  const total = orderTotals(order).total;

  const values = {
    status: "shipped",
    tracking_code: tracking,
    courier_provider: provider,
    courier_status: order.courier_status || "pending",
    courier_status_updated_at: now,
    courier_sent_at: order.courier_sent_at || now,
    cod_amount: order.cod_amount ?? total,
  };

  const { error } = await db().from("orders").update(values).eq("id", order.id);
  if (error) throw error;

  await db().from("courier_events").insert({
    user_id,
    order_id: order.id,
    provider,
    status: values.courier_status,
    note: `Parcel sent · tracking ${tracking}`,
  });

  return values;
}

/** Puts the items of an order back on the shelf (used for returns and cancellations). */
async function restockOrder(order: Order, reason: "return" | "cancel") {
  const user_id = await uid();
  for (const it of order.order_items ?? []) {
    if (!it.product_id) continue;
    const { data: p } = await db()
      .from("products")
      .select("stock")
      .eq("id", it.product_id)
      .maybeSingle();
    if (!p) continue;
    await db()
      .from("products")
      .update({ stock: (p.stock ?? 0) + it.qty })
      .eq("id", it.product_id);
    await db().from("stock_movements").insert({
      user_id,
      product_id: it.product_id,
      change: it.qty,
      reason,
      note: `Order #${order.order_no}`,
    });
  }
}

async function logCourierEvent(order: Order, status: string, note: string) {
  await db().from("courier_events").insert({
    user_id: await uid(),
    order_id: order.id,
    provider: order.courier_provider || "manual",
    status,
    note,
  });
}

/** Marks the parcel delivered — money counts as earned, stock stays sold. */
export async function markOrderDelivered(order: Order) {
  const { error } = await db()
    .from("orders")
    .update({
      status: "delivered",
      courier_status: "delivered",
      courier_status_updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (error) throw error;
  await logCourierEvent(order, "delivered", "Marked delivered by hand");
}

/** Cancels the order and puts the items back in stock. */
export async function markOrderCancelled(order: Order) {
  if (order.status !== "cancelled" && order.status !== "returned") {
    await restockOrder(order, "cancel");
  }
  const { error } = await db()
    .from("orders")
    .update({
      status: "cancelled",
      courier_status: "cancelled",
      courier_status_updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (error) throw error;
  await logCourierEvent(order, "cancelled", "Marked cancelled by hand");
}

/**
 * Marks a parcel as returned: items go back in stock, and a return record is
 * created so the returns page and the daily profit page pick it up on their own.
 */
export async function markOrderReturned(order: Order, courierCost = 0) {
  const user_id = await uid();
  const totals = orderTotals(order);

  if (order.status !== "returned" && order.status !== "cancelled") {
    await restockOrder(order, "return");
  }

  const sentDate = (order.courier_sent_at ?? order.created_at ?? new Date().toISOString()).slice(
    0,
    10,
  );
  const values = {
    user_id,
    order_id: order.id,
    sent_date: sentDate,
    returned_on: new Date().toISOString().slice(0, 10),
    qty: 1,
    refunded_revenue: totals.total,
    cogs_back: totals.cogs,
    courier_cost: courierCost,
    note: `Order #${order.order_no}`,
  };

  const { data: existing } = await db()
    .from("parcel_returns")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();

  if (existing) {
    await db().from("parcel_returns").update(values).eq("id", existing.id);
  } else {
    const { error } = await db().from("parcel_returns").insert(values);
    if (error) throw error;
  }

  const { error: orderErr } = await db()
    .from("orders")
    .update({
      status: "returned",
      courier_status: "returned",
      courier_status_updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (orderErr) throw orderErr;

  await logCourierEvent(
    order,
    "returned",
    courierCost > 0 ? `Returned · courier cost ৳${courierCost}` : "Parcel returned",
  );
}





export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  spent_on: string;
  created_at: string;
}

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await db()
        .from("expenses")
        .select("*")
        .order("spent_on", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface EmailLogRow {
  id: string;
  customer_id: string | null;
  order_id: string | null;
  to_email: string;
  subject: string;
  body: string | null;
  status: string;
  created_at: string;
}

export function useEmailLog() {
  return useQuery({
    queryKey: ["email_log"],
    queryFn: async (): Promise<EmailLogRow[]> => {
      const { data, error } = await db()
        .from("email_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function queueEmail(values: {
  customer_id?: string | null;
  order_id?: string | null;
  to_email: string;
  subject: string;
  body: string;
}) {
  const { error } = await db()
    .from("email_log")
    .insert({ ...values, user_id: await uid(), status: "queued" });
  if (error) throw error;
}

export function useShopSettings() {
  return useQuery({
    queryKey: ["shop_settings"],
    queryFn: async (): Promise<ShopSettings | null> => {
      const { data, error } = await db().from("shop_settings").select("*").maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, company_name: BRAND_NAME, logo_url: BRAND_LOGO_URL };
    },
  });
}

export function useSaveShopSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<ShopSettings>) => {
      const user_id = await uid();
      const { error } = await db()
        .from("shop_settings")
        .upsert(
          { ...values, company_name: BRAND_NAME, logo_url: BRAND_LOGO_URL, user_id },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop_settings"] }),
  });
}

/** Look up a saved customer by phone number (exact) or name (case-insensitive). */
export async function findCustomer(input: { phone?: string; name?: string }) {
  const phone = (input.phone ?? "").trim();
  const name = (input.name ?? "").trim();
  if (phone.length >= 5) {
    const { data } = await db().from("customers").select("*").eq("phone", phone).maybeSingle();
    if (data) return data as Customer;
  }
  if (name) {
    const { data } = await db().from("customers").select("*").ilike("name", name).maybeSingle();
    if (data) return data as Customer;
  }
  return null;
}

/** Find a customer by phone or name, creating one when needed. Returns null for walk-ins. */
export async function ensureCustomer(input: {
  name: string;
  phone?: string | null;
  address?: string | null;
}): Promise<string | null> {
  const name = input.name.trim();
  const phone = (input.phone ?? "").trim();
  if (!name && !phone) return null;
  const user_id = await uid();

  const existing = await findCustomer({ phone, name });
  if (existing) {
    await db()
      .from("customers")
      .update({
        name: name || existing.name,
        phone: phone || existing.phone,
        address: input.address || existing.address,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await db()
    .from("customers")
    .insert({
      user_id,
      name: name || phone,
      phone: phone || null,
      address: input.address || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export interface DailyEntry {
  id: string;
  entry_date: string;
  ad_cost: number;
  packaging_cost: number;
  other_cost: number;
  shipping_cost: number;
  manual_parcels: number | null;
  manual_revenue: number | null;
  manual_cogs: number | null;
  note: string | null;
}

export function useDailyEntries() {
  return useQuery({
    queryKey: ["daily_entries"],
    queryFn: async (): Promise<DailyEntry[]> => {
      const { data, error } = await db()
        .from("daily_entries")
        .select("*")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface ParcelReturn {
  id: string;
  order_id: string | null;
  sent_date: string;
  returned_on: string;
  qty: number;
  refunded_revenue: number;
  cogs_back: number;
  courier_cost: number;
  note: string | null;
}

export function useParcelReturns() {
  return useQuery({
    queryKey: ["parcel_returns"],
    queryFn: async (): Promise<ParcelReturn[]> => {
      const { data, error } = await db()
        .from("parcel_returns")
        .select("*")
        .order("sent_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveDailyEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<DailyEntry> & { entry_date: string }) => {
      const user_id = await uid();
      const { error } = await db()
        .from("daily_entries")
        .upsert({ ...values, user_id }, { onConflict: "user_id,entry_date" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily_entries"] }),
  });
}

export interface AdSpendRow {
  id: string;
  amount: number;
  platform: string;
  campaign: string | null;
  spent_on: string;
}

export function useAdSpends() {
  return useQuery({
    queryKey: ["ad_spends"],
    queryFn: async (): Promise<AdSpendRow[]> => {
      const { data, error } = await db()
        .from("ad_spends")
        .select("*")
        .order("spent_on", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
