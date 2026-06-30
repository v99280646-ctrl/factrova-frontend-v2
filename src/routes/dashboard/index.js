import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "@/screens/dashboard/overview.js";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — Factrova" }] }),
  component: Overview,
});
