"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/routes/dashboard/notifications.js").then((mod) => mod.Notifications));
