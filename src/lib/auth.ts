export type AuthRole = "super_admin" | "admin" | "staff";

export type PageAction = "view" | "add" | "edit" | "delete" | "update";
export type PageName =
  | "overview"
  | "customers"
  | "vendors"
  | "projects"
  | "services"
  | "staff"
  | "stock"
  | "finance"
  | "notifications"
  | "settings";

export type PagePermissions = Partial<Record<PageName, PageAction[]>>;

export type AuthFactory = {
  id: string;
  name: string;
  code: string;
  status?: string;
};

export type AuthMembership = {
  id: string;
  role: "admin" | "staff";
  employeeRole?: string;
  status: string;
  factory: AuthFactory;
  pagePermissions?: PagePermissions;
};

export type AuthProfile = {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  avatarUrl?: string;
  globalRole: "super_admin" | "admin" | "staff";
};

export type AuthSession = {
  token: string;
  profile: AuthProfile;
  primaryRole?: "super_admin" | "admin" | "staff";
  memberships: AuthMembership[];
  isNewUser?: boolean;
};

const SUPER_ADMIN_EMAIL = "ads.grandcafe@gmail.com";
const TOKEN_KEY = "factrova-auth-token";
const SESSION_KEY = "factrova-auth-session";
const FACTORY_KEY = "factrova-active-factory-id";

function isSuperAdminEmail(email?: string) {
  return email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getAuthToken() {
  const storage = safeLocalStorage();
  return storage?.getItem(TOKEN_KEY) ?? null;
}

export function getAuthSession(): AuthSession | null {
  const storage = safeLocalStorage();
  const raw = storage?.getItem(SESSION_KEY) ?? null;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function getActiveMembership(session = getAuthSession()) {
  if (!session?.memberships?.length) return null;
  const activeFactoryId = getActiveFactoryId();
  const matchingFactory = session.memberships.find(
    (membership) => membership.factory?.id === activeFactoryId,
  );
  if (session.primaryRole === "staff") {
    return (
      (matchingFactory?.role === "staff" ? matchingFactory : null) ||
      session.memberships.find((membership) => membership.role === "staff") ||
      null
    );
  }
  return (
    matchingFactory ||
    session.memberships.find((membership) => membership.role === "staff") ||
    session.memberships[0] ||
    null
  );
}

export function hasPagePermission(
  page: PageName,
  action: PageAction,
  session = getAuthSession(),
) {
  const membership = getActiveMembership(session);
  return Boolean(membership?.pagePermissions?.[page]?.includes(action));
}

export function canPageAction(
  page: PageName,
  action: PageAction,
  session = getAuthSession(),
) {
  if (!session) return false;
  if (session.profile.globalRole === "super_admin") return true;

  const membership = getActiveMembership(session);
  if (session.primaryRole === "admin" || membership?.role === "admin") return true;

  return Boolean(membership?.pagePermissions?.[page]?.includes(action));
}

const STAFF_PAGE_ROUTES: Array<{ page: PageName; route: string }> = [
  { page: "overview", route: "/dashboard" },
  { page: "projects", route: "/employee/dashboard" },
  { page: "customers", route: "/dashboard/customers" },
  { page: "vendors", route: "/dashboard/vendors" },
  { page: "services", route: "/dashboard/services" },
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
  if (saved) return saved;
  return getAuthSession()?.memberships[0]?.factory?.id ?? null;
}

function getPrimaryMembership(session: AuthSession) {
  return (
    session.memberships.find((membership) => membership.role === "staff") ??
    session.memberships[0] ??
    null
  );
}

export function saveAuthSession(session: AuthSession) {
  const normalizedSession: AuthSession = isSuperAdminEmail(session.profile.email)
    ? {
        ...session,
        profile: {
          ...session.profile,
          globalRole: "super_admin",
        },
        primaryRole: "super_admin",
      }
    : session;

  localStorage.setItem(TOKEN_KEY, normalizedSession.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(normalizedSession));

  const primaryMembership = getPrimaryMembership(normalizedSession);
  if (primaryMembership?.factory?.id) {
    localStorage.setItem(FACTORY_KEY, primaryMembership.factory.id);
  } else {
    localStorage.removeItem(FACTORY_KEY);
  }

  const appRole: "admin" | "staff" =
    normalizedSession.primaryRole === "staff" || primaryMembership?.role === "staff"
      ? "staff"
      : "admin";
  localStorage.setItem("factrova-login-role", appRole);
  localStorage.setItem(
    "factrova-profile-name",
    normalizedSession.profile.fullName ||
      normalizedSession.profile.name ||
      normalizedSession.profile.email,
  );
  localStorage.setItem("factrova-profile-email", normalizedSession.profile.email);
  if (primaryMembership?.role === "staff") {
    localStorage.setItem(
      "factrova-employee-name",
      normalizedSession.profile.fullName ||
        normalizedSession.profile.name ||
        normalizedSession.profile.email,
    );
    localStorage.setItem(
      "factrova-employee-position",
      primaryMembership.employeeRole || "Employee",
    );
  } else {
    localStorage.removeItem("factrova-employee-name");
    localStorage.removeItem("factrova-employee-position");
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(FACTORY_KEY);
  localStorage.removeItem("factrova-login-role");
  localStorage.removeItem("factrova-profile-name");
  localStorage.removeItem("factrova-profile-email");
  localStorage.removeItem("factrova-employee-name");
  localStorage.removeItem("factrova-employee-position");
}

export function getHomeRoute(session = getAuthSession()) {
  if (!session) return "/";
  if (session.profile.globalRole === "super_admin") return "/Superadmin";
  if (session.primaryRole === "staff" && !getActiveMembership(session)) return "/";
  return session.primaryRole === "staff" ||
    session.memberships.some((membership) => membership.role === "staff")
    ? getStaffHomeRoute(session) ?? "/"
    : "/admin/dashboard";
}
