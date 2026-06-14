import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  Wallet,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { clearAuthSession } from "@/lib/auth";
import factrovaLogo from "@/images/tfacrova logo.png";

const nav = [
  { to: "/Superadmin", label: "Overview", icon: LayoutDashboard },
  { to: "/Superadmin/factories", label: "Factories", icon: Building2 },
  { to: "/Superadmin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/Superadmin/payments", label: "Payments", icon: Wallet },
  { to: "/Superadmin/settings", label: "Settings", icon: Settings },
] as const;

export function SuperadminShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_35%),linear-gradient(180deg,#0f172a_0%,#111827_100%)] text-slate-100">
      <aside className="sticky top-0 h-screen w-72 shrink-0 border-r border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <img src={factrovaLogo} alt="Factrova" className="h-9 w-9 object-contain" />
          <div>
            <p className="text-sm font-semibold text-white">Factrova</p>
            <p className="text-xs text-slate-300">Super admin</p>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search console"
              className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {nav.map((item) => {
            const active =
              item.to === "/Superadmin"
                ? pathname === "/Superadmin"
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <Button
            variant="outline"
            className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
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

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/50 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">Super admin console</p>
              <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <ShieldCheck className="h-4 w-4 text-sky-300" />
              Global platform access
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
