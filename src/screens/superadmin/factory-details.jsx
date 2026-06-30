"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { SuperadminAccess } from "@/components/superadmin/access";
import { SuperadminShell } from "@/components/superadmin/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";

export function FactoryDetailsPage({ factoryId }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFactoryDetails = async () => {
    if (!factoryId) return;

    setLoading(true);
    setError("");

    try {
      const detail = await apiRootRequest(API_PATHS.factories.root(factoryId));
      setDetails(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load factory details";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFactory = async () => {
    if (!details?.factory) return;

    const factory = details.factory;
    const nextStatus = factory.status === "disabled" ? "active" : "disabled";

    try {
      await apiRootRequest(API_PATHS.factories.root(factory.id), {
        method: "PATCH",
        body: { status: nextStatus, isActive: nextStatus === "active" },
      });

      setDetails((current) => ({
        ...current,
        factory: { ...current.factory, status: nextStatus },
      }));
      toast.success(nextStatus === "active" ? "Factory enabled" : "Factory disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update factory");
    }
  };

  useEffect(() => {
    if (!factoryId) {
      setLoading(false);
      setError("Factory id is missing from the route.");
      return;
    }

    void loadFactoryDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factoryId]);

  const factory = details?.factory ?? null;
  const employees = details?.employees ?? [];
  const adminEmployee = employees.find((employee) => employee.role === "admin") ?? details?.admin;

  const pageTitle = loading ? "Loading..." : factory?.name ?? "Factory Details";

  return (
    <SuperadminAccess>
      <SuperadminShell title={pageTitle}>
        <div className="mb-4 flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/superadmin/factories">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Factories
            </Link>
          </Button>
        </div>

        {error && (
          <Card className="mb-4 border-red-200 bg-red-50/70 text-red-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-white">
            <CardContent className="p-4 text-sm">{error}</CardContent>
          </Card>
        )}

        {loading && (
          <div className="rounded-lg border p-6 text-center text-slate-500 dark:border-white/10 dark:text-slate-400">
            Loading factory details...
          </div>
        )}

        {!loading && !error && details && (
          <Card className="rounded-2xl border transition-all duration-300 border-slate-200 bg-white/95 text-slate-900 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] hover:border-slate-300 hover:shadow-[0_15px_35px_-18px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-950/75 dark:text-white dark:shadow-2xl dark:shadow-slate-950/25 dark:hover:border-white/20">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{factory?.name}</h2>
                  <p className="text-slate-500 dark:text-slate-400">{factory?.code}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Badge
                    variant={factory?.status === "disabled" ? "destructive" : "secondary"}
                    className="transition-colors duration-300 data-[state=secondary]:bg-slate-200 data-[state=secondary]:text-slate-700"
                  >
                    {factory?.status || "active"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={toggleFactory}>
                    {factory?.status === "disabled" ? "Enable" : "Disable"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Company</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-white">
                    {details.details?.companyName || factory?.name || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{details.details?.email || "-"}</p>
                </div>
                <div className="rounded-lg border p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Project count</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-white">{details.details?.projectCount || 0}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Subscription: {factory?.subscriptionPlan || "trial"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Admin account</p>
                    <p className="mt-1 font-medium text-slate-900 dark:text-white">{adminEmployee?.fullName || "-"}</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-300" />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>Role: {adminEmployee?.role || "Admin"}</p>
                  <p>Email: {adminEmployee?.email || "-"}</p>
                  <p>Phone: {adminEmployee?.phone || "-"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">Users in factory</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <UsersRound className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400">{employees.length} total</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {employees.length > 0 ? (
                    employees.map((employee, index) => (
                      <div key={`${index}-${employee.id}`} className="rounded-lg border p-3 dark:border-white/10 dark:bg-slate-900/60">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{employee.fullName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{employee.loginDetails?.email}</p>
                          </div>
                          <Badge
                            variant={employee.role === "admin" ? "secondary" : "outline"}
                            className="flex-shrink-0 data-[state=secondary]:bg-slate-200 data-[state=secondary]:text-slate-700"
                          >
                            {employee.employeeRole || (employee.role === "admin" ? "Admin" : "Team member")}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>Status: {employee.loginDetails?.active ? "Active" : "Disabled"}</span>
                          <span>
                            Last login:{" "}
                            {employee.loginDetails?.lastLoginAt ? new Date(employee.loginDetails.lastLoginAt).toLocaleString() : "-"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      No users found in this factory.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </SuperadminShell>
    </SuperadminAccess>
  );
}
