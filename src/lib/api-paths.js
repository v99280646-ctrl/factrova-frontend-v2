export const API_PATHS = {
  auth: {
    google: "/auth/google",
    me: "/auth/me",
    logout: "/auth/logout",
    deleteAccount: "/auth/account",
  },
  admin: {
    dashboardSummary: "/admin/dashboard/summary",
    factories: "/admin/factories",
    notificationsHistory: "/admin/notifications/history",
    factoryNotificationAudit: (factoryId) => `/admin/factories/${factoryId}/notification-audit`,
    factoryNotifications: (factoryId) => `/admin/factories/${factoryId}/notifications`,
    factoryNotificationsHistory: (factoryId) =>
      `/admin/factories/${factoryId}/notifications/history`,
    factoryNotificationsSendNow: (factoryId, eventKey) =>
      `/admin/factories/${factoryId}/notifications/events/${eventKey}/send-now`,
    factorySection: (factoryId, section) =>
      `/admin/factories/${factoryId}/section-data?section=${section}`,
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
  notifications: {
    root: "/notifications",
    sendDailyUpdate: "/notifications/daily-updates/send",
    sendNow: (eventKey) => `/notifications/events/${eventKey}/send-now`,
    history: "/notifications/history",
  },
  factories: {
    root: (factoryId) => `/factories/${factoryId}`,
    adminProfile: (factoryId) => `/factories/${factoryId}/admin-profile`,
    settings: (factoryId) => `/factories/${factoryId}/settings`,
    subscription: (factoryId) => `/factories/${factoryId}/subscription`,
  },
};
