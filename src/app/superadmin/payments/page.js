"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/screens/superadmin/payments.js").then((mod) => mod.SuperAdminPayments));
