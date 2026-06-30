import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CreditCard, ShieldAlert, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { SuperadminAccess } from "@/components/superadmin/access";
import { SuperadminShell } from "@/components/superadmin/shell";
import { useSuperadminTheme } from "@/components/superadmin/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api, apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";

const shortcuts = [
  {
    to: "/superadmin/factories",
    title: "Factories",
    description: "Open the factory list and inspect users for each factory.",
  },
  {
    to: "/superadmin/subscriptions",
    title: "Subscriptions",
    description: "Review active plans, renewals, and overdue accounts.",
  },
  {
    to: "/superadmin/payments",
    title: "Payments",
    description: "Check paid, pending, and failed payment records.",
  },
  {
    to: "/superadmin/settings",
    title: "Settings",
    description: "Adjust the platform-wide superadmin controls.",
  },
];

function currency(value, symbol = "Rs") {
  return `${symbol} ${new Intl.NumberFormat("en-IN").format(value)}`;
}

export function SuperadminDashboard() {
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isDarkMode } = useSuperadminTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [dashboardSummary, projectRows] = await Promise.all([
          apiRootRequest(API_PATHS.admin.dashboardSummary),
          api.list("projects"),
        ]);
        setSummary(dashboardSummary);
        setProjects((projectRows ?? []).slice(0, 8));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load super-admin data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const factories = summary?.recentFactories ?? [];
  const recentSubscriptions = summary?.recentSubscriptions ?? [];
  const recentPayments = summary?.recentPayments ?? [];
  const activePlans = recentSubscriptions.filter((item) => item.status === "active").length;
  const pendingPayments = recentPayments.filter((item) => item.status !== "paid").length;
  const revenue = summary?.stats?.revenue ?? 0;

  if (isLoading) {
    return (
      <SuperadminAccess>
        <SuperadminShell title="Overview">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-lg text-slate-600 dark:text-slate-300">
              Loading dashboard data...
            </div>
          </div>
        </SuperadminShell>
      </SuperadminAccess>
    );
  }

  return (
    <SuperadminAccess>
      <SuperadminShell title="Overview">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(243,246,251,0.95))] text-slate-900 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.24),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.98))] dark:text-white dark:shadow-2xl dark:shadow-slate-950/30">
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] opacity-70" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] transition-colors duration-300 text-sky-700/80 dark:text-sky-300/80">
                Platform control
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl transition-colors duration-300 text-slate-900 dark:text-white">
                Superadmin overview for Factrova.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 transition-colors duration-300 text-slate-600 dark:text-slate-300">
                Start here to review factories, billing, and project activity. Each page below has
                its own route and dedicated screen.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="transition-all duration-300 bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
              >
                <Link href="/superadmin/factories">
                  Open factories
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="transition-all duration-300 border-slate-300 bg-white/80 text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <Link href="/superadmin/payments">View payments</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Metrics Grid */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Factories",
              value: String(summary?.stats?.factories ?? 0),
              note: "Live from backend",
              icon: Building2,
              tone: "text-sky-600 dark:text-sky-300",
              bg: "bg-sky-50 dark:bg-white/10",
            },
            {
              label: "Active plans",
              value: String(activePlans),
              note: `${recentSubscriptions.length} recent subscriptions`,
              icon: CreditCard,
              tone: "text-emerald-600 dark:text-emerald-300",
              bg: "bg-emerald-50 dark:bg-white/10",
            },
            {
              label: "Monthly revenue",
              value: currency(revenue),
              note: "Paid payments only",
              icon: Wallet,
              tone: "text-amber-600 dark:text-amber-300",
              bg: "bg-amber-50 dark:bg-white/10",
            },
            {
              label: "Risk alerts",
              value: String(pendingPayments),
              note: "Unpaid or pending payments",
              icon: ShieldAlert,
              tone: "text-rose-600 dark:text-rose-300",
              bg: "bg-rose-50 dark:bg-white/10",
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Card
                key={metric.label}
                className="rounded-2xl border transition-all duration-300 border-slate-200 bg-white/95 text-slate-900 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] hover:border-slate-300 hover:shadow-[0_15px_35px_-18px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-950/75 dark:text-white dark:shadow-2xl dark:shadow-slate-950/25 dark:hover:border-white/20"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="transition-colors duration-300 text-slate-500 dark:text-slate-400">
                        {metric.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight transition-colors duration-300 text-slate-900 dark:text-white">
                        {metric.value}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-300",
                        metric.bg,
                        metric.tone,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm transition-colors duration-300 text-slate-600 dark:text-slate-300">
                    {metric.note}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Activity and Sidebar */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          {/* Activity Feed */}
          <Card className="rounded-2xl border transition-all duration-300 border-slate-200 bg-white/95 text-slate-900 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] hover:border-slate-300 hover:shadow-[0_15px_35px_-18px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-950/75 dark:text-white dark:shadow-2xl dark:shadow-slate-950/25 dark:hover:border-white/20">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-5 py-4 transition-colors duration-300 border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="text-base font-semibold transition-colors duration-300 text-slate-900 dark:text-white">
                    Activity
                  </h3>
                  <p className="transition-colors duration-300 text-slate-500 dark:text-slate-400">
                    Recent factories and payment events.
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="transition-colors duration-300 bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white"
                >
                  Live
                </Badge>
              </div>

              <div className="divide-y transition-colors duration-300 divide-slate-200 dark:divide-white/10">
                {[
                  ...factories.slice(0, 3).map((factory) => ({
                    id: factory.id,
                    title: `${factory.name} registered`,
                    detail: `Factory code ${factory.code} is ${factory.status || "active"}.`,
                    meta: "Factory",
                    status: factory.status === "disabled" ? "danger" : "success",
                  })),
                  ...recentPayments.slice(0, 2).map((payment, index) => ({
                    id: `payment-${index}`,
                    title: `${payment.factoryId?.name || "Factory"} payment ${payment.status}`,
                    detail: `${currency(Number(payment.amount?.toFixed(2) || 0), payment.currency)} on ${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "unknown date"}.`,
                    meta: "Payment",
                    status:
                      payment.status === "paid"
                        ? "success"
                        : payment.status === "failed"
                          ? "danger"
                          : "warning",
                  })),
                ].map((item) => (
                  <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                    <div
                      className={cn(
                        "mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0",
                        item.status === "success"
                          ? "bg-emerald-400"
                          : item.status === "warning"
                            ? "bg-amber-300"
                            : "bg-rose-400",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium truncate transition-colors duration-300 text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <span className="text-xs flex-shrink-0 transition-colors duration-300 text-slate-500 dark:text-slate-400">
                          {item.meta}
                        </span>
                      </div>
                      <p className="mt-1 text-sm transition-colors duration-300 text-slate-600 dark:text-slate-300">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
                {!factories.length && !recentPayments.length && (
                  <div className="px-5 py-6 text-sm transition-colors duration-300 text-slate-500 dark:text-slate-400">
                    No recent activity available.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="rounded-2xl border transition-all duration-300 border-slate-200 bg-white/95 text-slate-900 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] hover:border-slate-300 hover:shadow-[0_15px_35px_-18px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-950/75 dark:text-white dark:shadow-2xl dark:shadow-slate-950/25 dark:hover:border-white/20">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold transition-colors duration-300 text-slate-900 dark:text-white">
                      Quick actions
                    </h3>
                    <p className="transition-colors duration-300 text-slate-500 dark:text-slate-400">
                      Jump to the main superadmin pages.
                    </p>
                  </div>
                  <TrendingUp className="h-5 w-5 transition-colors duration-300 text-sky-600 dark:text-sky-300" />
                </div>
                <div className="grid gap-2">
                  {shortcuts.map((shortcut) => (
                    <Button
                      key={shortcut.to}
                      asChild
                      variant="outline"
                      className="justify-start transition-all duration-300 border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href={shortcut.to}>
                        <div className="text-left">
                          <p className="font-medium transition-colors duration-300 text-slate-900 dark:text-white">
                            {shortcut.title}
                          </p>
                          <p className="text-xs transition-colors duration-300 text-slate-500 dark:text-slate-400">
                            {shortcut.description}
                          </p>
                        </div>
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Factories */}
            <Card className="rounded-2xl border transition-all duration-300 border-slate-200 bg-white/95 text-slate-900 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] hover:border-slate-300 hover:shadow-[0_15px_35px_-18px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-950/75 dark:text-white dark:shadow-2xl dark:shadow-slate-950/25 dark:hover:border-white/20">
              <CardContent className="space-y-3 p-5">
                <h3 className="text-base font-semibold transition-colors duration-300 text-slate-900 dark:text-white">
                  Recent factories
                </h3>
                <div className="space-y-3">
                  {factories.slice(0, 4).map((factory) => (
                    <div
                      key={factory.id}
                      className="rounded-xl border p-3 transition-all duration-300 border-slate-200 bg-slate-50/90 hover:bg-slate-100/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate transition-colors duration-300 text-slate-900 dark:text-white">
                            {factory.name}
                          </p>
                          <p className="text-xs truncate transition-colors duration-300 text-slate-500 dark:text-slate-400">
                            {factory.code}
                          </p>
                        </div>
                        <Badge
                          variant={factory.status === "disabled" ? "destructive" : "secondary"}
                          className="flex-shrink-0"
                        >
                          {factory.status || "active"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs transition-colors duration-300 text-slate-500 dark:text-slate-400">
                        {factory.subscription?.plan || "trial"} ·{" "}
                        {factory.subscription?.status || "trial"}
                      </p>
                    </div>
                  ))}
                  {!factories.length && (
                    <p className="transition-colors duration-300 text-slate-500 dark:text-slate-400">
                      No factories available.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card className="rounded-2xl border transition-all duration-300 border-slate-200 bg-white/95 text-slate-900 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] hover:border-slate-300 hover:shadow-[0_15px_35px_-18px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-950/75 dark:text-white dark:shadow-2xl dark:shadow-slate-950/25 dark:hover:border-white/20">
              <CardContent className="space-y-3 p-5">
                <h3 className="text-base font-semibold transition-colors duration-300 text-slate-900 dark:text-white">
                  Recent projects
                </h3>
                <div className="space-y-3">
                  {projects.slice(0, 4).map((project) => (
                    <div
                      key={project.id}
                      className="rounded-xl border p-3 transition-all duration-300 border-slate-200 bg-slate-50/90 hover:bg-slate-100/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate transition-colors duration-300 text-slate-900 dark:text-white">
                            {project.name}
                          </p>
                          <p className="text-xs truncate transition-colors duration-300 text-slate-500 dark:text-slate-400">
                            {project.code}
                          </p>
                        </div>
                        <span className="text-xs flex-shrink-0 transition-colors duration-300 text-slate-500 dark:text-slate-400">
                          {project.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs transition-colors duration-300 text-slate-500 dark:text-slate-400">
                        {project.customerName || "N/A"} · {project.progress || 0}% complete
                      </p>
                    </div>
                  ))}
                  {!projects.length && (
                    <p className="transition-colors duration-300 text-slate-500 dark:text-slate-400">
                      No projects available.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SuperadminShell>
    </SuperadminAccess>
  );
}
