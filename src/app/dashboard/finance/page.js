"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/routes/dashboard/finance.js").then((mod) => mod.Finance));
