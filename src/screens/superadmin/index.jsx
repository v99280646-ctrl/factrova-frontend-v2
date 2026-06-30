import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiRootRequest } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import { SuperadminAccess } from "@/components/superadmin/access";
import { SuperadminShell } from "@/components/superadmin/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { API_PATHS } from "@/lib/api-paths";

export const Route = createFileRoute("/superadmin/factories/")({
  component: SuperAdminFactories,
});

function SuperAdminFactories() {
  const navigate = useNavigate();
  const [factories, setFactories] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFactories = async () => {
    const session = getAuthSession();
    if (!session?.token) {
      navigate({ to: "/", replace: true });
      return [];
    }

    setLoading(true);
    setError("");
    try {
      const rows = await apiRootRequest(API_PATHS.admin.factories);
      setFactories(rows);
      return rows;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load factories";
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFactories();
  }, []);

  const filtered = useMemo(
    () =>
      factories.filter((factory) =>
        [factory.name, factory.code, factory.adminEmail, factory.subscriptionPlan, factory.subscriptionStatus]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [factories, query]
  );

  return (
    <SuperadminAccess>
      <SuperadminShell title="Factories">
        {/* Header Section */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] transition-colors duration-300 text-sky-700/80 dark:text-sky-300/80">
              Factory management
            </p>
            <h2 className="mt-2 text-2xl font-semibold transition-colors duration-300 text-slate-900 dark:text-white">
              Factories and users
            </h2>
            <p className="mt-2 max-w-2xl text-sm transition-colors duration-300 text-slate-600 dark:text-slate-300">
              Select a factory to see its admin and team members, then switch between factories
              without leaving the page.
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300 text-slate-500 dark:text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search factories by name, code, plan or status"
              className="pl-9 transition-colors duration-300 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-4 transition-colors duration-300 border-red-200 bg-red-50/70 text-red-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-white">
            <CardContent className="p-4 text-sm">{error}</CardContent>
          </Card>
        )}

        {/* Main Grid */}
        <div className="grid gap-6">
          {/* Factory List Table */}
          <Card className="rounded-2xl border transition-all duration-300 border-slate-200 bg-white/95 text-slate-900 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] hover:border-slate-300 hover:shadow-[0_15px_35px_-18px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-950/75 dark:text-white dark:shadow-2xl dark:shadow-slate-950/25 dark:hover:border-white/20">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-4 py-3 transition-colors duration-300 border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="text-base font-semibold transition-colors duration-300 text-slate-900 dark:text-white">
                    Factory list
                  </h3>
                  <p className="transition-colors duration-300 text-slate-500 dark:text-slate-400">
                    {filtered.length} factories found
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="transition-all duration-300 border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  onClick={() => void loadFactories()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide transition-colors duration-300 border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-300">
                      <th className="px-4 py-3 font-medium">Factory</th>
                      <th className="px-4 py-3 font-medium">Admin</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((factory) => {
                      return (
                        <tr
                          key={factory.id}
                          className="cursor-pointer border-b transition-colors duration-200 last:border-0 border-slate-100 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                          onClick={() => navigate({ to: `/superadmin/factories/${factory.id}` })}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-300 bg-sky-100 text-sky-600 dark:bg-white/10 dark:text-sky-300">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium transition-colors duration-300 text-slate-900 dark:text-white">
                                  {factory.name}
                                </p>
                                <p className="transition-colors duration-300 text-slate-500 dark:text-slate-400">{factory.code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 transition-colors duration-300 text-slate-600 dark:text-slate-300">
                            {factory.adminEmail || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={factory.status === "disabled" ? "destructive" : "secondary"}
                              className="transition-colors duration-300 data-[state=secondary]:bg-slate-200 data-[state=secondary]:text-slate-700"
                            >
                              {factory.status || "active"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium transition-colors duration-300 text-slate-900 dark:text-white">
                              {factory.subscriptionPlan || "trial"}
                            </div>
                            <div className="transition-colors duration-300 text-slate-500 dark:text-slate-400">
                              {factory.subscriptionStatus || "trial"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="transition-all duration-300 border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate({ to: `/superadmin/factories/${factory.id}` });
                                }}
                              >
                                View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center transition-colors duration-300 text-slate-500 dark:text-slate-300">
                          No factories found.
                        </td>
                      </tr>
                    )}
                    {loading && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center transition-colors duration-300 text-slate-500 dark:text-slate-300">
                          Loading factories...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </SuperadminShell>
    </SuperadminAccess>
  );
}
