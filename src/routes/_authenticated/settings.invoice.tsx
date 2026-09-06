import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useSaveShopSettings, useShopSettings } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BRAND_LOGO_URL, BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/settings/invoice")({
  head: () => ({
    meta: [
      { title: `Invoice & delivery settings — ${BRAND_NAME}` },
      {
        name: "description",
        content:
          "Set your shop address, Dhaka and outside-Dhaka delivery charges and the thank-you note printed on every invoice.",
      },
      { property: "og:title", content: `Invoice & delivery settings — ${BRAND_NAME}` },
      {
        property: "og:description",
        content:
          "Set your shop address, delivery charges and the thank-you note printed on every invoice.",
      },
    ],
  }),
  component: InvoiceSettings,
});

function InvoiceSettings() {
  const { data: settings, isLoading } = useShopSettings();
  const save = useSaveShopSettings();

  const [form, setForm] = useState({
    tagline: "Beauty & Cosmetics",
    address: "",
    phone: "",
    email: "",
    inside_dhaka_charge: 70,
    outside_dhaka_charge: 130,
    thank_you_message:
      "Thank you for shopping with us! Your trust means the world to us. Payment is Cash on Delivery — please pay the courier on arrival.",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      tagline: settings.tagline ?? "",
      address: settings.address ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      inside_dhaka_charge: Number(settings.inside_dhaka_charge) || 0,
      outside_dhaka_charge: Number(settings.outside_dhaka_charge) || 0,
      thank_you_message: settings.thank_you_message ?? "",
    });
  }, [settings]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <AppShell
      title="Invoice & delivery"
      subtitle={isLoading ? "Loading…" : "Shown on every invoice you print"}
      actions={
        <Button
          disabled={save.isPending}
          onClick={() =>
            save.mutate(
              { ...form, company_name: BRAND_NAME, logo_url: BRAND_LOGO_URL },
              {
                onSuccess: () => toast.success("Saved"),
                onError: (e) =>
                  toast.error(e instanceof Error ? e.message : "Could not save settings"),
              },
            )
          }
        >
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface space-y-3 p-4">
          <h2 className="text-lg">Company</h2>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <img src={BRAND_LOGO_URL} alt={`${BRAND_NAME} logo`} className="size-14 rounded-md object-cover" />
            <div>
              <Label>Permanent brand</Label>
              <p className="font-display text-lg font-semibold">{BRAND_NAME}</p>
            </div>
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </div>
          <div>
            <Label>Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="surface space-y-3 p-4">
          <h2 className="text-lg">Delivery charges</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Inside Dhaka</Label>
              <Input
                type="number"
                value={form.inside_dhaka_charge}
                onChange={(e) => set("inside_dhaka_charge", Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Outside Dhaka</Label>
              <Input
                type="number"
                value={form.outside_dhaka_charge}
                onChange={(e) => set("outside_dhaka_charge", Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Free delivery is always ৳0 and is shown as “Free” on the invoice.
          </p>
          <div>
            <Label>Thank-you message</Label>
            <Textarea
              value={form.thank_you_message}
              onChange={(e) => set("thank_you_message", e.target.value)}
              rows={4}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Every order is Cash on Delivery — customers pay the full total to the delivery agent.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
