"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/screens/superadmin/settings.js").then((mod) => mod.SuperAdminSettings));
