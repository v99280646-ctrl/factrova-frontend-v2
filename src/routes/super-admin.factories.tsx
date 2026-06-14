import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/super-admin/factories")({
  beforeLoad: () => {
    throw redirect({ to: "/Superadmin" });
  },
});
