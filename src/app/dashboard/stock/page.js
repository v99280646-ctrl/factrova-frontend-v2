"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/routes/dashboard/stock.js").then((mod) => mod.Stock));
