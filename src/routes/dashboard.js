import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { clearAuthSession, getAuthSession } from "@/lib/auth";
function RequireAuth({ children }) {
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
    return _jsx(_Fragment, { children: children });
}
export const Route = createFileRoute("/dashboard")({
    component: () => (_jsx(RequireAuth, { children: _jsx(Outlet, {}) })),
});
