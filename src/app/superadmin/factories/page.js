"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/screens/superadmin/factories.jsx").then((mod) => mod.SuperAdminFactories));
