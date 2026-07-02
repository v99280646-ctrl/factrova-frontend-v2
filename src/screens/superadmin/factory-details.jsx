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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { FactoryNotificationsPanel } from "@/screens/superadmin/factory-notifications-panel.jsx";

const SECTION_DEFS = {
  staff: {
    title: "Staff",
    subtitle: "All factory staff members",
    emptyText: "No staff found for this factory.",
    columns: ["Name", "Email", "Role", "Status"],
  },
  customers: {
    title: "Customers",
    subtitle: "Customer master records",
    emptyText: "No customers found for this factory.",
    columns: ["Name", "Company", "Contact", "Location", "Status"],
  },
  vendors: {
    title: "Vendors",
    subtitle: "Vendor master records",
    emptyText: "No vendors found for this factory.",
    columns: ["Name", "Company", "Contact", "Location", "Status"],
  },
  stocks: {
    title: "Stock",
    subtitle: "Inventory items and quantities",
    emptyText: "No stock items found for this factory.",
    columns: ["Code", "Name", "Material", "Qty", "Unit", "Status"],
  },
  services: {
    title: "Services",
    subtitle: "Configured services",
    emptyText: "No services found for this factory.",
    columns: ["Code", "Name", "Price", "Role", "Status"],
  },
  projects: {
    title: "Projects",
    subtitle: "Factory projects and billing",
    emptyText: "No projects found for this factory.",
    columns: ["Code", "Name", "Customer", "Amount", "Status"],
  },
};

function formatFactoryDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function FactorySectionTable({
  section,
  data,
  loading,
  onSearchChange,
  onRefresh,
  onPrevPage,
  onNextPage,
}) {
  const config = SECTION_DEFS[section];
  const items = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    totalPages: 0,
    hasPrev: false,
    hasNext: false,
    total: 0,
  };

  const renderRow = (item) => {
    switch (section) {
      case "staff":
        return (
          <>
            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
              {item.name || "-"}
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.email || "-"}</td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              {item.employeeRole || "-"}
            </td>
            <td className="px-4 py-3">
              <Badge variant={item.active ? "secondary" : "outline"}>
                {item.active ? "Active" : "Disabled"}
              </Badge>
            </td>
          </>
        );
      case "customers":
      case "vendors":
        return (
          <>
            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
              {item.name || "-"}
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              {item.companyName || "-"}
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              {item.phone || item.email || "-"}
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              {[item.city, item.state].filter(Boolean).join(", ") || "-"}
            </td>
            <td className="px-4 py-3">
              <Badge variant={item.active ? "secondary" : "outline"}>
                {item.active ? "Active" : "Disabled"}
              </Badge>
            </td>
          </>
        );
      case "stocks":
        return (
          <>
            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
              {item.code || "-"}
            </td>
            <td className="px-4 py-3 text-slate-900 dark:text-white">{item.name || "-"}</td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              {item.material || item.type || "-"} {item.thickness ? `(${item.thickness})` : ""}
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.quantity ?? 0}</td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.unit || "-"}</td>
            <td className="px-4 py-3">
              <Badge variant={item.active ? "secondary" : "outline"}>
                {item.active ? "Active" : "Disabled"}
              </Badge>
            </td>
          </>
        );
      case "services":
        return (
          <>
            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
              {item.code || "-"}
            </td>
            <td className="px-4 py-3 text-slate-900 dark:text-white">{item.name || "-"}</td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              ₹{Number(item.price || 0).toLocaleString("en-IN")}
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              {item.employeeRole || "-"}
            </td>
            <td className="px-4 py-3">
              <Badge variant={item.active ? "secondary" : "outline"}>
                {item.active ? "Active" : "Disabled"}
              </Badge>
            </td>
          </>
        );
      case "projects":
        return (
          <>
            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
              {item.code || "-"}
            </td>
            <td className="px-4 py-3 text-slate-900 dark:text-white">{item.name || "-"}</td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              {item.customerName || "-"}
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              ₹{Number(item.amount || 0).toLocaleString("en-IN")}
            </td>
            <td className="px-4 py-3">
              <Badge
                variant={
                  item.status === "completed" || item.status === "delivered"
                    ? "secondary"
                    : item.status === "hold"
                      ? "outline"
                      : "default"
                }
              >
                {item.status === "completed" ? "delivered" : item.status || "-"}
              </Badge>
            </td>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="border-slate-200 dark:border-white/10">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {config.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{config.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Search ${config.title.toLowerCase()}...`}
              onChange={(event) => onSearchChange?.(event.target.value)}
              className="w-full sm:w-72"
            />
            <Button type="button" variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {config.columns.map((column) => (
                  <th key={column} className="px-4 py-3 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={config.columns.length}
                    className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    Loading {config.title.toLowerCase()}...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr
                    key={item.id || item._id}
                    className="border-b last:border-0 dark:border-white/10"
                  >
                    {renderRow(item)}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={config.columns.length}
                    className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    {config.emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {pagination.page || 1} of {pagination.totalPages || 0} · {pagination.total || 0}{" "}
            total
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={!pagination.hasPrev}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={!pagination.hasNext}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FactoryDetailsPage({ factoryId }) {
  const [details, setDetails] = useState(null);
  const [sectionData, setSectionData] = useState({});
  const [sectionLoading, setSectionLoading] = useState({});
  const [sectionSearch, setSectionSearch] = useState({
    staff: "",
    customers: "",
    vendors: "",
    stocks: "",
    services: "",
    projects: "",
  });
  const [sectionPage, setSectionPage] = useState({
    staff: 1,
    customers: 1,
    vendors: 1,
    stocks: 1,
    services: 1,
    projects: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

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
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  };

  const loadSection = async (section, nextPage = sectionPage[section] || 1, searchOverride) => {
    if (!factoryId || !section || section === "overview" || section === "notifications") return;

    setSectionLoading((current) => ({ ...current, [section]: true }));
    try {
      const searchValue = searchOverride ?? sectionSearch[section] ?? "";
      const response = await apiRootRequest(API_PATHS.admin.factorySection(factoryId, section), {
        query: {
          page: nextPage,
          limit: 10,
          search: searchValue || undefined,
        },
      });
      setSectionData((current) => ({ ...current, [section]: response }));
      setSectionPage((current) => ({
        ...current,
        [section]: response?.pagination?.page || nextPage,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to load ${section}`);
    } finally {
      setSectionLoading((current) => ({ ...current, [section]: false }));
    }
  };

  const handleSectionSearchChange = (section, value) => {
    setSectionSearch((current) => ({ ...current, [section]: value }));
    setSectionPage((current) => ({ ...current, [section]: 1 }));
    void loadSection(section, 1, value);
  };

  const handleSectionRefresh = (section) => {
    void loadSection(section, sectionPage[section] || 1);
  };

  const handleSectionPrev = (section) => {
    const currentPage = sectionPage[section] || 1;
    void loadSection(section, Math.max(1, currentPage - 1));
  };

  const handleSectionNext = (section) => {
    const currentPage = sectionPage[section] || 1;
    void loadSection(section, currentPage + 1);
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

  useEffect(() => {
    if (!factoryId) return;
    if (activeTab === "overview" || activeTab === "notifications") return;
    if (sectionData[activeTab]) return;
    void loadSection(activeTab, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, factoryId]);

  const factory = details?.factory ?? null;
  const employees = details?.employees ?? [];
  const adminEmployee = employees.find((employee) => employee.role === "admin") ?? details?.admin;
  const pageTitle = loading ? "Loading..." : (factory?.name ?? "Factory Details");

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
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {factory?.name}
                  </h2>
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

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                <TabsList className="grid w-full grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-8">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="staff">Staff</TabsTrigger>
                  <TabsTrigger value="customers">Customers</TabsTrigger>
                  <TabsTrigger value="vendors">Vendors</TabsTrigger>
                  <TabsTrigger value="stocks">Stocks</TabsTrigger>
                  <TabsTrigger value="services">Services</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Company
                      </p>
                      <p className="mt-1 font-medium text-slate-900 dark:text-white">
                        {details.details?.companyName || factory?.name || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {details.details?.email || "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Project count
                      </p>
                      <p className="mt-1 font-medium text-slate-900 dark:text-white">
                        {details.details?.projectCount || 0}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Subscription: {factory?.subscriptionPlan || "trial"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Admin account
                        </p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-white">
                          {adminEmployee?.fullName || "-"}
                        </p>
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
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                        Users in factory
                      </h4>
                      <div className="flex items-center gap-2 text-sm">
                        <UsersRound className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-slate-500 dark:text-slate-400">
                          {employees.length} total
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {employees.length > 0 ? (
                        employees.map((employee, index) => (
                          <div
                            key={`${index}-${employee.id}`}
                            className="rounded-lg border p-3 dark:border-white/10 dark:bg-slate-900/60"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {employee.fullName}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {employee.loginDetails?.email}
                                </p>
                              </div>
                              <Badge
                                variant={employee.role === "admin" ? "secondary" : "outline"}
                                className="flex-shrink-0 data-[state=secondary]:bg-slate-200 data-[state=secondary]:text-slate-700"
                              >
                                {employee.employeeRole ||
                                  (employee.role === "admin" ? "Admin" : "Team member")}
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span>
                                Status: {employee.loginDetails?.active ? "Active" : "Disabled"}
                              </span>
                              <span>
                                Last login:{" "}
                                {employee.loginDetails?.lastLoginAt
                                  ? new Date(employee.loginDetails.lastLoginAt).toLocaleString()
                                  : "-"}
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
                </TabsContent>

                <TabsContent value="notifications" className="space-y-5">
                  <FactoryNotificationsPanel
                    factoryId={factoryId}
                    factoryName={factory?.name || ""}
                  />
                </TabsContent>

                <TabsContent value="staff" className="space-y-5">
                  <FactorySectionTable
                    section="staff"
                    data={sectionData.staff}
                    loading={sectionLoading.staff}
                    onSearchChange={(value) => handleSectionSearchChange("staff", value)}
                    onRefresh={() => handleSectionRefresh("staff")}
                    onPrevPage={() => handleSectionPrev("staff")}
                    onNextPage={() => handleSectionNext("staff")}
                  />
                </TabsContent>

                <TabsContent value="customers" className="space-y-5">
                  <FactorySectionTable
                    section="customers"
                    data={sectionData.customers}
                    loading={sectionLoading.customers}
                    onSearchChange={(value) => handleSectionSearchChange("customers", value)}
                    onRefresh={() => handleSectionRefresh("customers")}
                    onPrevPage={() => handleSectionPrev("customers")}
                    onNextPage={() => handleSectionNext("customers")}
                  />
                </TabsContent>

                <TabsContent value="vendors" className="space-y-5">
                  <FactorySectionTable
                    section="vendors"
                    data={sectionData.vendors}
                    loading={sectionLoading.vendors}
                    onSearchChange={(value) => handleSectionSearchChange("vendors", value)}
                    onRefresh={() => handleSectionRefresh("vendors")}
                    onPrevPage={() => handleSectionPrev("vendors")}
                    onNextPage={() => handleSectionNext("vendors")}
                  />
                </TabsContent>

                <TabsContent value="stocks" className="space-y-5">
                  <FactorySectionTable
                    section="stocks"
                    data={sectionData.stocks}
                    loading={sectionLoading.stocks}
                    onSearchChange={(value) => handleSectionSearchChange("stocks", value)}
                    onRefresh={() => handleSectionRefresh("stocks")}
                    onPrevPage={() => handleSectionPrev("stocks")}
                    onNextPage={() => handleSectionNext("stocks")}
                  />
                </TabsContent>

                <TabsContent value="services" className="space-y-5">
                  <FactorySectionTable
                    section="services"
                    data={sectionData.services}
                    loading={sectionLoading.services}
                    onSearchChange={(value) => handleSectionSearchChange("services", value)}
                    onRefresh={() => handleSectionRefresh("services")}
                    onPrevPage={() => handleSectionPrev("services")}
                    onNextPage={() => handleSectionNext("services")}
                  />
                </TabsContent>

                <TabsContent value="projects" className="space-y-5">
                  <FactorySectionTable
                    section="projects"
                    data={sectionData.projects}
                    loading={sectionLoading.projects}
                    onSearchChange={(value) => handleSectionSearchChange("projects", value)}
                    onRefresh={() => handleSectionRefresh("projects")}
                    onPrevPage={() => handleSectionPrev("projects")}
                    onNextPage={() => handleSectionNext("projects")}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </SuperadminShell>
    </SuperadminAccess>
  );
}
