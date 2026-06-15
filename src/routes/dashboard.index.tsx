import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FolderKanban, Activity, CheckCircle2, IndianRupee, ArrowUpRight } from "lucide-react";
import {
  projects as initialProjects,
  revenueByMonth as initialRevenueByMonth,
  type Project,
  type ProjectStatus,
} from "@/lib/data";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDateTimeCompact } from "@/lib/date-format";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — Factrova" }] }),
  component: Overview,
});

const PIE_COLORS = ["oklch(0.52 0.23 287)", "oklch(0.65 0.16 155)", "oklch(0.78 0.16 75)"];

export function Overview() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [revenueByMonth, setRevenueByMonth] = useState(initialRevenueByMonth);
  const total = projects.length;
  const active = projects.filter((p) => p.status === "ongoing").length;
  const done = projects.filter((p) => p.status === "completed").length;
  const revenue = projects.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const projectsByStatus = [
    { name: "Ongoing", value: projects.filter((project) => project.status === "ongoing").length },
    { name: "Completed", value: projects.filter((project) => project.status === "completed").length },
    { name: "Hold", value: projects.filter((project) => project.status === "hold").length },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        const [projectRows, transactionRows] = await Promise.all([
          api.list<{
            id: string;
            code: string;
            name: string;
            customerName: string;
            status: ProjectStatus;
            progress: number;
            delivery?: string | null;
            amount: number;
            createdAt?: string;
          }>("projects"),
          api.list<{
            transactionDate: string;
            type: "credit" | "debit";
            amount: number;
          }>("transactions", { type: "credit" }),
        ]);
      setProjects(
        (projectRows ?? []).map((row) => ({
          id: row.code,
          name: row.name,
          customer: row.customerName,
          status: row.status as ProjectStatus,
          progress: row.progress,
          delivery: row.delivery ?? "TBD",
          amount: Number(row.amount),
        })),
      );
      const revenueRows = transactionRows?.length
        ? buildRevenueByMonth(
            transactionRows.map((row) => ({
              date: row.transactionDate,
              amount: Number(row.amount),
            })),
          )
        : buildRevenueByMonth(
            (projectRows ?? []).map((row) => ({
              date: row.delivery ?? row.createdAt,
              amount: Number(row.amount),
            })),
          );
      setRevenueByMonth(revenueRows);
      } catch (error) {
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

  return (
    <DashboardLayout title="Overview">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/60 shadow-[var(--shadow-card)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight">{typeof s.value === 'number' ? Number(s.value.toFixed(2)).toLocaleString("en-IN") : s.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-success">
                  <ArrowUpRight className="h-3.5 w-3.5" /> {s.delta} vs last month
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Revenue trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.52 0.23 287)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.52 0.23 287)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.015 285)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="oklch(0.5 0.03 280)" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} stroke="oklch(0.5 0.03 280)" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.015 285)", background: "white" }}
                  formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.52 0.23 287)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Projects by status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={projectsByStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {projectsByStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="-mt-4 flex justify-center gap-4 text-xs">
              {projectsByStatus.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/60 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Recent projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Progress</th>
                  <th className="px-3 py-2 font-medium">Delivery</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-3 font-medium">{p.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{p.customer}</td>
                    <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-[image:var(--gradient-primary)]" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDateTimeCompact(p.delivery)}</td>
                    <td className="px-3 py-3 text-right font-semibold">₹{p.amount.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function buildRevenueByMonth(rows: { date?: string | null; amount: number }[]) {
  const monthTotals = rows.reduce<Record<string, { month: string; revenue: number; sort: number }>>((totals, row) => {
    const date = row.date ? new Date(row.date) : null;
    if (!date || Number.isNaN(date.getTime())) return totals;

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
