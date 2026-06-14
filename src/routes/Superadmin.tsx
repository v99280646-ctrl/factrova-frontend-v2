import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CreditCard,
  LayoutDashboard,
  ShieldAlert,
  TriangleAlert,
  Wallet,
  Settings,
  TrendingUp,
} from "lucide-react";
import { SuperadminShell } from "@/components/superadmin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { toast } from "sonner";

export const Route = createFileRoute("/Superadmin")({
  head: () => ({ meta: [{ title: "Super Admin Dashboard - Factrova" }] }),
  component: SuperadminDashboard,
});

type Factory = {
  id: string;
  name: string;
  code: string;
  adminEmail?: string;
  status?: string;
  subscription?: {
    status?: string;
    plan?: string;
  };
};

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string | null;
  factoryId?: {
    name?: string;
  };
};

type Subscription = {
  id: string;
  plan?: string;
  status?: string;
  currentPeriodEnd?: string | null;
  factoryId?: {
    name?: string;
  };
};

type Summary = {
  stats: {
    factories: number;
    superAdmins: number;
    factoryUsers: number;
    revenue: number;
  };
  recentFactories: Factory[];
  recentSubscriptions: Subscription[];
  recentPayments: Payment[];
};

const shortcuts = [
  {
    to: "/Superadmin/factories",
    label: "Factories",
    description: "Review access and activation state.",
  },
  {
    to: "/Superadmin/subscriptions",
    label: "Subscriptions",
    description: "Track plan renewals and due accounts.",
  },
  {
    to: "/Superadmin/payments",
    label: "Payments",
    description: "Inspect collected and pending payments.",
  },
  { to: "/Superadmin/settings", label: "Settings", description: "Adjust platform-level controls." },
];

function currency(value: number, symbol = "Rs") {
  return `${symbol} ${new Intl.NumberFormat("en-IN").format(value)}`;
}

function SuperadminDashboard() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    apiRootRequest<Summary>(API_PATHS.admin.dashboardSummary)
      .then(setSummary)
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Unable to load super-admin data"),
      );
  }, []);

  const factories = summary?.recentFactories ?? [];
  const activePlans =
    summary?.recentSubscriptions.filter((item) => item.status === "active").length ?? 0;
  const pendingPayments =
    summary?.recentPayments.filter((item) => item.status !== "paid").length ?? 0;
  const revenue = summary?.stats.revenue ?? 0;
  const isOverview = pathname === "/Superadmin";

  const metrics = [
    {
      label: "Factories",
      value: String(summary?.stats.factories ?? 0),
      delta: "Live from backend",
      icon: Building2,
      tone: "text-sky-300",
    },
    {
      label: "Active plans",
      value: String(activePlans),
      delta: `${summary?.recentSubscriptions.length ?? 0} recent subscriptions`,
      icon: CreditCard,
      tone: "text-emerald-300",
    },
    {
      label: "Monthly revenue",
      value: currency(revenue),
      delta: "Paid payments only",
      icon: Wallet,
      tone: "text-amber-300",
    },
    {
      label: "Risk alerts",
      value: String(pendingPayments),
      delta: "Unpaid or pending payments",
      icon: ShieldAlert,
      tone: "text-rose-300",
    },
  ];

  const activity = [
    ...factories.slice(0, 3).map((factory) => ({
      title: `${factory.name} registered`,
      detail: `Factory code ${factory.code} is ${factory.status || "active"}.`,
      time: "Recent",
      status: factory.status === "disabled" ? "danger" : "success",
    })),
    ...(summary?.recentPayments ?? []).slice(0, 2).map((payment) => ({
      title: `${payment.factoryId?.name || "Factory"} payment ${payment.status}`,
      detail: `${currency(payment.amount, payment.currency)} on ${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "unknown date"}.`,
      time: "Recent",
      status:
        payment.status === "paid" ? "success" : payment.status === "failed" ? "danger" : "warning",
    })),
  ];

  return isOverview ? (
    <SuperadminShell title="Dashboard">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.24),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(30,41,59,0.98))] p-6 text-white shadow-2xl shadow-slate-950/30">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300/80">
              Platform control
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Super-admin command center for Factrova.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Live counts, recent factories, payments, and subscriptions are loaded directly from
              the backend.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-sky-400 text-slate-950 hover:bg-sky-300">
              <Link to="/Superadmin/factories">
                Open factories
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Link to="/Superadmin/payments">View payments</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-white/10 bg-slate-950/70 text-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">{metric.label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight">{metric.value}</p>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ${metric.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-300">{metric.delta}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-white/10 bg-slate-950/70 text-white">
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Factory health</h3>
                <p className="text-sm text-slate-300">Live factory records from the backend.</p>
              </div>
              <Badge className="bg-white/10 text-sky-200 hover:bg-white/10">
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                Live data
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-3 font-medium">Factory</th>
                    <th className="px-3 py-3 font-medium">Admin</th>
                    <th className="px-3 py-3 font-medium">Plan</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {factories.map((factory) => (
                    <tr
                      key={factory.id}
                      className="border-b border-white/10 last:border-0 hover:bg-white/5"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium">{factory.name}</p>
                        <p className="text-xs text-slate-400">{factory.code}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{factory.adminEmail || "-"}</td>
                      <td className="px-3 py-3 text-slate-300">
                        {factory.subscription?.plan || "trial"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={
                            factory.status === "disabled"
                              ? "destructive"
                              : factory.status === "trial"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {factory.status || "active"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {factories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                        No factories found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/10 bg-slate-950/70 text-white">
            <CardContent className="p-5">
              <h3 className="text-lg font-semibold">Today&apos;s activity</h3>
              <p className="mt-1 text-sm text-slate-300">
                What changed across the platform recently.
              </p>
              <div className="mt-4 space-y-3">
                {activity.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={
                          item.status === "success"
                            ? "mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400"
                            : item.status === "warning"
                              ? "mt-1 h-2.5 w-2.5 rounded-full bg-amber-400"
                              : "mt-1 h-2.5 w-2.5 rounded-full bg-rose-400"
                        }
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{item.detail}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950/70 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Operations shortcuts</h3>
                  <p className="text-sm text-slate-300">
                    Fast access to the most-used admin areas.
                  </p>
                </div>
                <LayoutDashboard className="h-5 w-5 text-sky-300" />
              </div>

              <div className="mt-4 grid gap-3">
                {shortcuts.map((item) => (
                  <Button
                    key={item.to}
                    asChild
                    variant="outline"
                    className="h-auto justify-start border-white/10 bg-white/5 px-4 py-4 text-left text-white hover:bg-white/10"
                  >
                    <Link to={item.to}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sky-300">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950/70 text-white">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
                  <TriangleAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Attention needed</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {pendingPayments} payments are not fully settled and need review.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="mt-4 bg-rose-400 text-slate-950 hover:bg-rose-300"
                  >
                    <Link to="/Superadmin/factories">Resolve issues</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperadminShell>
  ) : (
    <Outlet />
  );
}
