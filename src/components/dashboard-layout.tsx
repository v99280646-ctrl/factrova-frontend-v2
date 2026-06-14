import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Truck,
  FolderKanban,
  Boxes,
  Wallet,
  LogOut,
  Search,
  Bell,
  Settings,
  ChevronDown,
  Wrench,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import {
  canPageAction,
  clearAuthSession,
  getAuthSession,
  getStaffHomeRoute,
  saveAuthSession,
  type AuthSession,
  type PageName,
} from "@/lib/auth";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { toast } from "sonner";
import factrovaLogo from "@/images/tfacrova logo.png";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, page: "overview" },
  { to: "/dashboard/customers", label: "Customers", icon: Users, page: "customers" },
  { to: "/dashboard/vendors", label: "Vendors", icon: Truck, page: "vendors" },
  { to: "/dashboard/projects", label: "Projects", icon: FolderKanban, page: "projects" },
  { to: "/dashboard/services", label: "Services", icon: Wrench, page: "services" },
  { to: "/dashboard/staff", label: "Staff Access & Performance", icon: ShieldCheck, page: "staff" },
  { to: "/dashboard/stock", label: "Stock Management", icon: Boxes, page: "stock" },
  { to: "/dashboard/finance", label: "Accounts & Finance", icon: Wallet, page: "finance" },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell, page: "notifications" },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, page: "settings" },
] as const;

const adminHome = "/admin/dashboard";
const employeeHome = "/employee/dashboard";

function pageForPath(pathname: string): PageName | null {
  if (pathname === "/employee/dashboard" || pathname.startsWith("/dashboard/projects"))
    return "projects";
  if (pathname === "/dashboard" || pathname === adminHome) return "overview";
  return nav.find((item) => item.to !== "/dashboard" && pathname.startsWith(item.to))?.page ?? null;
}

export function DashboardLayout({
  title,
  children,
  role,
}: {
  title: string;
  children: ReactNode;
  role?: "admin" | "staff";
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [loginRole, setLoginRole] = useState<"admin" | "staff">(() =>
    typeof window !== "undefined" && localStorage.getItem("factrova-login-role") === "staff"
      ? "staff"
      : "admin",
  );
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const [adminName, setAdminName] = useState("Admin");
  const [employeeName, setEmployeeName] = useState("Employee");
  const [employeePosition, setEmployeePosition] = useState("Employee");
  const [profileEmail, setProfileEmail] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const effectiveRole = role ?? loginRole;
  const employeeMode = effectiveRole === "staff";
  const currentPage = pageForPath(pathname);
  const canViewCurrentPage =
    !employeeMode || !currentPage || canPageAction(currentPage, "view", session);
  const profileName = employeeMode ? employeeName : adminName;
  const profileInitials =
    profileName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || (employeeMode ? "EM" : "AK");
  const visibleNav = employeeMode
    ? [
        ...(canPageAction("projects", "view", session)
          ? [
              {
                to: "/dashboard/projects",
                label: "All Projects",
                icon: FolderKanban,
                page: "projects" as const,
              },
              { to: employeeHome, label: "My Projects", icon: Wrench, page: "projects" as const },
            ]
          : []),
        ...nav.filter(
          (item) => item.page !== "projects" && canPageAction(item.page, "view", session),
        ),
      ]
    : nav.map((item) => (item.to === "/dashboard" ? { ...item, to: adminHome } : item));

  useEffect(() => {
    const storedSession = getAuthSession();
    const storedRole = localStorage.getItem("factrova-login-role");
    const storedEmployeeName = localStorage.getItem("factrova-employee-name");
    const storedEmployeePosition = localStorage.getItem("factrova-employee-position");
    const storedProfileName = localStorage.getItem("factrova-profile-name");
    const storedProfileEmail = localStorage.getItem("factrova-profile-email");
    const employeeMembership = storedSession?.memberships.find(
      (membership) => membership.role === "staff",
    );
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
    setEmployeePosition(
      storedEmployeePosition?.trim() || employeeMembership?.employeeRole || "Employee",
    );
    setProfileEmail(storedProfileEmail || storedSession?.profile.email || "");
  }, [role]);

  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;

    apiRootRequest<AuthSession>(API_PATHS.auth.me)
      .then((freshSession) => {
        if (cancelled) return;
        saveAuthSession(freshSession);
        setSession(freshSession);
        setLoginRole(freshSession.primaryRole === "staff" ? "staff" : "admin");
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Unable to refresh staff access";
        if (message.includes("No active staff access is assigned")) {
          clearAuthSession();
          toast.error(message);
          navigate({ to: "/", replace: true });
          return;
        }
        setSession(getAuthSession());
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, session?.token]);

  const staffHome = getStaffHomeRoute(session);

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background">
            <img src={factrovaLogo} alt="Factrova" className="h-8 w-8 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-base font-bold tracking-tight text-sidebar-foreground">
                Factrova
              </p>
              <p className="truncate text-[11px] text-muted-foreground">Factory Operations</p>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {visibleNav.map((item) => {
            const active =
              item.to === adminHome
                ? pathname === adminHome || pathname === "/dashboard"
                : item.to === employeeHome
                  ? pathname === employeeHome
                  : item.to === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 rotate-90 transition-transform", collapsed && "-rotate-90")}
          />
        </button>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search…" className="h-9 w-64 pl-9" />
            </div>
            {!employeeMode && (
              <button className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 hover:bg-accent">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-[image:var(--gradient-primary)] text-xs font-semibold text-primary-foreground">
                    {profileInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-36 truncate text-sm font-medium md:inline">
                  {profileName}
                </span>
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
                <DropdownMenuItem>Profile</DropdownMenuItem>
                {!employeeMode && <DropdownMenuItem>Settings</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    clearAuthSession();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-6">
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
                <Button
                  className="mt-5"
                  onClick={() => navigate({ to: staffHome as "/dashboard" })}
                >
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
