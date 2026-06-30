import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, Truck, FolderKanban, Boxes, Wallet, LogOut, Search, Bell, Settings, ChevronDown, Wrench, ShieldCheck, CreditCard, } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { canPageAction, clearAuthSession, getAuthSession, getStaffHomeRoute, saveAuthSession, } from "@/lib/auth";
import { toast } from "sonner";
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
    if (pathname === "/employee/dashboard" || pathname.startsWith("/dashboard/projects"))
        return "projects";
    if (pathname === "/dashboard/subscriptions")
        return "subscriptions";
    if (pathname === "/dashboard" || pathname === adminHome)
        return "overview";
    return nav.find((item) => item.to !== "/dashboard" && pathname.startsWith(item.to))?.page ?? null;
}
export function DashboardLayout({ title, children, role, }) {
    const [collapsed, setCollapsed] = useState(false);
    const [loginRole, setLoginRole] = useState(() => typeof window !== "undefined" && localStorage.getItem("factrova-login-role") === "staff"
        ? "staff"
        : "admin");
    const [session, setSession] = useState(() => getAuthSession());
    const [adminName, setAdminName] = useState("Admin");
    const [employeeName, setEmployeeName] = useState("Employee");
    const [employeePosition, setEmployeePosition] = useState("Employee");
    const [profileEmail, setProfileEmail] = useState("");
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const navigate = useNavigate();
    const effectiveRole = role ?? loginRole;
    const employeeMode = effectiveRole === "staff";
    const currentPage = pageForPath(pathname);
    const canViewCurrentPage = !employeeMode || !currentPage || canPageAction(currentPage, "view", session);
    const profileName = employeeMode ? employeeName : adminName;
    const profileInitials = profileName
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
                        page: "projects",
                    },
                    { to: employeeHome, label: "My Projects", icon: Wrench, page: "projects" },
                ]
                : []),
            ...nav.filter((item) => item.page !== "projects" && canPageAction(item.page, "view", session)),
        ]
        : nav.map((item) => (item.to === "/dashboard" ? { ...item, to: adminHome } : item));
    useEffect(() => {
        const storedSession = getAuthSession();
        const storedRole = localStorage.getItem("factrova-login-role");
        const storedEmployeeName = localStorage.getItem("factrova-employee-name");
        const storedEmployeePosition = localStorage.getItem("factrova-employee-position");
        const storedProfileName = localStorage.getItem("factrova-profile-name");
        const storedProfileEmail = localStorage.getItem("factrova-profile-email");
        const employeeMembership = storedSession?.memberships.find((membership) => membership.role === "staff");
        setLoginRole(role ?? (storedRole === "staff" ? "staff" : "admin"));
        setAdminName(storedProfileName?.trim() ||
            storedSession?.profile.fullName ||
            storedSession?.profile.name ||
            storedSession?.profile.email ||
            "Admin");
        setEmployeeName(storedEmployeeName?.trim() ||
            storedProfileName?.trim() ||
            storedSession?.profile.fullName ||
            storedSession?.profile.name ||
            "Employee");
        setEmployeePosition(storedEmployeePosition?.trim() || employeeMembership?.employeeRole || "Employee");
        setProfileEmail(storedProfileEmail || storedSession?.profile.email || "");
    }, [role]);
    const staffHome = getStaffHomeRoute(session);
    return (_jsxs("div", { className: "flex min-h-screen w-full bg-muted/30", children: [_jsxs("aside", { className: cn("sticky top-0 h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-all duration-300", collapsed ? "w-[72px]" : "w-64"), children: [_jsxs("div", { className: "flex h-16 items-center gap-2 border-b border-sidebar-border px-4", children: [_jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background", children: _jsx("img", { src: "/images/tfacrova-logo.png", alt: "Factrova", className: "h-8 w-8 object-contain" }) }), !collapsed && (_jsxs("div", { className: "flex-1 overflow-hidden", children: [_jsx("p", { className: "truncate text-base font-bold tracking-tight text-sidebar-foreground", children: "Factrova" }), _jsx("p", { className: "truncate text-[11px] text-muted-foreground", children: "Factory Operations" })] }))] }), _jsx("nav", { className: "flex flex-col gap-1 p-3", children: visibleNav.map((item) => {
                            const active = item.to === adminHome
                                ? pathname === adminHome || pathname === "/dashboard"
                                : item.to === employeeHome
                                    ? pathname === employeeHome
                                    : item.to === "/dashboard"
                                        ? pathname === "/dashboard"
                                        : pathname.startsWith(item.to);
                            const Icon = item.icon;
                            return (_jsxs(Link, { to: item.to, className: cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all", active
                                    ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)]"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"), children: [_jsx(Icon, { className: "h-[18px] w-[18px] shrink-0" }), !collapsed && _jsx("span", { className: "truncate", children: item.label })] }, item.to));
                        }) }), _jsx("button", { onClick: () => setCollapsed((c) => !c), className: "absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground", "aria-label": "Toggle sidebar", children: _jsx(ChevronDown, { className: cn("h-3.5 w-3.5 rotate-90 transition-transform", collapsed && "-rotate-90") }) })] }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col", children: [_jsxs("header", { className: "sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur", children: [_jsx("h1", { className: "text-lg font-semibold tracking-tight", children: title }), _jsxs("div", { className: "ml-auto flex items-center gap-3", children: [_jsxs("div", { className: "relative hidden md:block", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { placeholder: "Search\u2026", className: "h-9 w-64 pl-9" })] }), !employeeMode && (_jsxs("button", { className: "relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground", children: [_jsx(Bell, { className: "h-4 w-4" }), _jsx("span", { className: "absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" })] })), _jsxs(DropdownMenu, { children: [_jsxs(DropdownMenuTrigger, { className: "flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 hover:bg-accent", children: [_jsx(Avatar, { className: "h-7 w-7", children: _jsx(AvatarFallback, { className: "bg-[image:var(--gradient-primary)] text-xs font-semibold text-primary-foreground", children: profileInitials }) }), _jsx("span", { className: "hidden max-w-36 truncate text-sm font-medium md:inline", children: profileName }), _jsx(ChevronDown, { className: "h-3.5 w-3.5 text-muted-foreground" })] }), _jsxs(DropdownMenuContent, { align: "end", className: "w-48", children: [_jsxs(DropdownMenuLabel, { children: [_jsx("span", { className: "block truncate", children: profileName }), _jsx("span", { className: "block text-xs font-normal text-muted-foreground", children: employeeMode ? employeePosition : profileEmail || "Admin" })] }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuItem, { children: "Profile" }), !employeeMode && _jsx(DropdownMenuItem, { children: "Settings" }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { onClick: () => {
                                                            clearAuthSession();
                                                            navigate({ to: "/" });
                                                        }, children: [_jsx(LogOut, { className: "mr-2 h-4 w-4" }), " Logout"] })] })] })] })] }), _jsx("main", { className: "flex-1 p-6", children: canViewCurrentPage ? (children) : (_jsxs("div", { className: "mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center", children: [_jsx(ShieldCheck, { className: "mb-4 h-12 w-12 text-muted-foreground" }), _jsx("h2", { className: "text-xl font-semibold", children: "Access not granted" }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Your staff permissions do not include this page." }), staffHome && staffHome !== pathname ? (_jsx(Button, { className: "mt-5", onClick: () => navigate({ to: staffHome }), children: "Go to an allowed page" })) : null] })) })] })] }));
}
