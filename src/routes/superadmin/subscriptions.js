import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminSubscriptions } from "@/screens/superadmin/subscriptions.js";

export const Route = createFileRoute("/superadmin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions - Factrova Super Admin" }] }),
  component: SuperAdminSubscriptions,
});
