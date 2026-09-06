import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, Panel } from "@/components/ds";
import { useProfile } from "@/lib/onboarding";

/** Invites a new shop owner into the guided setup until they finish or skip it. */
export function OnboardingPrompt() {
  const { data: profile, isLoading } = useProfile();
  if (isLoading || !profile || profile.onboarding_done) return null;

  return (
    <Panel
      tone="primary"
      padding="md"
      className="mb-block flex flex-wrap items-center justify-between gap-gutter"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl gold-gradient">
          <Sparkles className="size-5 text-primary-foreground" />
        </span>
        <div>
          <Eyebrow>New here</Eyebrow>
          <p className="text-title font-semibold">Finish setting up your shop</p>
          <p className="text-caption text-muted-foreground">
            Name your shop, add a first order and connect State First courier — about two minutes.
          </p>
        </div>
      </div>
      <Button variant="hero" asChild>
        <Link to="/onboarding">
          Continue setup <ArrowRight />
        </Link>
      </Button>
    </Panel>
  );
}
