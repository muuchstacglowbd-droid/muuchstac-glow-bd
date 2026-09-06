import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  notification_type: z.string().optional(),
  consignment_id: z.union([z.string(), z.number()]).optional(),
  invoice: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
  delivery_status: z.string().optional(),
  cod_amount: z.union([z.string(), z.number()]).optional(),
  delivery_charge: z.union([z.string(), z.number()]).optional(),
  tracking_message: z.string().optional(),
  updated_at: z.string().optional(),
});

function ok(message: string) {
  return Response.json({ status: "success", message }, { status: 200 });
}

function fail(message: string, status: number) {
  return Response.json({ status: "error", message }, { status });
}

/** The courier writes statuses in mixed case ("Delivered", "In Review"). */
function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function mapStatus(courierStatus: string) {
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

export const Route = createFileRoute("/api/public/courier-webhook")({
  server: {
    handlers: {
      // The merchant panel only checks that the address answers, so answer GET too.
      GET: async () => ok("Webhook address is live."),

      POST: async ({ request }) => {
        // The panel can send the token either in the address (?token=) or as a
        // Bearer auth token header. Accept both.
        const urlToken = new URL(request.url).searchParams.get("token");
        const header = request.headers.get("authorization") ?? "";
        const bearer = header.toLowerCase().startsWith("bearer ")
          ? header.slice(7).trim()
          : null;
        const token = urlToken ?? bearer;
        if (!token || token.length < 16) {
          return fail("Missing or invalid auth token.", 401);
        }

        const raw = await request.text();
        let parsed;
        try {
          parsed = payloadSchema.parse(JSON.parse(raw));
        } catch {
          return fail("Payload could not be read.", 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as { from: (t: string) => any };

        const { data: account } = await db
          .from("courier_accounts")
          .select("user_id")
          .eq("webhook_token", token)
          .maybeSingle();
        if (!account) return fail("Auth token not recognised.", 401);

        const consignmentId = parsed.consignment_id ? String(parsed.consignment_id) : null;
        const invoice = parsed.invoice ? String(parsed.invoice) : null;
        if (!consignmentId && !invoice) return ok("Nothing to match.");

        // Prefer the consignment id; fall back to the invoice (our order number).
        let order: { id: string; courier_status: string | null } | null = null;
        if (consignmentId) {
          const { data } = await db
            .from("orders")
            .select("id, courier_status")
            .eq("user_id", account.user_id)
            .eq("consignment_id", consignmentId)
            .maybeSingle();
          order = data ?? null;
        }
        if (!order && invoice) {
          const { data } = await db
            .from("orders")
            .select("id, courier_status")
            .eq("user_id", account.user_id)
            .eq("order_no", invoice)
            .maybeSingle();
          order = data ?? null;
        }
        if (!order) return ok("No matching order.");

        const kind = parsed.notification_type ? normalize(parsed.notification_type) : null;
        const rawStatus = parsed.delivery_status ?? parsed.status ?? null;
        const next = rawStatus ? normalize(rawStatus) : null;

        // Tracking-only messages carry no status: keep them as timeline notes.
        if (kind === "tracking_update" || !next) {
          if (parsed.tracking_message) {
            await db.from("courier_events").insert({
              user_id: account.user_id,
              order_id: order.id,
              provider: "steadfast",
              status: order.courier_status ?? "in_review",
              note: parsed.tracking_message,
              payload: parsed,
            });
          }
          return ok("Tracking update saved.");
        }

        if (next === order.courier_status) return ok("Already up to date.");

        const mapped = mapStatus(next);
        const patch: Record<string, unknown> = {
          courier_status: next,
          courier_status_updated_at: new Date().toISOString(),
        };
        if (mapped) patch['status'] = mapped;
        if (consignmentId) patch['consignment_id'] = consignmentId;
        await db.from("orders").update(patch).eq("id", order.id);
        await db.from("courier_events").insert({
          user_id: account.user_id,
          order_id: order.id,
          provider: "steadfast",
          status: next,
          note: parsed.tracking_message ?? "Update received from courier",
          payload: parsed,
        });

        return ok("Webhook received successfully.");
      },
    },
  },
});
