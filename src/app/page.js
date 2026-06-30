"use client";

import { clientPage } from "./_components/client-page";

export default clientPage(() => import("@/screens/auth/login.js").then((mod) => mod.Login));
