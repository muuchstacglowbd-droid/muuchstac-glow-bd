import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  Coins,
  Truck,
  ReceiptText,
  Menu,
  LogOut,
  Sparkles,
  Search,
  Wallet,
  LineChart,
  X,
  Upload,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { CommandPalette, useCommandPalette } from "@/components/CommandPalette";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";
import { useGlobalShortcuts } from "@/lib/shortcuts";
import { PageTransition } from "@/components/ds/skeletons";
import { CalendarDays, Keyboard, Undo2 } from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Daily work",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/orders", label: "Orders", icon: ShoppingBag },
      { to: "/products", label: "Products", icon: Package },
      { to: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/analytics", label: "Analytics", icon: LineChart },
      { to: "/profit", label: "Daily Profit", icon: Coins },
      { to: "/daily-report", label: "Daily report", icon: CalendarDays },
      { to: "/returns", label: "Returns", icon: Undo2 },
      { to: "/expenses", label: "Expenses", icon: Wallet },
      { to: "/reports", label: "Stock & Income", icon: BarChart3 },
    ],
  },
  {
    label: "Setup",
    items: [
      { to: "/settings/courier", label: "Courier", icon: Truck },
      { to: "/settings/invoice", label: "Invoice setup", icon: ReceiptText },
      { to: "/import", label: "Data import", icon: Upload },
      { to: "/onboarding", label: "Get started", icon: Sparkles },
    ],
  },
] as const;

const MOBILE_TABS = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/products", label: "Stock", icon: Package },
  { to: "/analytics", label: "Insights", icon: LineChart },
] as const;

function isActive(pathname: string, to: string) {
  return pathname === to || (to !== "/" && pathname.startsWith(to));
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const palette = useCommandPalette();
  const shortcuts = useGlobalShortcuts();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <nav
      aria-label="Main navigation"
      className="flex h-full flex-col gap-1 overflow-y-auto bg-sidebar p-4 text-sidebar-foreground"
    >
      <div className="mb-6 flex items-center justify-between px-1">
        <Link to="/" className="flex items-center gap-3 rounded-xl" aria-label="Rose Nude control panel home">
          <span className="grid size-10 place-items-center rounded-2xl gold-gradient shadow-lg">
            <Sparkles className="size-4 text-sidebar-primary-foreground" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-bold">Rose&nbsp;Nude</span>
            <span className="block text-[0.6rem] uppercase tracking-[0.22em] text-sidebar-foreground/55">
              Control panel
            </span>
          </span>
        </Link>
        <button
          type="button"
          className="rounded-lg p-1.5 text-sidebar-foreground/60 hover:text-sidebar-foreground lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
      </div>

      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-3" role="group" aria-label={group.label}>
          <p className="px-3 pb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/40">
            {group.label}
          </p>
          {group.items.map((n) => {
            const active = isActive(pathname, n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:translate-x-0.5 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 h-6 w-[3px] rounded-r-full bg-sidebar-primary transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <n.icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
                {n.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto space-y-2 border-t border-sidebar-border pt-4">
        <div className="flex items-center gap-2.5 px-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-bold uppercase text-sidebar-accent-foreground">
            {user?.email?.[0] ?? "U"}
          </span>
          <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
      <ShortcutsDialog open={shortcuts.helpOpen} onOpenChange={shortcuts.setHelpOpen} />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border shadow-2xl">
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border/70 bg-background/70 px-4 py-4 backdrop-blur-xl md:px-8">
          <button
            type="button"
            className="grid size-9 min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-card/70 transition-colors hover:bg-accent lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold leading-tight md:text-3xl">
              {title}
            </h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {/* On phones the page's own buttons drop to their own line and wrap,
              so nothing is ever pushed off the right edge. */}
          <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto">

            <button
              type="button"
              onClick={() => palette.setOpen(true)}
              aria-keyshortcuts="Control+K"
              aria-label="Search everything"
              className="hidden items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-caption text-muted-foreground transition-colors hover:bg-accent md:flex"
            >
              <Search className="size-3.5" />
              Search everything
              <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium">
                Ctrl K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => palette.setOpen(true)}
              className="grid size-9 min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-card/70 transition-colors hover:bg-accent md:hidden"
              aria-label="Search"
              aria-keyshortcuts="Control+K"
            >
              <Search className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => shortcuts.setHelpOpen(true)}
              className="hidden size-9 place-items-center rounded-xl border border-border bg-card/70 transition-colors hover:bg-accent md:grid"
              aria-label="Keyboard shortcuts"
              aria-keyshortcuts="?"
            >
              <Keyboard className="size-4" />
            </button>
            <NotificationBell />
            {actions}
            <ThemeSwitcher />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="px-4 py-6 pb-24 outline-none md:px-8 lg:pb-6">
          <PageTransition key={pathname}>{children}</PageTransition>
        </main>
      </div>

      <nav aria-label="Quick navigation" className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border/70 bg-background/85 backdrop-blur-xl lg:hidden">
        {MOBILE_TABS.map((t) => {
          const active = isActive(pathname, t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-col items-center gap-1 py-2.5 text-[0.65rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <t.icon className="size-4.5" />
              {t.label}
            </Link>
          );
        })}
        <Link
          to="/orders"
          aria-label="Create a new order"
          className="flex min-h-11 flex-col items-center gap-1 py-2.5 text-[0.65rem] font-medium text-muted-foreground"
        >
          <span className="grid size-4.5 place-items-center rounded-full gold-gradient text-[0.7rem] font-bold text-sidebar-primary-foreground">
            +
          </span>
          New
        </Link>
      </nav>
    </div>
  );
}
