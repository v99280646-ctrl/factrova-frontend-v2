import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SuperadminAccess } from "@/components/superadmin/access.js";
import { SuperadminShell } from "@/components/superadmin/shell.js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function SuperAdminSettings() {
    return (_jsx(SuperadminAccess, { children: _jsxs(SuperadminShell, { title: "Settings", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: "Platform settings" }), _jsx("p", { className: "text-sm text-slate-300", children: "Configure global defaults and security settings." })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(Card, { className: "border-white/10 bg-white/5 text-white", children: _jsxs(CardContent, { className: "p-6", children: [_jsx("h3", { className: "font-semibold", children: "Access control" }), _jsx("p", { className: "mt-2 text-sm text-slate-300", children: "Use backend roles to control super-admin permissions." })] }) }), _jsx(Card, { className: "border-white/10 bg-white/5 text-white", children: _jsxs(CardContent, { className: "p-6", children: [_jsx("h3", { className: "font-semibold", children: "Billing provider" }), _jsx("p", { className: "mt-2 text-sm text-slate-300", children: "Connect your payment provider for subscription collection." })] }) })] }), _jsx("div", { className: "mt-6", children: _jsx(Button, { className: "bg-white text-slate-950 hover:bg-slate-200", children: "Save settings" }) })] }) }));
}
