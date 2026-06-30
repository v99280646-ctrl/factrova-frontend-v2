"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/screens/admin/dashboard.js").then((mod) => mod.AdminDashboard));
