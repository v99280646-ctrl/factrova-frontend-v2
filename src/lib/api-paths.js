export const API_PATHS = {
    auth: {
        google: "/auth/google",
        me: "/auth/me",
        logout: "/auth/logout",
    },
    admin: {
        dashboardSummary: "/admin/dashboard/summary",
        factories: "/admin/factories",
        subscriptions: {
            plans: "/admin/subscriptions/plans",
            factories: "/admin/subscriptions/factories",
            historyAll: "/admin/subscriptions/history",
            assign: (factoryId) => `/admin/subscriptions/factories/${factoryId}/assign`,
            renew: (factoryId) => `/admin/subscriptions/factories/${factoryId}/renew`,
            cancel: (factoryId) => `/admin/subscriptions/factories/${factoryId}/cancel`,
            history: (factoryId) => `/admin/subscriptions/factories/${factoryId}/history`,
        },
    },
    factories: {
        root: (factoryId) => `/factories/${factoryId}`,
        adminProfile: (factoryId) => `/factories/${factoryId}/admin-profile`,
        settings: (factoryId) => `/factories/${factoryId}/settings`,
        subscription: (factoryId) => `/factories/${factoryId}/subscription`,
    },
};
