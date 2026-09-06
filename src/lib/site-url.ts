/**
 * The public address of this app.
 *
 * Nothing is hardcoded: if the app is served from a custom domain or from the
 * owner's own hosting, the address is read from the browser. Hosting behind a
 * proxy (where the browser origin is not the public one) can override it with
 * VITE_PUBLIC_SITE_URL.
 */
const CONFIGURED = (import.meta.env['VITE_PUBLIC_SITE_URL'] as string | undefined)?.trim();

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

export function siteUrl(): string {
  if (CONFIGURED) return stripTrailingSlash(CONFIGURED);
  if (typeof window !== "undefined") return stripTrailingSlash(window.location.origin);
  return "";
}

export function siteUrlPath(path: string): string {
  const base = siteUrl();
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * A permanent address that keeps working even after the domain changes, so the
 * courier panel only has to be filled in once.
 */
const STABLE_HOST = "project--b3b4a07f-27d0-4db2-b300-ba345af64689.lovable.app";

export function stableSiteUrl(): string {
  return `https://${STABLE_HOST}`;
}

/** Where OAuth / email links come back to. Always same-origin. */
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const REDIRECT_STORAGE_KEY = "rn_auth_redirect";
