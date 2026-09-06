import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Truck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getCourierAccount,
  saveCourierCredentials,
  setCourierAutoSend,
  testCourierConnection,
} from "@/lib/courier.functions";
import { COURIER_LABEL } from "@/lib/courier";
import { siteUrl, siteUrlPath, stableSiteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/_authenticated/settings/courier")({
  head: () => ({
    meta: [
      { title: "Courier settings — Muuchstac Glow BD" },
      {
        name: "description",
        content:
          "Connect your State First merchant account so orders can be sent to the courier and tracked automatically.",
      },
      { property: "og:title", content: "Courier settings — Muuchstac Glow BD" },
      {
        property: "og:description",
        content:
          "Connect your State First merchant account so orders can be sent to the courier and tracked automatically.",
      },
    ],
  }),
  component: CourierSettings,
});

function CourierSettings() {
  const qc = useQueryClient();
  const account = useServerFn(getCourierAccount);
  const save = useServerFn(saveCourierCredentials);
  const test = useServerFn(testCourierConnection);
  const setAuto = useServerFn(setCourierAutoSend);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const info = useQuery({ queryKey: ["courier_account"], queryFn: () => account({}) });

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { apiKey: apiKey.trim(), secretKey: secretKey.trim() } }),
    onSuccess: () => {
      setApiKey("");
      setSecretKey("");
      toast.success("Courier account saved");
      qc.invalidateQueries({ queryKey: ["courier_account"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const testMutation = useMutation({
    mutationFn: () => test({}),
    onSuccess: (r) =>
      r.ok
        ? toast.success(`Connected — courier balance ৳${r.balance}`)
        : toast.error(r.error),
  });

  const autoMutation = useMutation({
    mutationFn: (enabled: boolean) => setAuto({ data: { enabled } }),
    onSuccess: (r) => {
      toast.success(
        r.enabled
          ? "New orders will go to the courier automatically"
          : "Automatic sending is off — send each parcel by hand",
      );
      qc.invalidateQueries({ queryKey: ["courier_account"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const webhookPath = info.data?.webhookToken
    ? `/api/public/courier-webhook?token=${info.data.webhookToken}`
    : null;
  // Follows whatever domain/hosting the panel is opened from.
  const webhookUrl =
    info.data?.connected && webhookPath && (siteUrl() || typeof window !== "undefined")
      ? siteUrlPath(webhookPath)
      : null;
  // Never changes, even if the domain or hosting changes later.
  const permanentWebhookUrl =
    info.data?.connected && webhookPath ? `${stableSiteUrl()}${webhookPath}` : null;

  return (
    <AppShell
      title="Courier settings"
      subtitle={`Connect your ${COURIER_LABEL} merchant account`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-lg">
            <Truck className="size-4 text-primary" /> Merchant keys
          </h2>
          {info.data?.connected && (
            <p className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2 text-sm text-success">
              <Check className="size-4" /> Connected (key {info.data.keyPreview})
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Find these in your {COURIER_LABEL} merchant panel under the API section. They are kept
            on the server and never shown again.
          </p>
          <div className="space-y-2">
            <Label htmlFor="api-key">API key</Label>
            <Input
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret key</Label>
            <Input
              id="secret-key"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Paste your secret key"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!apiKey.trim() || !secretKey.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save keys"}
            </Button>
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!info.data?.connected || testMutation.isPending}
            >
              {testMutation.isPending ? "Checking…" : "Test connection"}
            </Button>
          </div>
        </div>

        <div className="surface space-y-3 p-5">
          <h2 className="text-lg">Send parcels automatically</h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="auto-send" className="text-sm font-medium">
                Book the parcel as soon as an order is saved
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Turn this off if you would rather press “Send to {COURIER_LABEL}” on each order
                yourself.
              </p>
            </div>
            <Switch
              id="auto-send"
              checked={info.data?.connected ? info.data.autoSend : false}
              disabled={!info.data?.connected || autoMutation.isPending}
              onCheckedChange={(v) => autoMutation.mutate(v)}
            />
          </div>
        </div>

        <div className="surface space-y-4 p-5">
          <h2 className="text-lg">Instant status updates</h2>
          <p className="text-sm text-muted-foreground">
            In your {COURIER_LABEL} merchant panel open <b>Webhook Integration</b>. It asks for
            two things — copy them from here, one into each box, then save.
          </p>
          {webhookUrl && info.data?.webhookToken ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  1. Callback Url
                </p>
                <code className="block break-all rounded-xl border border-border bg-muted/60 p-3 text-xs">
                  {webhookUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success("Callback address copied");
                  }}
                >
                  Copy callback url
                </Button>
                <p className="text-xs text-muted-foreground">
                  This is the address of the site you are on right now. If you move to your own
                  domain or your own hosting later, open this page there and paste the new address
                  into the panel once.
                </p>
              </div>

              {permanentWebhookUrl && permanentWebhookUrl !== webhookUrl && (
                <div className="space-y-2">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Permanent address (never changes)
                  </p>
                  <code className="block break-all rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs">
                    {permanentWebhookUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(permanentWebhookUrl);
                      toast.success("Permanent address copied");
                    }}
                  >
                    Copy permanent url
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Use this one if you would rather fill the panel in only once — it keeps working
                    even after you change domain or hosting.
                  </p>
                </div>
              )}


              <div className="space-y-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  2. Auth Token (Bearer)
                </p>
                <code className="block break-all rounded-xl border border-border bg-muted/60 p-3 text-xs">
                  {info.data.webhookToken}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(info.data!.webhookToken!);
                    toast.success("Auth token copied");
                  }}
                >
                  Copy auth token
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Keep this token private — it is the key that lets the courier write into your
                orders. After saving, every delivery update lands on the order page and the daily
                report on its own, no refreshing needed.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Save your keys first and both boxes will appear here.
            </p>
          )}
        </div>

      </div>
    </AppShell>
  );
}
