import { createFileRoute } from "@tanstack/react-router";
import { Login } from "@/screens/auth/login.js";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Factrova - Login" },
      { name: "description", content: "Sign in to manage your factory operations with Factrova." },
    ],
  }),
  component: Login,
});
