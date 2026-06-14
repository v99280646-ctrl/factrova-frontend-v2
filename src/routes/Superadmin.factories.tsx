import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Search } from "lucide-react";
import { toast } from "sonner";
import { apiRootRequest } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import { SuperadminShell } from "@/components/superadmin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API_PATHS } from "@/lib/api-paths";

export const Route = createFileRoute("/Superadmin/factories")({
  head: () => ({ meta: [{ title: "Factories - Factrova Super Admin" }] }),
  component: SuperAdminFactories,
});

type FactoryRow = {
  id: string;
  name: string;
  code: string;
  adminEmail?: string;
  status?: "active" | "disabled";
  subscriptionStatus?: "trial" | "active" | "past_due" | "cancelled";
  subscriptionPlan?: string;
  memberCount?: number;
  paymentCount?: number;
};

type FactoryDetail = {
  factory: {
    id: string;
    name: string;
    code: string;
    location?: string;
    status?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
  };
  admin: null | {
    fullName: string;
    role: string;
    phone?: string;
    email: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  employees: Array<{
    fullName: string;
    role: string;
    loginDetails: {
      email: string;
      lastLoginAt?: string | null;
      active: boolean;
    };
  }>;
  details: {
    companyName: string;
    gstin?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
    projectCount: number;
  };
};

function SuperAdminFactories() {
  const navigate = useNavigate();
  const [factories, setFactories] = useState<FactoryRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState<FactoryDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    const session = getAuthSession();
    if (!session?.token) {
      navigate({ to: "/", replace: true });
      return;
    }

    setLoading(true);
    apiRootRequest<FactoryRow[]>(API_PATHS.admin.factories)
      .then(setFactories)
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unable to load factories";
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const toggleFactory = async (factory: FactoryRow) => {
    const nextStatus = factory.status === "disabled" ? "active" : "disabled";
    try {
      await apiRootRequest(API_PATHS.factories.root(factory.id), {
        method: "PATCH",
        body: { status: nextStatus, isActive: nextStatus === "active" },
      });
      setFactories((current) =>
        current.map((item) => (item.id === factory.id ? { ...item, status: nextStatus } : item)),
      );
      toast.success(nextStatus === "active" ? "Factory enabled" : "Factory disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update factory");
    }
  };

  const openFactoryDetails = async (factory: FactoryRow) => {
    setDetailsOpen(true);
    setDetailsError("");
    setDetailsLoading(true);
    setSelectedFactory(null);
    try {
      const detail = await apiRootRequest<FactoryDetail>(API_PATHS.factories.root(factory.id));
      setSelectedFactory(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load factory details";
      setDetailsError(message);
      toast.error(message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filtered = factories.filter((factory) =>
    [
      factory.name,
      factory.code,
      factory.adminEmail,
      factory.subscriptionPlan,
      factory.subscriptionStatus,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <SuperadminShell title="Factories">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Factories</h2>
          <p className="text-sm text-slate-300">Manage factory access and subscription state.</p>
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search factories"
            className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      <Card className="border-white/10 bg-slate-950/70 text-white">
        <CardContent className="p-0">
          {error ? (
            <div className="border-b border-white/10 px-4 py-6 text-center text-sm text-slate-300">
              {error}
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-300">
                  <th className="px-4 py-3 font-medium">Factory</th>
                  <th className="px-4 py-3 font-medium">Admin</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((factory) => (
                  <tr
                    key={factory.id}
                    className="cursor-pointer border-b border-white/10 last:border-0 hover:bg-white/5"
                    onClick={() => openFactoryDetails(factory)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-sky-300">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{factory.name}</p>
                          <p className="text-xs text-slate-400">{factory.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{factory.adminEmail || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={factory.status === "disabled" ? "destructive" : "secondary"}>
                        {factory.status || "active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{factory.subscriptionPlan || "trial"}</div>
                      <div className="text-xs text-slate-400">
                        {factory.subscriptionStatus || "trial"}
                      </div>
                      {typeof factory.memberCount === "number" ? (
                        <div className="mt-1 text-xs text-slate-500">
                          {factory.memberCount} members
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                          onClick={(event) => {
                            event.stopPropagation();
                            openFactoryDetails(factory);
                          }}
                        >
                          View details
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFactory(factory);
                          }}
                        >
                          {factory.status === "disabled" ? "Enable" : "Disable"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-300">
                      No factories found.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-300">
                      Loading factories...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsOpen(false);
            setSelectedFactory(null);
            setDetailsError("");
            setDetailsLoading(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Factory Details</DialogTitle>
          </DialogHeader>

          {detailsError ? (
            <p className="text-sm text-red-500">{detailsError}</p>
          ) : detailsLoading ? (
            <p className="text-sm text-slate-500">Loading factory details...</p>
          ) : selectedFactory ? (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="space-y-2 p-4">
                    <h3 className="font-semibold">Company</h3>
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedFactory.details.companyName || "-"}
                    </p>
                    <p>
                      <span className="font-medium">GSTIN:</span>{" "}
                      {selectedFactory.details.gstin || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {selectedFactory.details.phone || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedFactory.details.email || "-"}
                    </p>
                    <p>
                      <span className="font-medium">City:</span>{" "}
                      {selectedFactory.details.city || "-"}
                    </p>
                    <p>
                      <span className="font-medium">State:</span>{" "}
                      {selectedFactory.details.state || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Pincode:</span>{" "}
                      {selectedFactory.details.pincode || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Address:</span>{" "}
                      {selectedFactory.details.address || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Projects:</span>{" "}
                      {selectedFactory.details.projectCount}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-2 p-4">
                    <h3 className="font-semibold">Admin Account</h3>
                    <p>
                      <span className="font-medium">Full name:</span>{" "}
                      {selectedFactory.admin?.fullName || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Role:</span>{" "}
                      {selectedFactory.admin?.role || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {selectedFactory.admin?.phone || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedFactory.admin?.email || "-"}
                    </p>
                    <p>
                      <span className="font-medium">City:</span>{" "}
                      {selectedFactory.admin?.city || "-"}
                    </p>
                    <p>
                      <span className="font-medium">State:</span>{" "}
                      {selectedFactory.admin?.state || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Pincode:</span>{" "}
                      {selectedFactory.admin?.pincode || "-"}
                    </p>
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold">Employees</h3>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">Full Name</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Last Login</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFactory.employees.length ? (
                        selectedFactory.employees.map((employee) => (
                          <tr
                            key={`${employee.loginDetails.email}-${employee.role}`}
                            className="border-t border-white/10"
                          >
                            <td className="px-4 py-3">{employee.fullName}</td>
                            <td className="px-4 py-3">{employee.role}</td>
                            <td className="px-4 py-3">{employee.loginDetails.email}</td>
                            <td className="px-4 py-3">
                              {employee.loginDetails.lastLoginAt
                                ? new Date(employee.loginDetails.lastLoginAt).toLocaleString()
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={employee.loginDetails.active ? "secondary" : "destructive"}
                              >
                                {employee.loginDetails.active ? "Active" : "Disabled"}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                            No employees found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </SuperadminShell>
  );
}
