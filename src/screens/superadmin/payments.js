import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { SuperadminAccess } from "@/components/superadmin/access.js";
import { SuperadminShell } from "@/components/superadmin/shell.js";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
export function SuperAdminPayments() {
    const [payments, setPayments] = useState([]);
    useEffect(() => {
        apiRootRequest(API_PATHS.admin.dashboardSummary)
            .then((data) => setPayments(data.recentPayments ?? []))
            .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load payments"));
    }, []);
    return (_jsx(SuperadminAccess, { children: _jsxs(SuperadminShell, { title: "Payments", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: "Payments" }), _jsx("p", { className: "text-sm text-slate-300", children: "Recent payment records loaded from the backend." })] }), _jsx(Card, { className: "border-white/10 bg-slate-950/70 text-white", children: _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-300", children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Factory" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Amount" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Status" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Date" })] }) }), _jsxs("tbody", { children: [payments.map((payment) => (_jsxs("tr", { className: "border-b border-white/10 last:border-0 hover:bg-white/5", children: [_jsx("td", { className: "px-4 py-3 font-medium", children: payment.factoryId?.name || "-" }), _jsxs("td", { className: "px-4 py-3 text-slate-300", children: [payment.currency, " ", new Intl.NumberFormat("en-IN").format(Number(payment.amount.toFixed(2)))] }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: payment.status === "paid"
                                                                ? "secondary"
                                                                : payment.status === "failed"
                                                                    ? "destructive"
                                                                    : "outline", children: payment.status }) }), _jsx("td", { className: "px-4 py-3 text-slate-300", children: payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "-" })] }, payment.id))), payments.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-4 py-10 text-center text-slate-300", children: "No payment records found." }) }))] })] }) }) }) })] }) }));
}
