"use client";

import { clientPage } from "../_components/client-page";

export default clientPage(() => import("@/screens/dashboard/overview.js").then((mod) => mod.Overview));
