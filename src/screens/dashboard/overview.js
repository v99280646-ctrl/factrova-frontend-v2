import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status/status-badge.js";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { FolderKanban, Activity, CheckCircle2, IndianRupee, ArrowUpRight } from "lucide-react";
import { projects as initialProjects, revenueByMonth as initialRevenueByMonth, } from "@/lib/data";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDateTimeCompact } from "@/lib/date-format";
const PIE_COLORS = ["oklch(0.52 0.23 287)", "oklch(0.65 0.16 155)", "oklch(0.78 0.16 75)"];
export function Overview() {
    const [projects, setProjects] = useState(initialProjects);
    const [revenueByMonth, setRevenueByMonth] = useState(initialRevenueByMonth);
    const total = projects.length;
    const active = projects.filter((p) => p.status === "ongoing").length;
    const done = projects.filter((p) => p.status === "delivered").length;
    const revenue = projects.filter((p) => p.status === "delivered").reduce((s, p) => s + p.amount, 0);
    const projectsByStatus = [
        { name: "Ongoing", value: projects.filter((project) => project.status === "ongoing").length },
        { name: "Delivered", value: projects.filter((project) => project.status === "delivered").length },
        { name: "Hold", value: projects.filter((project) => project.status === "hold").length },
    ];
    useEffect(() => {
        const load = async () => {
            try {
                const [projectRows, transactionRows] = await Promise.all([
                    api.list("projects"),
                    api.list("transactions", { type: "credit" }),
                ]);
                setProjects((projectRows ?? []).map((row) => ({
                    id: row.code,
                    name: row.name,
                    customer: row.customerName,
                    status: row.status,
                    progress: row.progress,
                    delivery: row.delivery ?? "TBD",
                    amount: Number(row.amount),
                })));
                const revenueRows = transactionRows?.length
                    ? buildRevenueByMonth(transactionRows.map((row) => ({
                        date: row.transactionDate,
                        amount: Number(row.amount),
                    })))
                    : buildRevenueByMonth((projectRows ?? []).map((row) => ({
                        date: row.delivery ?? row.createdAt,
                        amount: Number(row.amount),
                    })));
                setRevenueByMonth(revenueRows);
            }
            catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to load overview");
            }
        };
        load();
    }, []);
    const stats = [
        { label: "Total Projects", value: total, icon: FolderKanban, delta: "+12%" },
        { label: "Active Projects", value: active, icon: Activity, delta: "+3" },
        { label: "Completed", value: done, icon: CheckCircle2, delta: "+2" },
        { label: "Revenue (₹)", value: revenue.toLocaleString("en-IN"), icon: IndianRupee, delta: "+18%" },
    ];
    return (_jsxs(DashboardLayout, { title: "Overview", children: [_jsx("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: stats.map((s) => {
                    const Icon = s.icon;
                    return (_jsx(Card, { className: "border-border/60 shadow-[var(--shadow-card)]", children: _jsxs(CardContent, { className: "p-5", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-muted-foreground", children: s.label }), _jsx("p", { className: "mt-2 text-2xl font-bold tracking-tight", children: typeof s.value === 'number' ? Number(s.value.toFixed(2)).toLocaleString("en-IN") : s.value })] }), _jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)]", children: _jsx(Icon, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "mt-3 flex items-center gap-1 text-xs font-medium text-success", children: [_jsx(ArrowUpRight, { className: "h-3.5 w-3.5" }), " ", s.delta, " vs last month"] })] }) }, s.label));
                }) }), _jsxs("div", { className: "mt-6 grid gap-4 lg:grid-cols-3", children: [_jsxs(Card, { className: "lg:col-span-2 border-border/60 shadow-[var(--shadow-card)]", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-base", children: "Revenue trend" }) }), _jsx(CardContent, { className: "h-72", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: revenueByMonth, margin: { left: 0, right: 8, top: 8 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "rev", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "oklch(0.52 0.23 287)", stopOpacity: 0.4 }), _jsx("stop", { offset: "100%", stopColor: "oklch(0.52 0.23 287)", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false, stroke: "oklch(0.92 0.015 285)" }), _jsx(XAxis, { dataKey: "month", tickLine: false, axisLine: false, stroke: "oklch(0.5 0.03 280)", fontSize: 12 }), _jsx(YAxis, { tickLine: false, axisLine: false, stroke: "oklch(0.5 0.03 280)", fontSize: 12, tickFormatter: (v) => `₹${v / 1000}k` }), _jsx(Tooltip, { contentStyle: { borderRadius: 8, border: "1px solid oklch(0.92 0.015 285)", background: "white" }, formatter: (v) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"] }), _jsx(Area, { type: "monotone", dataKey: "revenue", stroke: "oklch(0.52 0.23 287)", strokeWidth: 2.5, fill: "url(#rev)" })] }) }) })] }), _jsxs(Card, { className: "border-border/60 shadow-[var(--shadow-card)]", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-base", children: "Projects by status" }) }), _jsxs(CardContent, { className: "h-72", children: [_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: projectsByStatus, dataKey: "value", nameKey: "name", innerRadius: 50, outerRadius: 85, paddingAngle: 3, children: projectsByStatus.map((_, i) => (_jsx(Cell, { fill: PIE_COLORS[i] }, i))) }), _jsx(Tooltip, {})] }) }), _jsx("div", { className: "-mt-4 flex justify-center gap-4 text-xs", children: projectsByStatus.map((s, i) => (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-full", style: { background: PIE_COLORS[i] } }), _jsx("span", { className: "text-muted-foreground", children: s.name }), _jsx("span", { className: "font-semibold", children: s.value })] }, s.name))) })] })] })] }), _jsxs(Card, { className: "mt-6 border-border/60 shadow-[var(--shadow-card)]", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-base", children: "Recent projects" }) }), _jsx(CardContent, { children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground", children: [_jsx("th", { className: "px-3 py-2 font-medium", children: "Project" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Customer" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Status" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Progress" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Delivery" }), _jsx("th", { className: "px-3 py-2 text-right font-medium", children: "Amount" })] }) }), _jsx("tbody", { children: projects.map((p) => (_jsxs("tr", { className: "border-b border-border/50 last:border-0 hover:bg-muted/40", children: [_jsx("td", { className: "px-3 py-3 font-medium", children: p.name }), _jsx("td", { className: "px-3 py-3 text-muted-foreground", children: p.customer }), _jsx("td", { className: "px-3 py-3", children: _jsx(StatusBadge, { status: p.status }) }), _jsx("td", { className: "px-3 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "h-1.5 w-24 overflow-hidden rounded-full bg-muted", children: _jsx("div", { className: "h-full rounded-full bg-[image:var(--gradient-primary)]", style: { width: `${p.progress}%` } }) }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [p.progress, "%"] })] }) }), _jsx("td", { className: "px-3 py-3 text-muted-foreground", children: formatDateTimeCompact(p.delivery) }), _jsxs("td", { className: "px-3 py-3 text-right font-semibold", children: ["\u20B9", p.amount.toLocaleString("en-IN")] })] }, p.id))) })] }) }) })] })] }));
}
function buildRevenueByMonth(rows) {
    const monthTotals = rows.reduce((totals, row) => {
        const date = row.date ? new Date(row.date) : null;
        if (!date || Number.isNaN(date.getTime()))
            return totals;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const month = new Intl.DateTimeFormat("en", {
            month: "short",
            year: "2-digit",
        }).format(date);
        totals[key] = {
            month,
            revenue: (totals[key]?.revenue ?? 0) + row.amount,
            sort: date.getFullYear() * 100 + date.getMonth(),
        };
        return totals;
    }, {});
    return Object.values(monthTotals)
        .sort((a, b) => a.sort - b.sort)
        .map(({ month, revenue }) => ({ month, revenue }));
}
