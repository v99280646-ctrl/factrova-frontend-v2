import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminPayments } from "@/screens/superadmin/payments.js";

export const Route = createFileRoute("/superadmin/payments")({
  head: () => ({ meta: [{ title: "Payments - Factrova Super Admin" }] }),
  component: SuperAdminPayments,
});
