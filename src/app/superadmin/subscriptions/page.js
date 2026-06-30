"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/screens/superadmin/subscriptions.js").then((mod) => mod.SuperAdminSubscriptions));
