import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from "react";
import { Overview } from "@/screens/dashboard/overview.js";

export function AdminDashboard() {
    useEffect(() => {
        localStorage.setItem("factrova-login-role", "admin");
        localStorage.removeItem("factrova-employee-name");
    }, []);
    return _jsx(Overview, {});
}
