"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/screens/employee/dashboard.js").then((mod) => mod.EmployeeDashboard));
