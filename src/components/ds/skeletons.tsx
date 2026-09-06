/**
 * Loading placeholders + page transition wrapper.
 * All visuals come from tokens in src/styles.css.
 */
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Panel } from "./index";

export function Shimmer({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("shimmer rounded-md", className)} {...props} />;
}

export function StatSkeleton() {
  return (
    <Panel className="flex items-start justify-between gap-4">
      <div className="w-full space-y-3">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-8 w-32" />
        <Shimmer className="h-3 w-24" />
      </div>
      <Shimmer className="size-10 rounded-xl" />
    </Panel>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4"
      role="status"
      aria-label="Loading summary"
    >
      {Array.from({ length: count }).map((_, i) => (
        <StatSkeleton key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ChartSkeleton({ height = 288 }: { height?: number }) {
  return (
    <Panel padding="lg" role="status" aria-label="Loading chart">
      <div className="flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <Shimmer
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${30 + ((i * 37) % 65)}%` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </Panel>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Panel padding="lg" role="status" aria-label="Loading list">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Shimmer className="size-9 rounded-xl" />
            <Shimmer className="h-3 flex-1" />
            <Shimmer className="hidden h-3 w-24 sm:block" />
            <Shimmer className="h-3 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </Panel>
  );
}

/** Fades + lifts content in on mount; respects prefers-reduced-motion. */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("page-in", className)}>{children}</div>;
}
