import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { SuperadminShell } from "@/components/superadmin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/Superadmin/payments")({
  head: () => ({ meta: [{ title: "Payments - Factrova Super Admin" }] }),
  component: SuperAdminPayments,
});

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

type Summary = {
  recentPayments: Payment[];
};

function SuperAdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    apiRootRequest<Summary>(API_PATHS.admin.dashboardSummary)
      .then((data) => setPayments(data.recentPayments ?? []))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Unable to load payments"),
      );
  }, []);

  return (
    <SuperadminShell title="Payments">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Payments</h2>
        <p className="text-sm text-slate-300">Recent payment records loaded from the backend.</p>
      </div>

      <Card className="border-white/10 bg-slate-950/70 text-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-300">
                  <th className="px-4 py-3 font-medium">Factory</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-white/10 last:border-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-medium">{payment.factoryId?.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {payment.currency} {new Intl.NumberFormat("en-IN").format(Number(payment.amount.toFixed(2)))}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          payment.status === "paid"
                            ? "secondary"
                            : payment.status === "failed"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-300">
                      No payment records found.
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
