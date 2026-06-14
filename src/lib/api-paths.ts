export const API_PATHS = {
  auth: {
    google: "/auth/google",
    me: "/auth/me",
    logout: "/auth/logout",
  },
  admin: {
    dashboardSummary: "/admin/dashboard/summary",
    factories: "/admin/factories",
  },
  factories: {
    root: (factoryId: string) => `/factories/${factoryId}`,
    adminProfile: (factoryId: string) => `/factories/${factoryId}/admin-profile`,
    settings: (factoryId: string) => `/factories/${factoryId}/settings`,
  },
} as const;
