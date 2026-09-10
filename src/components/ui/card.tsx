import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { useTilt3D } from "@/lib/motion";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow transition-shadow duration-300",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

/**
 * Opt-in 3D tilt variant of Card — same visual shell, plus a mouse-tracked
 * perspective tilt and a soft light-glow that follows the cursor. Use this
 * anywhere a card deserves extra emphasis (hero stats, featured products).
 * Existing <Card> usages are untouched.
 */
const CardTilt = React.forwardRef
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { strength?: number; glow?: boolean }
>(({ className, strength = 8, glow = true, children, ...props }, forwardedRef) => {
  const { ref, style, glowStyle, handlers } = useTilt3D(strength);

  return (
    <div className="tilt-scene">
      <motion.div
        ref={(node) => {
          ref.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        style={style}
        {...handlers}
        className={cn(
          "group tilt-card relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-soft",
          className,
        )}
        {...props}
      >
        {glow && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              ...glowStyle,
              backgroundImage:
                "radial-gradient(320px circle at center, color-mix(in oklab, var(--s-primary) 16%, transparent), transparent 70%)",
            }}
          />
        )}
        <div style={{ transform: "translateZ(30px)" }} className="relative">
          {children}
        </div>
      </motion.div>
    </div>
  );
});
CardTilt.displayName = "CardTilt";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardTilt, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };