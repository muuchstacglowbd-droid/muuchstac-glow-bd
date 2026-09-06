import { Check, Moon, Palette, Sun } from "lucide-react";
import { THEMES, useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ThemeSwitcher() {
  const { theme, mode, setTheme, toggleMode } = useTheme();

  return (
    <div className="no-print flex items-center gap-2">
      <button
        onClick={toggleMode}
        aria-label="Toggle light and dark mode"
        className="grid size-9 place-items-center rounded-xl border border-border bg-card/70 text-foreground transition-colors hover:bg-accent"
      >
        {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      <Popover>
        <PopoverTrigger
          aria-label="Change theme colours"
          className="grid size-9 place-items-center rounded-xl border border-border bg-card/70 text-foreground transition-colors hover:bg-accent"
        >
          <Palette className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-2">
          <p className="px-2 pb-2 pt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Theme colours
          </p>
          <div className="grid gap-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                  theme === t.id && "bg-accent font-semibold",
                )}
              >
                <span className="flex overflow-hidden rounded-md border border-border">
                  {t.swatch.map((c) => (
                    <span key={c} className="size-4" style={{ background: c }} />
                  ))}
                </span>
                <span className="flex-1 truncate">{t.name}</span>
                {theme === t.id && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
