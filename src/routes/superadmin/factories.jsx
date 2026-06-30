import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminFactories } from "@/screens/superadmin/factories.jsx";

export const Route = createFileRoute("/superadmin/factories")({
  head: () => ({ meta: [{ title: "Factories - Factrova Super Admin" }] }),
  component: SuperAdminFactories,
});
