import { createFileRoute } from "@tanstack/react-router";
import { Coins, PackageX, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, Eyebrow, Grid, Panel, Pill, Section, Stack, StatTile } from "@/components/ds";

export const Route = createFileRoute("/_authenticated/design-system")({
  head: () => ({
    meta: [
      { title: "Design system — Muuchstac Glow BD Control Panel" },
      {
        name: "description",
        content:
          "The shared colours, type scale, spacing, buttons and building blocks used across the shop panel.",
      },
      { property: "og:title", content: "Design system — Muuchstac Glow BD Control Panel" },
      {
        property: "og:description",
        content:
          "The shared colours, type scale, spacing, buttons and building blocks used across the shop panel.",
      },
    ],
  }),
  component: DesignSystemPage,
});

const COLORS = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["primary", "bg-primary"],
  ["secondary", "bg-secondary"],
  ["muted", "bg-muted"],
  ["accent", "bg-accent"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["destructive", "bg-destructive"],
  ["gold", "bg-gold"],
] as const;

const TYPE = [
  ["hero", "text-hero"],
  ["display", "text-display"],
  ["section", "text-section"],
  ["title", "text-title"],
  ["body", "text-body"],
  ["caption", "text-caption"],
] as const;

function DesignSystemPage() {
  return (
    <AppShell
      title="Design system"
      subtitle="One set of tokens and blocks — reuse these to build new screens fast"
    >
      <Stack gap="section">
        <Section title="Colour" description="Every colour follows the active theme automatically.">
          <Grid cols={4}>
            {COLORS.map(([name, cls]) => (
              <Panel key={name} padding="sm" className="flex items-center gap-3">
                <span className={`size-10 rounded-xl border border-border ${cls}`} />
                <span className="text-caption text-muted-foreground">{name}</span>
              </Panel>
            ))}
          </Grid>
        </Section>

        <Section title="Type scale" description="Headings use the display font, text uses the body font.">
          <Panel padding="lg">
            <Stack gap="gutter">
              {TYPE.map(([name, cls]) => (
                <div key={name} className="flex flex-wrap items-baseline gap-4">
                  <span className="w-24 shrink-0 text-caption text-muted-foreground">{name}</span>
                  <span className={cls}>Muuchstac Glow BD</span>
                </div>
              ))}
            </Stack>
          </Panel>
        </Section>

        <Section title="Spacing rhythm" description="gutter · block · section — used for every gap and padding.">
          <Panel padding="lg">
            <Stack gap="gutter">
              {[
                ["gutter", "w-gutter"],
                ["block", "w-block"],
                ["section", "w-section"],
              ].map(([name, cls]) => (
                <div key={name} className="flex items-center gap-4">
                  <span className="w-24 shrink-0 text-caption text-muted-foreground">{name}</span>
                  <span className={`h-3 rounded-full gold-gradient ${cls}`} />
                </div>
              ))}
            </Stack>
          </Panel>
        </Section>

        <Section title="Buttons">
          <Panel padding="lg">
            <Stack gap="gutter">
              <div className="flex flex-wrap gap-2">
                <Button variant="hero">Hero</Button>
                <Button>Default</Button>
                <Button variant="soft">Soft</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="xs">Extra small</Button>
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl" variant="hero">
                  Extra large
                </Button>
              </div>
            </Stack>
          </Panel>
        </Section>

        <Section title="Status pills">
          <Panel padding="lg" className="flex flex-wrap gap-2">
            <Pill>Pending</Pill>
            <Pill tone="primary">Shipped</Pill>
            <Pill tone="success">Delivered</Pill>
            <Pill tone="warning">Low stock</Pill>
            <Pill tone="destructive">Returned</Pill>
          </Panel>
        </Section>

        <Section title="Stat tiles">
          <Grid cols={3}>
            <StatTile label="Revenue" value="৳ 42,500" hint="Delivered only" icon={Coins} tone="primary" />
            <StatTile label="Orders" value="128" hint="This month" icon={ShoppingBag} />
            <StatTile label="Out of stock" value="3" hint="Restock soon" icon={PackageX} tone="warning" />
          </Grid>
        </Section>

        <Section title="Form fields">
          <Panel padding="lg" className="grid gap-gutter sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ds-name">Customer name</Label>
              <Input id="ds-name" placeholder="Nusrat Jahan" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-phone">Phone</Label>
              <Input id="ds-phone" placeholder="01XXXXXXXXX" />
            </div>
          </Panel>
        </Section>

        <Section title="Empty state">
          <EmptyState
            icon={PackageX}
            title="No orders yet"
            description="New orders will show up here as soon as you add one."
            action={<Button variant="hero">Add an order</Button>}
          />
        </Section>

        <Section title="Eyebrow label">
          <Panel padding="lg">
            <Eyebrow>Today at a glance</Eyebrow>
          </Panel>
        </Section>
      </Stack>
    </AppShell>
  );
}
