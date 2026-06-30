"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/routes/dashboard/vendors.js").then((mod) => mod.Vendors));
