import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Overview } from "./dashboard.index";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard - Factrova" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  useEffect(() => {
    localStorage.setItem("factrova-login-role", "admin");
    localStorage.removeItem("factrova-employee-name");
  }, []);

  return <Overview />;
}
