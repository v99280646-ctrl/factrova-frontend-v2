"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/screens/dashboard/subscriptions.js").then((mod) => mod.Subscriptions));
