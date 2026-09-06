import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useSaveShopSettings, useShopSettings } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/settings/invoice")({
  head: () => ({
    meta: [
      { title: "Invoice & delivery settings — Rose Nude" },
      {
        name: "description",
        content:
          "Set your logo, shop address, Dhaka and outside-Dhaka delivery charges and the thank-you note printed on every invoice.",
      },
      { property: "og:title", content: "Invoice & delivery settings — Rose Nude" },
      {
        property: "og:description",
        content:
          "Set your logo, shop address, delivery charges and the thank-you note printed on every invoice.",
      },
    ],
  }),
  component: InvoiceSettings,
});

function InvoiceSettings() {
  const { data: settings, isLoading } = useShopSettings();
  const save = useSaveShopSettings();

  const [form, setForm] = useState({
    company_name: "Rose Nude",
    tagline: "Beauty & Cosmetics",
    logo_url: "",
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
      company_name: settings.company_name ?? "",
      tagline: settings.tagline ?? "",
      logo_url: settings.logo_url ?? "",
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
              { ...form, logo_url: form.logo_url || null },
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
          <div>
            <Label>Company name</Label>
            <Input
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
            />
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </div>
          <div>
            <Label>Logo image link</Label>
            <Input
              value={form.logo_url}
              onChange={(e) => set("logo_url", e.target.value)}
              placeholder="https://…"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Paste your logo link here whenever it is ready.
            </p>
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
