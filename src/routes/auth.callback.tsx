import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { REDIRECT_STORAGE_KEY } from "@/lib/site-url";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — Muuchstac Glow BD Control Panel" },
      {
        name: "description",
        content: "Finishing your sign-in and taking you back to your shop dashboard.",
      },
      { property: "og:title", content: "Signing you in — Muuchstac Glow BD Control Panel" },
      {
        property: "og:description",
        content: "Finishing your sign-in and taking you back to your shop dashboard.",
      },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // The session is created by the Supabase client from the returned link.
  // Once it exists we send the person back where they started.
  useEffect(() => {
    if (loading) return;
    let target = "/";
    try {
      const stored = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
      if (stored && stored.startsWith("/") && !stored.startsWith("//")) target = stored;
      sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
    } catch {
      /* storage can be blocked; the default is fine */
    }
    navigate({ to: user ? target : "/auth", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
