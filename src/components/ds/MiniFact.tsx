/**
 * One small labelled number, used inside the phone/tablet card layouts that
 * replace wide tables on narrow screens.
 */
export function MiniFact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string | undefined;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-2.5 py-2">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={`num mt-0.5 text-sm font-medium ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
