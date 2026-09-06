import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeId =
  | "midnight-emerald"
  | "warm-sand"
  | "indigo-studio"
  | "graphite-amber"
  | "royal-plum"
  | "ocean-teal"
  | "rose-champagne"
  | "forest-cream"
  | "cyber-neon"
  | "slate-crimson";

export type ThemeMode = "light" | "dark";

export const THEMES: { id: ThemeId; name: string; swatch: [string, string, string] }[] = [
  { id: "midnight-emerald", name: "Midnight Emerald", swatch: ["#0B1412", "#10B981", "#E7F5EF"] },
  { id: "warm-sand", name: "Warm Sand", swatch: ["#FAF6F0", "#C2410C", "#2A211B"] },
  { id: "indigo-studio", name: "Indigo Studio", swatch: ["#FFFFFF", "#3730A3", "#0F172A"] },
  { id: "graphite-amber", name: "Graphite Amber", swatch: ["#111113", "#F59E0B", "#EDEDF0"] },
  { id: "royal-plum", name: "Royal Plum", swatch: ["#1B0F1C", "#A21CAF", "#F3E8F7"] },
  { id: "ocean-teal", name: "Ocean Teal", swatch: ["#F2F8FC", "#0369A1", "#0C4A6E"] },
  { id: "rose-champagne", name: "Rose Champagne", swatch: ["#FAF6F0", "#B45309", "#3B2A1F"] },
  { id: "forest-cream", name: "Forest Cream", swatch: ["#F4F8F1", "#15803D", "#14311F"] },
  { id: "cyber-neon", name: "Cyber Neon", swatch: ["#140D1C", "#A855F7", "#22D3EE"] },
  { id: "slate-crimson", name: "Slate Crimson", swatch: ["#0F1622", "#DC2626", "#E2E8F0"] },
];

const THEME_KEY = "shop-theme";
const MODE_KEY = "shop-theme-mode";

type Ctx = {
  theme: ThemeId;
  mode: ThemeMode;
  setTheme: (t: ThemeId) => void;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function apply(theme: ThemeId, mode: ThemeMode) {
  const el = document.documentElement;
  el.setAttribute("data-theme", theme);
  el.classList.toggle("dark", mode === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("midnight-emerald");
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const t = (localStorage.getItem(THEME_KEY) as ThemeId | null) ?? "midnight-emerald";
    const m =
      (localStorage.getItem(MODE_KEY) as ThemeMode | null) ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setThemeState(t);
    setModeState(m);
    apply(t, m);
  }, []);

  const setTheme = useCallback(
    (t: ThemeId) => {
      setThemeState(t);
      localStorage.setItem(THEME_KEY, t);
      apply(t, mode);
    },
    [mode],
  );

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      localStorage.setItem(MODE_KEY, m);
      apply(theme, m);
    },
    [theme],
  );

  const toggleMode = useCallback(
    () => setMode(mode === "dark" ? "light" : "dark"),
    [mode, setMode],
  );

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
