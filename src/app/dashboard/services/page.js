"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/routes/dashboard/services.js").then((mod) => mod.Services));
