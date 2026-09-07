import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { AUTH_CALLBACK_PATH, REDIRECT_STORAGE_KEY, siteUrlPath } from "@/lib/site-url";
import { BRAND_LOGO_URL, BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const value = search["redirect"];
    // only same-origin, relative paths are ever followed
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
      ? { redirect: value }
      : {};
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: `Sign in — ${BRAND_NAME} Control Panel` },
      {
        name: "description",
        content: "Sign in to manage your cosmetics shop orders, stock and invoices.",
      },
      { property: "og:title", content: `Sign in — ${BRAND_NAME} Control Panel` },
      {
        property: "og:description",
        content: "Sign in to manage your cosmetics shop orders, stock and invoices.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const destination = redirect ?? "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Until React has taken over the page, clicks/submits would be silently lost,
  // which is what made sign-in look like it "did nothing". Keep controls
  // disabled until then so a press always registers.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const disabled = busy || !ready;

  // As soon as a session exists (password, Google or an already-open session),
  // refresh the router so the protected gate sees it, then leave the sign-in page.
  useEffect(() => {
    if (!user) return;
    router.invalidate().finally(() => {
      navigate({ to: destination, replace: true });
    });
  }, [user, destination, navigate, router]);

  // Remember where the person wanted to go, so the callback page can finish the
  // journey on whatever domain the app is served from.
  function rememberDestination() {
    try {
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, destination);
    } catch {
      /* storage can be blocked; the callback falls back to the dashboard */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        rememberDestination();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: siteUrlPath(AUTH_CALLBACK_PATH) },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    rememberDestination();
    // Sign in directly through Supabase's own Google provider. (The old
    // "/~oauth/initiate" broker only exists on Lovable's own hosting — on a
    // self-hosted domain that path 404s, which is why Google sign-in was
    // broken here.) Google must be enabled for this Supabase project under
    // Authentication → Providers, with this domain's /auth/callback added to
    // the Redirect URLs.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: siteUrlPath(AUTH_CALLBACK_PATH) },
    });
    if (error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    // Supabase immediately redirects the browser to Google; there is nothing
    // left to do here on success.
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between rose-gradient p-12 lg:flex">
        <div className="flex items-center gap-3">
          <img
            src={BRAND_LOGO_URL}
            alt={`${BRAND_NAME} logo`}
            className="size-14 rounded-lg object-cover shadow-lg"
            onError={(e) => {
              // Hide the broken-image box instead of showing wrapped alt text
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="font-display text-2xl font-bold">{BRAND_NAME}</span>
        </div>
        <div>
          <h2 className="font-display text-5xl font-bold leading-[1.05]">
            Every order, invoice and jar of stock — in one calm place.
          </h2>
          <p className="mt-5 max-w-sm text-sm text-muted-foreground">
            A control panel built for cosmetics sellers: orders, courier, profit and customers.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {BRAND_NAME}</p>
      </div>

      <div className="relative flex items-center justify-center px-6 py-16">
        <div className="absolute right-5 top-5">
          <ThemeSwitcher />
        </div>
        <div className="surface w-full max-w-sm p-7">
          <h1 className="font-display text-3xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to open your shop dashboard."
              : "Set up your shop control panel in seconds."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            disabled={disabled}
            onClick={google}
          >
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                disabled={disabled}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@shop.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                disabled={disabled}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={disabled || loading}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            disabled={disabled}
            className="mt-6 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}