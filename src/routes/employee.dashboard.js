import { createFileRoute } from "@tanstack/react-router";
import { EmployeeDashboard } from "@/screens/employee/dashboard.js";

export const Route = createFileRoute("/employee/dashboard")({
  head: () => ({ meta: [{ title: "My Projects - Factrova" }] }),
  component: EmployeeDashboard,
});
