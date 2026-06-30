import { createFileRoute } from "@tanstack/react-router";
import { SuperadminDashboard } from "@/screens/superadmin/dashboard.jsx";

export const Route = createFileRoute("/superadmin/")({
  head: () => ({ meta: [{ title: "Super Admin Dashboard - Factrova" }] }),
  component: SuperadminDashboard,
});
