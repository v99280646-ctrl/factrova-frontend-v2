import { jsx as _jsx } from "react/jsx-runtime";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/superadmin")({
  head: () => ({ meta: [{ title: "Super Admin - Factrova" }] }),
  component: SuperadminLayout,
});

function SuperadminLayout() {
  return _jsx(Outlet, {});
}
