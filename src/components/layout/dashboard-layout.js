"use client";

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Boxes,
  ChevronDown,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { canPageAction, clearAuthSession, getAuthSession, getStaffHomeRoute } from "@/lib/auth";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, page: "overview" },
  { to: "/dashboard/customers", label: "Customers", icon: Users, page: "customers" },
  { to: "/dashboard/vendors", label: "Vendors", icon: Truck, page: "vendors" },
  { to: "/dashboard/projects", label: "Projects", icon: FolderKanban, page: "projects" },
  { to: "/dashboard/services", label: "Services", icon: Wrench, page: "services" },
  { to: "/dashboard/staff", label: "Staff Access & Performance", icon: ShieldCheck, page: "staff" },
  { to: "/dashboard/stock", label: "Stock Management", icon: Boxes, page: "stock" },
  { to: "/dashboard/finance", label: "Accounts & Finance", icon: Wallet, page: "finance" },
  { to: "/dashboard/subscriptions", label: "Subscriptions", icon: CreditCard, page: "subscriptions" },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell, page: "notifications" },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, page: "settings" },
];

const adminHome = "/admin/dashboard";
const employeeHome = "/employee/dashboard";

function pageForPath(pathname) {
  if (pathname === "/employee/dashboard" || pathname.startsWith("/dashboard/projects")) {
    return "projects";
  }
  if (pathname === "/dashboard/subscriptions") {
    return "subscriptions";
  }
  if (pathname === "/dashboard" || pathname === adminHome) {
    return "overview";
  }
  return nav.find((item) => item.to !== "/dashboard" && pathname.startsWith(item.to))?.page ?? null;
}

function isActiveRoute(pathname, to) {
  if (to === adminHome) return pathname === adminHome || pathname === "/dashboard";
  if (to === employeeHome) return pathname === employeeHome;
  if (to === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(to);
}

function SidebarBrand({ collapsed = false }) {
  return (
    <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background">
        <img src="/images/tfacrova-logo.png" alt="Factrova" className="h-8 w-8 object-contain" />
      </div>
      {!collapsed ? (
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-base font-bold tracking-tight text-sidebar-foreground">Factrova</p>
          <p className="truncate text-[11px] text-muted-foreground">Factory Operations</p>
        </div>
      ) : null}
    </div>
  );
}

function AppSidebarNav({ pathname, items, collapsed = false, onNavigate }) {
  return (
    <nav className={cn("flex flex-col gap-1", collapsed ? "p-2" : "p-3")}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActiveRoute(pathname, item.to);

        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)]"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardLayout({ title, children, role }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loginRole, setLoginRole] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("factrova-login-role") === "staff"
      ? "staff"
      : "admin",
  );
  const [session, setSession] = useState(() => getAuthSession());
  const [adminName, setAdminName] = useState("Admin");
  const [employeeName, setEmployeeName] = useState("Employee");
  const [employeePosition, setEmployeePosition] = useState("Employee");
  const [profileEmail, setProfileEmail] = useState("");

  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();

  const effectiveRole = role ?? loginRole;
  const employeeMode = effectiveRole === "staff";
  const currentPage = pageForPath(pathname);
  const canViewCurrentPage = !employeeMode || !currentPage || canPageAction(currentPage, "view", session);
  const staffHome = getStaffHomeRoute(session);
  const profileName = employeeMode ? employeeName : adminName;
  const profileInitials =
    profileName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || (employeeMode ? "EM" : "AD");

  const visibleNav = useMemo(() => {
    if (employeeMode) {
      return [
        ...(canPageAction("projects", "view", session)
          ? [
              { to: "/dashboard/projects", label: "All Projects", icon: FolderKanban, page: "projects" },
              { to: employeeHome, label: "My Projects", icon: Wrench, page: "projects" },
            ]
          : []),
        ...nav.filter((item) => item.page !== "projects" && canPageAction(item.page, "view", session)),
      ];
    }

    return nav.map((item) => (item.to === "/dashboard" ? { ...item, to: adminHome } : item));
  }, [employeeMode, session]);

  useEffect(() => {
    const storedSession = getAuthSession();
    const storedRole = localStorage.getItem("factrova-login-role");
    const storedEmployeeName = localStorage.getItem("factrova-employee-name");
    const storedEmployeePosition = localStorage.getItem("factrova-employee-position");
    const storedProfileName = localStorage.getItem("factrova-profile-name");
    const storedProfileEmail = localStorage.getItem("factrova-profile-email");
    const employeeMembership = storedSession?.memberships.find((membership) => membership.role === "staff");

    setSession(storedSession);
    setLoginRole(role ?? (storedRole === "staff" ? "staff" : "admin"));
    setAdminName(
      storedProfileName?.trim() ||
        storedSession?.profile.fullName ||
        storedSession?.profile.name ||
        storedSession?.profile.email ||
        "Admin",
    );
    setEmployeeName(
      storedEmployeeName?.trim() ||
        storedProfileName?.trim() ||
        storedSession?.profile.fullName ||
        storedSession?.profile.name ||
        "Employee",
    );
    setEmployeePosition(storedEmployeePosition?.trim() || employeeMembership?.employeeRole || "Employee");
    setProfileEmail(storedProfileEmail || storedSession?.profile.email || "");
  }, [role]);

  const logout = () => {
    clearAuthSession();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:block",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <div className="relative">
          <AppSidebarNav pathname={pathname} items={visibleNav} collapsed={collapsed} />
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="absolute -right-3 top-4 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 rotate-90 transition-transform", collapsed && "-rotate-90")}
            />
          </button>
        </div>
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-sm border-r bg-sidebar p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarBrand />
          <div className="border-b border-sidebar-border px-4 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground">
                  {profileInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{profileName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {employeeMode ? employeePosition : profileEmail || "Admin"}
                </p>
              </div>
            </div>
          </div>
          <AppSidebarNav
            pathname={pathname}
            items={visibleNav}
            onNavigate={() => setMobileNavOpen(false)}
          />
          <div className="mt-auto border-t border-sidebar-border p-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMobileNavOpen(false);
                logout();
              }}
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight lg:text-lg">{title}</h1>
            <p className="truncate text-xs text-muted-foreground lg:hidden">
              {employeeMode ? employeePosition : profileEmail || "Factory dashboard"}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:gap-3">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." className="h-9 w-64 pl-9" />
            </div>

            {!employeeMode ? (
              <button
                type="button"
                className="relative hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground md:flex"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
              </button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 hover:bg-accent">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-[image:var(--gradient-primary)] text-xs font-semibold text-primary-foreground">
                    {profileInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-36 truncate text-sm font-medium md:inline">{profileName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <span className="block truncate">{profileName}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {employeeMode ? employeePosition : profileEmail || "Admin"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!employeeMode ? <DropdownMenuItem>Settings</DropdownMenuItem> : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {canViewCurrentPage ? (
            children
          ) : (
            <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
              <ShieldCheck className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Access not granted</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your staff permissions do not include this page.
              </p>
              {staffHome && staffHome !== pathname ? (
                <Button className="mt-5" onClick={() => navigate({ to: staffHome })}>
                  Go to an allowed page
                </Button>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
