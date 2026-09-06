import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  LayoutDashboard,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow, Panel, Pill, Stack } from "@/components/ds";
import { ONBOARDING_STEPS, useProfile, useUpdateProfile } from "@/lib/onboarding";
import { useOrders } from "@/lib/data";
import { getCourierAccount } from "@/lib/courier.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — Rose Nude Control Panel" },
      {
        name: "description",
        content:
          "A guided setup: name your shop, learn the dashboard, add your first order and connect State First courier.",
      },
      { property: "og:title", content: "Get started — Rose Nude Control Panel" },
      {
        property: "og:description",
        content:
          "A guided setup: name your shop, learn the dashboard, add your first order and connect State First courier.",
      },
    ],
  }),
  component: OnboardingPage,
});

const STEP_TITLES = [
  "Welcome",
  "Your dashboard",
  "First order",
  "State First courier",
  "All set",
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const profile = useProfile();
  const update = useUpdateProfile();
  const orders = useOrders();
  const courierFn = useServerFn(getCourierAccount);
  const courier = useQuery({ queryKey: ["courier_account"], queryFn: () => courierFn({}) });

  const [step, setStep] = useState(0);
  const [shopName, setShopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!profile.data || hydrated) return;
    setShopName(profile.data.shop_name ?? "");
    setFullName(profile.data.full_name ?? "");
    setStep(Math.min(profile.data.onboarding_step ?? 0, ONBOARDING_STEPS - 1));
    setHydrated(true);
  }, [profile.data, hydrated]);

  const hasOrder = (orders.data?.length ?? 0) > 0;
  const courierConnected = !!courier.data?.connected;

  function go(next: number) {
    const clamped = Math.max(0, Math.min(next, ONBOARDING_STEPS - 1));
    setStep(clamped);
    update.mutate({ onboarding_step: clamped });
  }

  function finish() {
    update.mutate(
      {
        onboarding_step: ONBOARDING_STEPS - 1,
        onboarding_done: true,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onSuccess: () => navigate({ to: "/" }) },
    );
  }

  function skip() {
    update.mutate({ onboarding_done: true }, { onSuccess: () => navigate({ to: "/" }) });
  }

  return (
    <AppShell
      title="Get started"
      subtitle="Four short steps and your shop is running"
      actions={
        <Button variant="ghost" size="sm" onClick={skip}>
          Skip guide
        </Button>
      }
    >
      <div className="mx-auto grid max-w-5xl gap-block lg:grid-cols-[15rem_1fr]">
        <Panel padding="md" className="h-fit">
          <Eyebrow>Progress</Eyebrow>
          <ol className="mt-3 space-y-1">
            {STEP_TITLES.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={label}>
                  <button
                    onClick={() => go(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-caption transition-colors duration-(--duration-base)",
                      active
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border text-[0.65rem] font-bold",
                        done
                          ? "border-transparent bg-success text-success-foreground"
                          : active
                            ? "border-transparent gold-gradient text-primary-foreground"
                            : "border-border",
                      )}
                    >
                      {done ? <Check className="size-3" /> : i + 1}
                    </span>
                    {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel padding="lg">
          <Eyebrow>
            Step {step + 1} of {ONBOARDING_STEPS}
          </Eyebrow>

          {step === 0 && (
            <Stack className="mt-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl gold-gradient">
                  <Sparkles className="size-5 text-primary-foreground" />
                </span>
                <h2 className="text-display font-semibold">Welcome aboard</h2>
              </div>
              <p className="text-body text-muted-foreground">
                Tell us who you are and what your shop is called. We use this on invoices and
                across the panel.
              </p>
              <div className="grid gap-gutter sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="shop">Shop name</Label>
                  <Input
                    id="shop"
                    value={shopName}
                    placeholder="Rose Nude Cosmetics"
                    onChange={(e) => setShopName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    value={fullName}
                    placeholder="Shop owner"
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="hero"
                  size="lg"
                  onClick={() => {
                    update.mutate({
                      shop_name: shopName.trim() || null,
                      full_name: fullName.trim() || null,
                    });
                    go(1);
                  }}
                >
                  Continue <ArrowRight />
                </Button>
              </div>
            </Stack>
          )}

          {step === 1 && (
            <Stack className="mt-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <LayoutDashboard className="size-5" />
                </span>
                <h2 className="text-display font-semibold">Read your dashboard</h2>
              </div>
              <p className="text-body text-muted-foreground">
                The dashboard is your daily snapshot. Here is what each part tells you.
              </p>
              <ul className="grid gap-gutter sm:grid-cols-2">
                {[
                  {
                    icon: BarChart3,
                    title: "Today's numbers",
                    body: "Revenue, profit, order count and outstanding cash for the day.",
                  },
                  {
                    icon: ShoppingBag,
                    title: "Order pipeline",
                    body: "How many orders sit in pending, packed, shipped or delivered.",
                  },
                  {
                    icon: Truck,
                    title: "Courier status",
                    body: "Delivery updates flow in from State First and appear on each order.",
                  },
                  {
                    icon: Sparkles,
                    title: "Low stock alerts",
                    body: "Products about to run out so you can restock before you lose a sale.",
                  },
                ].map((item) => (
                  <li key={item.title} className="rounded-xl bg-muted/50 p-4">
                    <item.icon className="size-4 text-primary" />
                    <p className="mt-2 text-title font-semibold">{item.title}</p>
                    <p className="text-caption text-muted-foreground">{item.body}</p>
                  </li>
                ))}
              </ul>
              <StepNav onBack={() => go(0)} onNext={() => go(2)} />
            </Stack>
          )}

          {step === 2 && (
            <Stack className="mt-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <ShoppingBag className="size-5" />
                </span>
                <h2 className="text-display font-semibold">Add your first order</h2>
                {hasOrder && <Pill tone="success">Done</Pill>}
              </div>
              <p className="text-body text-muted-foreground">
                Open Orders, press <strong>New order</strong>, pick the customer and products, then
                save. Stock, profit and reports update on their own.
              </p>
              <ol className="space-y-2 text-body text-muted-foreground">
                <li>1. Enter the customer name, phone and delivery address.</li>
                <li>2. Add the products and quantities being sold.</li>
                <li>3. Set delivery charge, discount and any advance payment.</li>
                <li>4. Save — the order lands in your pipeline as pending.</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button variant="hero" asChild>
                  <Link to="/orders" search={{ new: true }}>
                    Open new order form <ArrowRight />
                  </Link>
                </Button>
              </div>
              <StepNav onBack={() => go(1)} onNext={() => go(3)} />
            </Stack>
          )}

          {step === 3 && (
            <Stack className="mt-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <Truck className="size-5" />
                </span>
                <h2 className="text-display font-semibold">Connect State First</h2>
                {courierConnected && <Pill tone="success">Connected</Pill>}
              </div>
              <p className="text-body text-muted-foreground">
                Link your State First merchant account once and you can send parcels straight from
                an order, with tracking updates coming back automatically.
              </p>
              <ol className="space-y-2 text-body text-muted-foreground">
                <li>1. Sign in to your State First merchant panel and copy the API key and secret key.</li>
                <li>2. Paste both into Courier settings and save them — they stay private on the server.</li>
                <li>3. Press Test connection to confirm your courier balance loads.</li>
                <li>4. Copy the delivery-update link shown there into your State First webhook settings.</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button variant="hero" asChild>
                  <Link to="/settings/courier">
                    Open courier settings <ArrowRight />
                  </Link>
                </Button>
              </div>
              <StepNav onBack={() => go(2)} onNext={() => go(4)} />
            </Stack>
          )}

          {step === 4 && (
            <Stack className="mt-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl gold-gradient">
                  <PartyPopper className="size-5 text-primary-foreground" />
                </span>
                <h2 className="text-display font-semibold">You're ready</h2>
              </div>
              <p className="text-body text-muted-foreground">
                Here is where you stand right now. You can reopen this guide any time from the
                dashboard.
              </p>
              <div className="grid gap-gutter sm:grid-cols-3">
                <ChecklistTile label="Shop named" done={!!shopName.trim()} />
                <ChecklistTile label="First order added" done={hasOrder} />
                <ChecklistTile label="Courier connected" done={courierConnected} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => go(3)}>
                  <ArrowLeft /> Back
                </Button>
                <Button variant="hero" size="lg" onClick={finish}>
                  Go to dashboard <ArrowRight />
                </Button>
              </div>
            </Stack>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function StepNav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex justify-between gap-2 border-t border-border pt-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft /> Back
      </Button>
      <Button variant="hero" onClick={onNext}>
        Next <ArrowRight />
      </Button>
    </div>
  );
}

function ChecklistTile({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border p-3 text-caption",
        done ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-5 place-items-center rounded-full",
          done ? "bg-success text-success-foreground" : "bg-muted",
        )}
      >
        <Check className="size-3" />
      </span>
      {label}
    </div>
  );
}
