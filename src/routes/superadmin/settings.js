import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminSettings } from "@/screens/superadmin/settings.js";

export const Route = createFileRoute("/superadmin/settings")({
  head: () => ({ meta: [{ title: "Settings - Factrova Super Admin" }] }),
  component: SuperAdminSettings,
});
