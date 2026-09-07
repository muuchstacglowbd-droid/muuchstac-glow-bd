import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

/**
 * DIAGNOSTIC ONLY. Open this page on your deployed Cloudflare site:
 *
 *   https://<your-worker>.workers.dev/debug-env
 *
 * It shows exactly what VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 * got baked into the CURRENT browser bundle (the build that actually
 * shipped), and lets you fire the same request the login form makes so you
 * can see Supabase's raw response. Delete this file once things work.
 */

export const Route = createFileRoute("/debug-env")({
  component: DebugEnvPage,
});

function mask(value: string | undefined): string {
  if (!value) return "(not set)";
  if (value.length <= 12) return "••••";
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function DebugEnvPage() {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runLiveTest() {
    setBusy(true);
    setResult(null);
    try {
      if (!url || !key) {
        setResult("VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing from this build.");
        return;
      }
      const res = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/settings`, {
        headers: { apikey: key },
      });
      const text = await res.text();
      setResult(`HTTP ${res.status}\n${text}`);
    } catch (e) {
      setResult(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-6 font-mono text-sm">
      <h1 className="font-sans text-xl font-bold">Env / Supabase debug</h1>
      <p className="font-sans text-muted-foreground">
        এই পেজটা শুধু ডিবাগ করার জন্য। ঠিক হয়ে গেলে এই ফাইলটা মুছে দিন।
      </p>

      <div className="space-y-1 rounded-lg border p-3">
        <div>VITE_SUPABASE_URL: {url ?? "(not set)"}</div>
        <div>VITE_SUPABASE_PUBLISHABLE_KEY: {mask(key)}</div>
      </div>

      <button
        onClick={runLiveTest}
        disabled={busy}
        className="rounded-md bg-primary px-4 py-2 font-sans text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Checking…" : "Test this key against Supabase"}
      </button>

      {result && (
        <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-xs">{result}</pre>
      )}

      <p className="font-sans text-xs text-muted-foreground">
        "Invalid API key" এলে বুঝবেন এই পেজে দেখানো URL/key ভুল অথবা অন্য প্রজেক্টের। সঠিক ভ্যালু
        Lovable Cloud / Supabase dashboard থেকে কপি করে আবার build+deploy করুন
        (শুধু Cloudflare dashboard-এ বদলালে হবে না, নতুন করে <code>npm run deploy</code> চালাতে হবে)।
      </p>
    </div>
  );
}