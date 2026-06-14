import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { SuperadminShell } from "@/components/superadmin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/Superadmin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions - Factrova Super Admin" }] }),
  component: SuperAdminSubscriptions,
});

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
  recentSubscriptions: Subscription[];
};

function SuperAdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    apiRootRequest<Summary>(API_PATHS.admin.dashboardSummary)
      .then((data) => setSubscriptions(data.recentSubscriptions ?? []))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Unable to load subscriptions"),
      );
  }, []);

  return (
    <SuperadminShell title="Subscriptions">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Subscription control</h2>
        <p className="text-sm text-slate-300">
          Recent subscription records loaded from the backend.
        </p>
      </div>

      <Card className="border-white/10 bg-slate-950/70 text-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-300">
                  <th className="px-4 py-3 font-medium">Factory</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Renews</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/10 last:border-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-medium">{item.factoryId?.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-300">{item.plan || "trial"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status === "past_due" ? "destructive" : "secondary"}>
                        {item.status || "trial"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.currentPeriodEnd
                        ? new Date(item.currentPeriodEnd).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-300">
                      No subscriptions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </SuperadminShell>
  );
}
