import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COURIER_PROVIDER, normalizeBdPhone } from "./courier";

const API_BASE = "https://portal.packzy.com/api/v1";

type Creds = { api_key: string; secret_key: string; webhook_token: string | null };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as {
    from: (t: string) => any;
  };
}

async function loadCreds(userId: string): Promise<Creds> {
  const db = await admin();
  const { data, error } = await db
    .from("courier_accounts")
    .select("api_key, secret_key, webhook_token")
    .eq("user_id", userId)
    .eq("provider", COURIER_PROVIDER)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("NO_CREDENTIALS");
  return data as Creds;
}

async function courierFetch(
  creds: Creds,
  path: string,
  init?: { method?: string; body?: unknown },
) {
  const requestInit: RequestInit = {
    method: init?.method ?? "GET",
    headers: {
      "Api-Key": creds.api_key,
      "Secret-Key": creds.secret_key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (init?.body !== undefined) requestInit.body = JSON.stringify(init.body);
  const res = await fetch(`${API_BASE}${path}`, requestInit);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg =
      json?.message ||
      (json?.errors ? Object.values(json.errors).flat().join(", ") : "") ||
      `Courier request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

/* ---------------- credentials ---------------- */

export const saveCourierCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        apiKey: z.string().trim().min(8).max(200),
        secretKey: z.string().trim().min(8).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const token = crypto.randomUUID().replace(/-/g, "");
    const { data: existing } = await db
      .from("courier_accounts")
      .select("id, webhook_token")
      .eq("user_id", context.userId)
      .eq("provider", COURIER_PROVIDER)
      .maybeSingle();

    const values = {
      user_id: context.userId,
      provider: COURIER_PROVIDER,
      api_key: data.apiKey,
      secret_key: data.secretKey,
      webhook_token: existing?.webhook_token ?? token,
    };

    const { error } = existing
      ? await db.from("courier_accounts").update(values).eq("id", existing.id)
      : await db.from("courier_accounts").insert(values);
    if (error) throw new Error(error.message);
    return { ok: true, webhookToken: values.webhook_token as string };
  });

export const getCourierAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data } = await db
      .from("courier_accounts")
      .select("api_key, webhook_token, updated_at, auto_send")
      .eq("user_id", context.userId)
      .eq("provider", COURIER_PROVIDER)
      .maybeSingle();
    if (!data) return { connected: false as const };
    const key = String(data.api_key ?? "");
    return {
      connected: true as const,
      keyPreview: key.length > 8 ? `${key.slice(0, 4)}••••${key.slice(-4)}` : "••••",
      webhookToken: data.webhook_token as string | null,
      autoSend: data.auto_send !== false,
      updatedAt: data.updated_at as string,
    };
  });

export const testCourierConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const creds = await loadCreds(context.userId);
      const json = await courierFetch(creds, "/get_balance");
      return { ok: true as const, balance: Number(json?.current_balance ?? 0) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed" };
    }
  });

/* ---------------- send order ---------------- */

function statusFromCourier(courierStatus: string | null | undefined) {
  switch (courierStatus) {
    case "delivered":
    case "partial_delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "returned":
      return "returned";
    default:
      return null;
  }
}

async function pushOrderToCourier(supabase: any, userId: string, orderId: string) {
  {
    const data = { orderId };
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, order_items(qty, unit_price)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    const o = order as any;

    if (o.consignment_id) throw new Error("This order was already sent to the courier.");

    const phone = normalizeBdPhone(o.customer_phone);
    if (!o.customer_name?.trim()) throw new Error("Customer name is missing on this order.");
    if (!phone)
      throw new Error("Customer phone must be a valid Bangladeshi mobile number (01XXXXXXXXX).");
    const address = (o.customer_address ?? "").trim();
    if (address.length < 10) throw new Error("Customer address is missing or too short.");

    const items = (o.order_items ?? []) as { qty: number; unit_price: number }[];
    if (!items.length) throw new Error("This order has no items.");
    const subtotal = items.reduce((s, i) => s + Number(i.qty) * Number(i.unit_price), 0);
    const total = subtotal - Number(o.discount || 0) + Number(o.shipping_charge || 0);
    const cod = Math.max(0, Math.round((total - Number(o.advance_paid || 0)) * 100) / 100);

    let creds: Creds;
    try {
      creds = await loadCreds(userId);
    } catch (e) {
      if (e instanceof Error && e.message === "NO_CREDENTIALS")
        throw new Error("Courier account is not connected yet. Add your keys in Courier settings.");
      throw e;
    }

    let json: any;
    try {
      json = await courierFetch(creds, "/create_order", {
        method: "POST",
        body: {
          invoice: String(o.order_no),
          recipient_name: String(o.customer_name).slice(0, 100),
          recipient_phone: phone,
          recipient_address: address.slice(0, 250),
          cod_amount: cod,
          note: (o.note ?? "").slice(0, 200),
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Courier request failed";
      await supabase
        .from("orders")
        .update({ courier_last_error: message })
        .eq("id", o.id);
      throw new Error(message);
    }

    const consignment = json?.consignment ?? {};
    const consignmentId = consignment.consignment_id
      ? String(consignment.consignment_id)
      : null;
    if (!consignmentId) throw new Error("Courier did not return a consignment number.");

    const courierStatus = (consignment.status as string | null) ?? "pending";
    const { error: upErr } = await supabase
      .from("orders")
      .update({
        consignment_id: consignmentId,
        tracking_code: consignment.tracking_code ?? null,
        courier_provider: COURIER_PROVIDER,
        courier_status: courierStatus,
        courier_status_updated_at: new Date().toISOString(),
        courier_sent_at: new Date().toISOString(),
        courier_last_error: null,
        cod_amount: cod,
        status: "shipped",
      })
      .eq("id", o.id);
    if (upErr) throw new Error(upErr.message);

    const db = await admin();
    await db.from("courier_events").insert({
      user_id: userId,
      order_id: o.id,
      provider: COURIER_PROVIDER,
      status: courierStatus,
      note: `Sent to courier · consignment ${consignmentId}`,
      payload: json,
    });

    return {
      consignmentId,
      trackingCode: (consignment.tracking_code as string | null) ?? null,
      courierStatus,
      cod,
    };
  }
}

export const sendOrderToCourier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) =>
    pushOrderToCourier(context.supabase, context.userId, data.orderId),
  );

/**
 * Called right after an order is saved. Sends the parcel to the courier by
 * itself when the shop owner has switched automatic sending on.
 */
export const autoSendOrderToCourier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: account } = await db
      .from("courier_accounts")
      .select("auto_send")
      .eq("user_id", context.userId)
      .eq("provider", COURIER_PROVIDER)
      .maybeSingle();
    if (!account) return { sent: false as const, reason: "not_connected" as const };
    if (account.auto_send === false) return { sent: false as const, reason: "off" as const };
    try {
      const r = await pushOrderToCourier(context.supabase, context.userId, data.orderId);
      return { sent: true as const, ...r };
    } catch (e) {
      return {
        sent: false as const,
        reason: "error" as const,
        error: e instanceof Error ? e.message : "Courier request failed",
      };
    }
  });

export const setCourierAutoSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { error } = await db
      .from("courier_accounts")
      .update({ auto_send: data.enabled })
      .eq("user_id", context.userId)
      .eq("provider", COURIER_PROVIDER);
    if (error) throw new Error(error.message);
    return { ok: true, enabled: data.enabled };
  });

/* ---------------- tracking ---------------- */

async function syncOne(
  supabase: any,
  userId: string,
  creds: Creds,
  order: { id: string; consignment_id: string; courier_status: string | null },
) {
  const json = await courierFetch(creds, `/status_by_cid/${order.consignment_id}`);
  const next = (json?.delivery_status as string | null) ?? null;
  if (!next) return { changed: false, status: order.courier_status };

  if (next !== order.courier_status) {
    const mapped = statusFromCourier(next);
    const patch: Record<string, unknown> = {
      courier_status: next,
      courier_status_updated_at: new Date().toISOString(),
    };
    if (mapped) patch['status'] = mapped;
    await supabase.from("orders").update(patch).eq("id", order.id);

    const db = await admin();
    await db.from("courier_events").insert({
      user_id: userId,
      order_id: order.id,
      provider: COURIER_PROVIDER,
      status: next,
      note: "Status refreshed from courier",
      payload: json,
    });
    return { changed: true, status: next };
  }
  await supabase
    .from("orders")
    .update({ courier_status_updated_at: new Date().toISOString() })
    .eq("id", order.id);
  return { changed: false, status: next };
}

export const refreshCourierStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("orders")
      .select("id, consignment_id, courier_status")
      .eq("id", data.orderId)
      .maybeSingle();
    const o = order as any;
    if (!o?.consignment_id) throw new Error("This order has not been sent to the courier yet.");
    const creds = await loadCreds(userId);
    return syncOne(supabase, userId, creds, o);
  });

export const refreshAllCourierStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: orders } = await supabase
      .from("orders")
      .select("id, consignment_id, courier_status")
      .not("consignment_id", "is", null)
      .not("courier_status", "in", '("delivered","cancelled","returned")')
      .order("created_at", { ascending: false })
      .limit(50);

    const list = (orders ?? []) as any[];
    if (!list.length) return { checked: 0, updated: 0 };
    const creds = await loadCreds(userId);

    let updated = 0;
    for (const o of list) {
      try {
        const r = await syncOne(supabase, userId, creds, o);
        if (r.changed) updated += 1;
      } catch {
        /* keep going through the rest */
      }
    }
    return { checked: list.length, updated };
  });

export const listCourierEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("courier_events")
      .select("id, status, note, created_at")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []) as { id: string; status: string; note: string | null; created_at: string }[];
  });
