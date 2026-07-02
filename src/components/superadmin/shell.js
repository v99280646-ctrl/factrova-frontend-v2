import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  Bell,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MoonStar,
  Search,
  Settings,
  ShieldCheck,
  SunMedium,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { clearAuthSession } from "@/lib/auth";
import { useSuperadminTheme } from "@/components/superadmin/theme";

const nav = [
  { to: "/superadmin", label: "Overview", icon: LayoutDashboard },
  { to: "/superadmin/factories", label: "Factories", icon: Building2 },
  { to: "/superadmin/notifications", label: "Notifications", icon: Bell },
  { to: "/superadmin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/superadmin/payments", label: "Payments", icon: Wallet },
  { to: "/superadmin/settings", label: "Settings", icon: Settings },
];

export function SuperadminShell({ title, children }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isDarkMode, toggleDarkMode } = useSuperadminTheme();

  return (
    <div
      className={cn(
        "flex min-h-screen transition-colors duration-300",
        "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]",
        "dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]",
        "text-slate-900 dark:text-slate-100",
      )}
    >
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r backdrop-blur-xl transition-colors duration-300",
          "border-slate-200/80 bg-white/75",
          "dark:border-white/10 dark:bg-slate-950/70",
        )}
      >
        {/* Logo Section */}
        <div
          className={cn(
            "flex h-16 items-center gap-3 px-5",
            "border-b border-slate-200/80",
            "dark:border-b dark:border-white/10",
          )}
        >
          <img src="/images/tfacrova-logo.png" alt="Factrova" className="h-9 w-9 object-contain" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Factrova</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Super admin</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-4">
          <div className="relative">
            <Search
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                "text-slate-500 dark:text-slate-400",
              )}
            />
            <Input
              placeholder="Search console"
              className={cn(
                "pl-9 transition-colors",
                "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
                "dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400",
              )}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => {
            const active =
              item.to === "/superadmin"
                ? pathname === "/superadmin"
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sky-50 text-sky-900 dark:bg-white/10 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className={cn("mt-auto border-t p-4", "border-slate-200/80", "dark:border-white/10")}>
          <Button
            variant="outline"
            className={cn(
              "w-full transition-colors",
              "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
              "dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
            )}
            onClick={() => {
              clearAuthSession();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <header
          className={cn(
            "sticky top-0 z-10 border-b backdrop-blur-xl transition-colors duration-300",
            "border-slate-200/80 bg-white/70",
            "dark:border-white/10 dark:bg-slate-950/60",
          )}
        >
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Super admin console</p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-sm md:flex",
                  "border-slate-200 bg-slate-50/90 text-slate-600",
                  "dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                )}
              >
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                Global platform access
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "transition-colors",
                  "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                  "dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
                )}
                onClick={toggleDarkMode}
              >
                <span className="flex items-center gap-2">
                  {isDarkMode ? (
                    <SunMedium className="h-4 w-4" />
                  ) : (
                    <MoonStar className="h-4 w-4" />
                  )}
                  {isDarkMode ? "Light" : "Dark"}
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto w-full px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
