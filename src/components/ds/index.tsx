/**
 * Design system primitives.
 *
 * Every screen should compose these instead of re-inventing spacing, panels,
 * headings or empty states. All values come from tokens in src/styles.css.
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------- layout */

export function Stack({
  gap = "block",
  className,
  ...props
}: ComponentProps<"div"> & { gap?: "gutter" | "block" | "section" }) {
  return (
    <div
      className={cn(
        "flex flex-col",
        gap === "gutter" && "gap-gutter",
        gap === "block" && "gap-block",
        gap === "section" && "gap-section",
        className,
      )}
      {...props}
    />
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-block", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-gutter">
          <div className="min-w-0">
            {title && <h2 className="text-section font-semibold">{title}</h2>}
            {description && (
              <p className="text-caption text-muted-foreground">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Grid({
  cols = 3,
  className,
  ...props
}: ComponentProps<"div"> & { cols?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid gap-gutter sm:grid-cols-2",
        cols === 3 && "xl:grid-cols-3",
        cols === 4 && "lg:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------- surfaces */

const panelVariants = cva("panel", {
  variants: {
    padding: {
      none: "",
      sm: "p-4",
      md: "p-5",
      lg: "p-7",
    },
    interactive: {
      true: "surface-hover",
      false: "",
    },
    tone: {
      default: "",
      primary: "rose-gradient border-primary/30",
      muted: "bg-muted/50",
    },
  },
  defaultVariants: { padding: "md", interactive: false, tone: "default" },
});

export function Panel({
  className,
  padding,
  interactive,
  tone,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof panelVariants>) {
  return (
    <div className={cn(panelVariants({ padding, interactive, tone }), className)} {...props} />
  );
}

export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("eyebrow", className)} {...props} />;
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ElementType;
  tone?: "default" | "primary" | "success" | "warning" | "destructive";
}) {
  const toneRing = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];

  return (
    <Panel interactive className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Eyebrow>{label}</Eyebrow>
        <p className="num mt-1 text-display font-semibold leading-none">{value}</p>
        {hint && <p className="mt-2 text-caption text-muted-foreground">{hint}</p>}
      </div>
      {Icon && (
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-muted", toneRing)}>
          <Icon className="size-4" />
        </span>
      )}
    </Panel>
  );
}

const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium",
  {
    variants: {
      tone: {
        default: "bg-muted text-muted-foreground",
        primary: "bg-primary/12 text-primary",
        success: "bg-success/15 text-success",
        warning: "bg-warning/20 text-warning-foreground",
        destructive: "bg-destructive/12 text-destructive",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export function Pill({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof pillVariants>) {
  return <span className={cn(pillVariants({ tone }), className)} {...props} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Panel padding="lg" className="flex flex-col items-center gap-3 text-center">
      {Icon && (
        <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      )}
      <div>
        <h3 className="text-title font-semibold">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-caption text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </Panel>
  );
}
