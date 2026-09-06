import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SHORTCUTS } from "@/lib/shortcuts";

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Work faster without touching the mouse.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border/70">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-caption text-muted-foreground">{s.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {s.keys.map((k, i) =>
                  k === "then" ? (
                    <span key={i} className="text-[0.65rem] text-muted-foreground">
                      then
                    </span>
                  ) : (
                    <kbd
                      key={i}
                      className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold"
                    >
                      {k}
                    </kbd>
                  ),
                )}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
