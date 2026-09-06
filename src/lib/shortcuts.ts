import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

/** Keyboard shortcuts available on every authenticated page. */
export const SHORTCUTS = [
  { keys: ["Ctrl", "K"], label: "Open search / command palette" },
  { keys: ["G", "then", "D"], label: "Go to Dashboard" },
  { keys: ["G", "then", "O"], label: "Go to Orders" },
  { keys: ["G", "then", "P"], label: "Go to Products" },
  { keys: ["G", "then", "C"], label: "Go to Customers" },
  { keys: ["G", "then", "A"], label: "Go to Analytics" },
  { keys: ["G", "then", "E"], label: "Go to Expenses" },
  { keys: ["G", "then", "S"], label: "Go to Settings" },
  { keys: ["?"], label: "Show this shortcut list" },
  { keys: ["Esc"], label: "Close dialogs and menus" },
] as const;

const GO_TO: Record<string, string> = {
  d: "/",
  h: "/",
  o: "/orders",
  p: "/products",
  c: "/customers",
  a: "/analytics",
  e: "/expenses",
  r: "/reports",
  s: "/settings/courier",
};

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true
  );
}

/**
 * Global navigation shortcuts: `g` followed by a letter jumps between pages,
 * `?` opens the shortcut help sheet.
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let awaitingGo = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      const key = e.key.toLowerCase();

      if (awaitingGo) {
        awaitingGo = false;
        clearTimeout(timer);
        const to = GO_TO[key];
        if (to) {
          e.preventDefault();
          void navigate({ to });
        }
        return;
      }

      if (key === "g") {
        awaitingGo = true;
        timer = setTimeout(() => {
          awaitingGo = false;
        }, 1200);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [navigate]);

  return { helpOpen, setHelpOpen };
}
