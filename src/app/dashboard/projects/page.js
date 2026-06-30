"use client";

import { clientPage } from "../../_components/client-page";

export default clientPage(() => import("@/routes/dashboard/projects/projects.js").then((mod) => mod.Projects));
