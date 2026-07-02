"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() =>
  import("@/screens/superadmin/notifications.js").then((mod) => mod.SuperadminNotifications),
);
