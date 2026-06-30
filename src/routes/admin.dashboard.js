import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/screens/admin/dashboard.js";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard - Factrova" }] }),
  component: AdminDashboard,
});
