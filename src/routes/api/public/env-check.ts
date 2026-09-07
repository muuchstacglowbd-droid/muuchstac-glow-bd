import { createFileRoute } from "@tanstack/react-router";

/**
 * DIAGNOSTIC ONLY — visit this URL after deploying to Cloudflare to see
 * exactly which server-side env vars are missing / wrong, without ever
 * exposing the real secret values.
 *
 *   https://<your-worker>.workers.dev/api/public/env-check
 *
 * Delete this file once your login issue is fixed — no need to keep a
 * debug endpoint live forever, even though it never prints full secrets.
 */

function detectKeyFormat(value: string | undefined): string {
  if (!value) return "missing";
  if (value.startsWith("sb_publishable_")) return "new-publishable";
  if (value.startsWith("sb_secret_")) return "new-secret";
  if (value.split(".").length === 3) return "legacy-jwt";
  return "unknown-format";
}

function mask(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 12) return "••••";
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

/** Pulls the Supabase project ref out of a legacy JWT (anon/service_role) key. */
function projectRefFromJwt(value: string | undefined): string | null {
  if (!value || value.split(".").length !== 3) return null;
  try {
    const payload = JSON.parse(atob(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

function projectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = /^https?:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url.trim());
  return match ? match[1] : null;
}

export const Route = createFileRoute("/api/public/env-check")({
  server: {
    handlers: {
      GET: async () => {
        const SUPABASE_URL = process.env["SUPABASE_URL"];
        const PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const CRON_SECRET = process.env["LOVABLE_CRON_SECRET"];

        const urlRef = projectRefFromUrl(SUPABASE_URL);
        const keyRef = projectRefFromJwt(PUBLISHABLE_KEY);

        const report: Record<string, unknown> = {
          SUPABASE_URL: {
            set: !!SUPABASE_URL,
            value: SUPABASE_URL ?? null, // not secret, safe to show in full
            projectRef: urlRef,
          },
          SUPABASE_PUBLISHABLE_KEY: {
            set: !!PUBLISHABLE_KEY,
            preview: mask(PUBLISHABLE_KEY),
            format: detectKeyFormat(PUBLISHABLE_KEY),
            projectRefIfJwt: keyRef,
          },
          SUPABASE_SERVICE_ROLE_KEY: {
            set: !!SERVICE_ROLE_KEY,
            preview: mask(SERVICE_ROLE_KEY),
            format: detectKeyFormat(SERVICE_ROLE_KEY),
          },
          LOVABLE_CRON_SECRET: { set: !!CRON_SECRET },
        };

        if (urlRef && keyRef && urlRef !== keyRef) {
          report["warning"] =
            `SUPABASE_URL project ref (${urlRef}) does not match SUPABASE_PUBLISHABLE_KEY project ref (${keyRef}). ` +
            `This alone causes "Invalid API key". Make sure both come from the SAME Supabase project.`;
        }

        // Live test: ask Supabase itself whether it accepts this URL + key
        // combination — this reproduces the exact check that fails on login.
        let liveCheck: Record<string, unknown> = { skipped: true };
        if (SUPABASE_URL && PUBLISHABLE_KEY) {
          try {
            const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/settings`, {
              headers: { apikey: PUBLISHABLE_KEY },
            });
            const text = await res.text();
            let body: unknown = text;
            try {
              body = JSON.parse(text);
            } catch {
              /* keep as text */
            }
            liveCheck = { status: res.status, ok: res.ok, body };
          } catch (e) {
            liveCheck = { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
          }
        }
        report["liveSupabaseCheck"] = liveCheck;

        return Response.json(report, { status: 200 });
      },
    },
  },
});