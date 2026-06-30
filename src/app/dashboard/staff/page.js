"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/routes/dashboard/staff.js").then((mod) => mod.Staff));
