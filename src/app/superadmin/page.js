"use client";

import { clientPage } from "../_components/client-page";

export default clientPage(() => import("@/screens/superadmin/dashboard.jsx").then((mod) => mod.SuperadminDashboard));
