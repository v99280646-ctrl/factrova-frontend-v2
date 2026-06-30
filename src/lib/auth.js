const SUPER_ADMIN_EMAIL = "muhammedraheem144@gmail.com";
const TOKEN_KEY = "factrova-auth-token";
const SESSION_KEY = "factrova-auth-session";
const FACTORY_KEY = "factrova-active-factory-id";
const AUTH_ME_REFRESH_KEY = "factrova-auth-me-refreshed-at";
function isSuperAdminEmail(email) {
    return email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
function safeLocalStorage() {
    if (typeof window === "undefined")
        return null;
    try {
        return window.localStorage;
    }
    catch {
        return null;
    }
}
function safeSessionStorage() {
    if (typeof window === "undefined")
        return null;
    try {
        return window.sessionStorage;
    }
    catch {
        return null;
    }
}
export function getAuthToken() {
    const storage = safeLocalStorage();
    return storage?.getItem(TOKEN_KEY) ?? null;
}
export function getAuthSession() {
    const storage = safeLocalStorage();
    const raw = storage?.getItem(SESSION_KEY) ?? null;
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function getActiveMembership(session = getAuthSession()) {
    if (!session?.memberships?.length)
        return null;
    const activeFactoryId = getActiveFactoryId();
    const matchingFactory = session.memberships.find((membership) => membership.factory?.id === activeFactoryId);
    if (session.primaryRole === "staff") {
        return ((matchingFactory?.role === "staff" ? matchingFactory : null) ||
            session.memberships.find((membership) => membership.role === "staff") ||
            null);
    }
    return (matchingFactory ||
        session.memberships.find((membership) => membership.role === "staff") ||
        session.memberships[0] ||
        null);
}
export function hasPagePermission(page, action, session = getAuthSession()) {
    const membership = getActiveMembership(session);
    return Boolean(membership?.pagePermissions?.[page]?.includes(action));
}
export function canPageAction(page, action, session = getAuthSession()) {
    if (!session)
        return false;
    if (session.profile.globalRole === "super_admin")
        return true;
    const membership = getActiveMembership(session);
    if (session.primaryRole === "admin" || membership?.role === "admin")
        return true;
    return Boolean(membership?.pagePermissions?.[page]?.includes(action));
}
const STAFF_PAGE_ROUTES = [
    { page: "overview", route: "/dashboard" },
    { page: "projects", route: "/employee/dashboard" },
    { page: "customers", route: "/dashboard/customers" },
    { page: "vendors", route: "/dashboard/vendors" },
    { page: "services", route: "/dashboard/services" },
    { page: "subscriptions", route: "/dashboard/subscriptions" },
    { page: "staff", route: "/dashboard/staff" },
    { page: "stock", route: "/dashboard/stock" },
    { page: "finance", route: "/dashboard/finance" },
    { page: "notifications", route: "/dashboard/notifications" },
    { page: "settings", route: "/dashboard/settings" },
];
export function getStaffHomeRoute(session = getAuthSession()) {
    return STAFF_PAGE_ROUTES.find(({ page }) => canPageAction(page, "view", session))?.route ?? null;
}
export function getActiveFactoryId() {
    const saved = safeLocalStorage()?.getItem(FACTORY_KEY);
    if (saved)
        return saved;
    return getAuthSession()?.memberships[0]?.factory?.id ?? null;
}
function getPrimaryMembership(session) {
    return (session.memberships.find((membership) => membership.role === "staff") ??
        session.memberships[0] ??
        null);
}
export function saveAuthSession(session) {
    const normalizedSession = isSuperAdminEmail(session.profile.email)
        ? {
            ...session,
            profile: {
                ...session.profile,
                globalRole: "super_admin",
            },
            primaryRole: "super_admin",
        }
        : session;
    const storage = safeLocalStorage();
    storage?.setItem(TOKEN_KEY, normalizedSession.token);
    storage?.setItem(SESSION_KEY, JSON.stringify(normalizedSession));
    const primaryMembership = getPrimaryMembership(normalizedSession);
    if (primaryMembership?.factory?.id) {
        storage?.setItem(FACTORY_KEY, primaryMembership.factory.id);
    }
    else {
        storage?.removeItem(FACTORY_KEY);
    }
    const appRole = normalizedSession.primaryRole === "staff" || primaryMembership?.role === "staff"
        ? "staff"
        : "admin";
    storage?.setItem("factrova-login-role", appRole);
    storage?.setItem("factrova-profile-name", normalizedSession.profile.fullName ||
        normalizedSession.profile.name ||
        normalizedSession.profile.email);
    storage?.setItem("factrova-profile-email", normalizedSession.profile.email);
    safeSessionStorage()?.removeItem(AUTH_ME_REFRESH_KEY);
    if (primaryMembership?.role === "staff") {
        storage?.setItem("factrova-employee-name", normalizedSession.profile.fullName ||
            normalizedSession.profile.name ||
            normalizedSession.profile.email);
        storage?.setItem("factrova-employee-position", primaryMembership.employeeRole || "Employee");
    }
    else {
        storage?.removeItem("factrova-employee-name");
        storage?.removeItem("factrova-employee-position");
    }
}
export function clearAuthSession() {
    const storage = safeLocalStorage();
    storage?.removeItem(TOKEN_KEY);
    storage?.removeItem(SESSION_KEY);
    storage?.removeItem(FACTORY_KEY);
    safeSessionStorage()?.removeItem(AUTH_ME_REFRESH_KEY);
    storage?.removeItem("factrova-login-role");
    storage?.removeItem("factrova-profile-name");
    storage?.removeItem("factrova-profile-email");
    storage?.removeItem("factrova-employee-name");
    storage?.removeItem("factrova-employee-position");
}
export function getHomeRoute(session = getAuthSession()) {
    if (!session)
        return "/";
    if (session.profile.globalRole === "super_admin")
        return "/superadmin";
    if (session.primaryRole === "staff" && !getActiveMembership(session))
        return "/";
    return session.primaryRole === "staff" ||
        session.memberships.some((membership) => membership.role === "staff")
        ? getStaffHomeRoute(session) ?? "/"
        : "/admin/dashboard";
}
