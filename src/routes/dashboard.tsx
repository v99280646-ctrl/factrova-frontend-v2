import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { clearAuthSession, getAuthSession } from "@/lib/auth";

type RequireAuthProps = { children: React.ReactNode };

function RequireAuth({ children }: RequireAuthProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      // If we lost session/expired token, force login.
      clearAuthSession();
      navigate({ to: "/", replace: true });
      return;
    }
  }, [navigate]);

  return <>{children}</>;
}

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  ),
});

