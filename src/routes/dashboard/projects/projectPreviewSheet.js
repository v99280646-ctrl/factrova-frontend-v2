"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Trash2,
  CalendarDays,
  ChartLine,
  CircleDollarSign,
  Mail,
  MapPin,
  Package,
  Phone,
  UserRound,
  UsersRound,
} from "lucide-react";
import { StatusBadge } from "@/components/status/status-badge.js";
import { cn } from "@/lib/utils";
import { api, apiRequest } from "@/lib/api";
import { formatDateTimeCompact } from "@/lib/date-format";
import { findWasteAssignment } from "@/lib/waste-assignment-store";
import { toast } from "sonner";

function mapProjectWasteMaterial(row) {
  const stored = findWasteAssignment({ backendId: row.id, code: row.code });
  return {
    id: row.code,
    backendId: row.id,
    material: row.material,
    projectId: row.projectId ?? row.project_id ?? stored?.projectId ?? null,
    projectName: row.projectName || row.project_name || stored?.projectName || "",
    usedForProjectId:
      row.usedForProjectId ?? row.used_for_project_id ?? stored?.usedForProjectId ?? null,
    usedForProjectName:
      row.usedForProjectName || row.used_for_project_name || stored?.usedForProjectName || "",
    size: row.size ?? "",
    note: row.note ?? "",
  };
}

function serviceProgressColor(value) {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 50) return "bg-sky-500";
  return "bg-amber-500";
}

// Helper Components
function ProgressLine({ value, className }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all duration-500", className || "bg-primary")}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

function PreviewInfo({ icon, text }) {
  return (
    <p className="flex items-start gap-2 text-muted-foreground">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </p>
  );
}

function formatPhoneDisplay(countryCode, phone, fallback = "-") {
  const code = countryCode?.trim();
  const number = phone?.trim();
  if (code && number) return `${code} ${number}`;
  return number || code || fallback;
}

function getStaffStatusClasses(status) {
  const normalized = String(status || "Not started").toLowerCase();
  if (normalized === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "in progress") return "border-blue-200 bg-blue-50 text-blue-700";
  if (normalized === "on hold") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getMaterialStatusClasses(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "sufficient") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "insufficient (partial)") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

const ProjectPreviewSheet = ({ project, backendId, onClose }) => {
  const [projectDetails, setProjectDetails] = useState(null);
  const [detailMaterials, setDetailMaterials] = useState([]);
  const [detailServices, setDetailServices] = useState([]);
  const [detailStages, setDetailStages] = useState([]);
  const [createdWaste, setCreatedWaste] = useState([]);
  const [usedWaste, setUsedWaste] = useState([]);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailAssignedStaff, setDetailAssignedStaff] = useState([]);
  const [createdDate, setCreatedDate] = useState("");
  const [savingStatusUserId, setSavingStatusUserId] = useState("");

  const progressTone =
    project?.progress && project.progress >= 70
      ? "bg-emerald-500"
      : project?.progress && project.progress >= 40
        ? "bg-sky-500"
        : "bg-amber-500";

  useEffect(() => {
    if (!backendId) {
      setDetailMaterials([]);
      setDetailServices([]);
      setDetailStages([]);
      setCreatedWaste([]);
      setUsedWaste([]);
      setDetailCustomer(null);
      setDetailAssignedStaff([]);
      setCreatedDate("");
      return;
    }

    let active = true;

    const loadDetails = async () => {
      try {
        const [detail, stockRows, wasteRows] = await Promise.all([
          api.get("projects", backendId),
          api.list("stock"),
          api.list("waste"),
        ]);

        if (!active) return;

        setProjectDetails(detail);
        const summaryRows = Array.isArray(detail.materialStockSummary) ? detail.materialStockSummary : [];
        if (summaryRows.length > 0) {
          setDetailMaterials(
            summaryRows.map((row) => ({
              material: row.material || "Material",
              unit: row.unit || "units",
              required: Number(row.currentProjectRequired ?? 0),
              used: Number(row.totalUsed ?? 0),
              inStock: Number(row.availableRemaining ?? 0),
              status: row.status || "Insufficient",
            })),
          );
        } else {
          const stockById = new Map((stockRows ?? []).map((row) => [row.id, row]));
          const findStock = (material) => {
            if (material.stockItemId && stockById.has(material.stockItemId)) {
              return stockById.get(material.stockItemId);
            }
            return (stockRows ?? []).find((row) => {
              const typeMatches =
                row.material.toLowerCase() === material.materialName.toLowerCase() ||
                row.type.toLowerCase() === material.materialType.toLowerCase();
              const thicknessMatches =
                !material.thickness ||
                !row.thickness ||
                row.thickness.toLowerCase() === material.thickness.toLowerCase();
              return typeMatches && thicknessMatches;
            });
          };

          setDetailMaterials(
            (detail.materials ?? []).map((row) => {
              const stockItem = findStock(row);
              return {
                material: row.materialName || row.materialType,
                unit: stockItem?.unit ?? row.unit,
                required: Number(row.quantity),
                used: 0,
                inStock: Number(stockItem?.quantity ?? 0),
                status: Number(stockItem?.quantity ?? 0) >= Number(row.quantity)
                  ? "Sufficient"
                  : Number(stockItem?.quantity ?? 0) > 0
                    ? "Insufficient (Partial)"
                    : "Insufficient",
              };
            }),
          );
        }

        setDetailServices(
          (detail.services ?? []).map((row) => ({
            service: row.serviceName || row.name || "Service",
            employeeRole: row.employeeRole || "",
            price: Number(row.rate ?? row.price ?? 0),
            usage: Number(row.usage ?? row.quantity ?? 1),
            amount: Number(
              row.amount ??
                row.total ??
                Number(row.usage ?? row.quantity ?? 1) * Number(row.rate ?? row.price ?? 0),
            ),
            unit: row.unit || "unit",
          })),
        );

        setDetailStages(
          (detail.workflowStages ?? []).map((row) => ({
            name: row.name,
            completed: Number(row.completed),
            total: Number(row.total) || 1,
          })),
        );

        setDetailCustomer(detail.customerDetails ?? null);
        setDetailAssignedStaff(detail.assignedStaff ?? []);
        setCreatedDate(detail.createdAt ?? "");

        const matchesCurrentProject = (projectId, projectName) =>
          projectId === backendId || (projectName ?? "").startsWith(`${detail.code} -`);

        const wasteMaterials = (wasteRows ?? []).map(mapProjectWasteMaterial);
        setCreatedWaste(
          wasteMaterials.filter((row) => matchesCurrentProject(row.projectId, row.projectName)),
        );
        setUsedWaste(
          wasteMaterials.filter((row) =>
            matchesCurrentProject(row.usedForProjectId, row.usedForProjectName),
          ),
        );
      } catch (error) {
        // Silent fail for preview
      }
    };

    loadDetails();
    return () => {
      active = false;
    };
  }, [backendId]);

  if (!project) return null;

  const customerName = detailCustomer?.company || project.customer || "";
  const customerInitials = customerName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  const customerAddress = [
    detailCustomer?.address,
    detailCustomer?.district,
    detailCustomer?.state,
    detailCustomer?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const fallbackSubtotal = detailServices.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const subtotal = Number(projectDetails?.subtotal ?? project?.subtotal ?? fallbackSubtotal);
  const taxType = projectDetails?.taxType || project?.taxType || "percent";
  const taxValue = Number(projectDetails?.taxValue ?? project?.taxValue ?? 0);
  const discountType = projectDetails?.discountType || project?.discountType || "amount";
  const discountValue = Number(projectDetails?.discountValue ?? project?.discountValue ?? 0);
  const discountAmount = Number(
    projectDetails?.discountAmount ??
      project?.discountAmount ??
      (discountType === "percent" ? (subtotal * discountValue) / 100 : discountValue),
  );
  const discountedBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = Number(
    projectDetails?.taxAmount ??
      project?.taxAmount ??
      (taxType === "percent" ? (discountedBase * taxValue) / 100 : taxValue),
  );
  const grandTotal = Number(
    projectDetails?.grandTotal ??
      project?.grandTotal ??
      Math.max(0, discountedBase + taxAmount),
  );
  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const updateAssignedStaffStatus = async (userId, status) => {
    if (!backendId || !userId) return;
    setSavingStatusUserId(userId);
    try {
      const updated = await apiRequest(`/projects/${backendId}/assigned-staff/${userId}/status`, {
        method: "PATCH",
        body: { status },
      });
      setProjectDetails(updated);
      setDetailAssignedStaff(updated.assignedStaff ?? []);
      toast.success("Staff status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update staff status");
    } finally {
      setSavingStatusUserId("");
    }
  };

  return (
    <Sheet open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-4xl">
        <SheetHeader className="sr-only">
          <SheetTitle>Project preview</SheetTitle>
        </SheetHeader>
        <div className="min-h-full bg-background p-5 sm:p-7">
          {/* Header */}
          <div className="mb-5 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-normal text-foreground">
                  {project.name}
                </h2>
                <StatusBadge status={project.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.id} - Created{" "}
                {createdDate ? formatDateTimeCompact(createdDate) : "Not available"} - Delivery{" "}
                {formatDateTimeCompact(project.delivery)}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Order amount
              </p>
              <p className="text-3xl font-bold text-foreground">
                ₹{formatMoney(projectDetails?.grandTotal ?? project.grandTotal ?? project.amount ?? 0)}
              </p>
            </div>
          </div>

          {/* Customer Details */}
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <UserRound className="h-4 w-4" />
              Customer details
            </h3>
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {customerInitials || "--"}
              </div>
              <div>
                <p className="font-semibold">{customerName || "Customer not linked"}</p>
                <p className="text-xs text-muted-foreground">
                  {detailCustomer?.contact || "Project customer"}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <PreviewInfo
                icon={<Phone className="h-4 w-4" />}
                text={formatPhoneDisplay(
                  detailCustomer?.countryCode,
                  detailCustomer?.phone,
                  "Phone not added",
                )}
              />
              <PreviewInfo
                icon={<Mail className="h-4 w-4" />}
                text={detailCustomer?.email || "Email not added"}
              />
              <PreviewInfo
                icon={<MapPin className="h-4 w-4" />}
                text={customerAddress || "Address not added"}
              />
            </div>
          </section>

          {/* Progress Cards */}
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PreviewCard
              icon={<ChartLine className="h-4 w-4" />}
              label="Overall progress"
              value={`${Number(project.progress.toFixed(2))}%`}
              helper="Current production status"
            >
              <ProgressLine value={project.progress} className={progressTone} />
            </PreviewCard>
            <PreviewCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Created"
              value={formatDateTimeCompact(createdDate)}
              helper="Start of production"
            />
            <PreviewCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Delivery"
              value={formatDateTimeCompact(project.delivery)}
              helper="Days remaining"
            />
          </div>

          {/* Production Progress */}
          <section className="mt-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <CircleDollarSign className="h-4 w-4" />
              Production progress
            </h3>
            <div className="space-y-4">
              {detailStages.length === 0 && (
                <p className="text-sm text-muted-foreground">No production stages added.</p>
              )}
              {detailStages.map((stage) => {
                const percent = Math.min(100, Math.round((stage.completed / stage.total) * 100));
                return (
                  <div key={stage.name}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{stage.name}</span>
                        <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
                          In progress
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">
                        {Number(stage.completed.toFixed(2))}/{Number(stage.total.toFixed(2))}{" "}
                        {percent}%
                      </span>
                    </div>
                    <ProgressLine value={percent} className={serviceProgressColor(percent)} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Material Stock */}
          <section className="mt-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4" />
              Material stock
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Material</th>
                    <th className="px-2 py-2 text-right font-medium">Required</th>
                    <th className="px-2 py-2 text-right font-medium">Used</th>
                    <th className="px-2 py-2 text-right font-medium">In stock</th>
                    <th className="px-2 py-2 font-medium">Unit</th>
                    <th className="px-2 py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailMaterials.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-2 py-6 text-center text-sm text-muted-foreground"
                      >
                        No materials added.
                      </td>
                    </tr>
                  )}
                  {detailMaterials.map((row) => {
                    return (
                      <tr
                        key={`${row.material}-${row.unit || "units"}-${row.required}`}
                        className="border-b border-border/70 last:border-0"
                      >
                        <td className="px-2 py-2 font-medium">{row.material}</td>
                        <td className="px-2 py-2 text-right">{Number(row.required.toFixed(2))}</td>
                        <td className="px-2 py-2 text-right">{Number((row.used ?? 0).toFixed(2))}</td>
                        <td className="px-2 py-2 text-right">{Number(row.inStock.toFixed(2))}</td>
                        <td className="px-2 py-2 text-muted-foreground">{row.unit || "units"}</td>
                        <td className="px-2 py-2 text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md",
                              getMaterialStatusClasses(row.status),
                            )}
                          >
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <CircleDollarSign className="h-4 w-4" />
              Services
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Service</th>
                    <th className="px-2 py-2 font-medium">Price</th>
                    <th className="px-2 py-2 font-medium">Usage</th>
                    <th className="px-2 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {detailServices.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-2 py-6 text-center text-sm text-muted-foreground"
                      >
                        No services added.
                      </td>
                    </tr>
                  )}
                  {detailServices.map((row) => (
                    <tr
                      key={`${row.service}-${row.employeeRole}`}
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{row.service}</span>
                          {row.employeeRole ? (
                            <Badge variant="outline" className="text-[10px]">
                              {row.employeeRole}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        ₹{row.price.toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{row.usage}</td>
                      <td className="px-2 py-2 text-right font-medium">
                        ₹{row.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                  {/* Subtotal Row */}
                  <tr className="border-b border-border/70 last:border-0">
                    <td colSpan={3} className="px-2 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">Subtotal</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right font-medium">
                      ₹{projectDetails?.subtotal?.toLocaleString("en-IN") || 0}
                    </td>
                  </tr>

                  {/* Discount Row */}
                  {projectDetails?.discountAmount > 0 && (
                    <tr className="border-b border-border/70 last:border-0">
                      <td colSpan={3} className="px-2 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            Discount (
                            {projectDetails?.discountType === "percent"
                              ? `${projectDetails?.discountValue}%`
                              : "₹"}
                            )
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-green-600">
                        -₹{projectDetails?.discountAmount?.toLocaleString("en-IN") || 0}
                      </td>
                    </tr>
                  )}

                  {/* Tax Row */}
                  {projectDetails?.taxAmount > 0 && (
                    <tr className="border-b border-border/70 last:border-0">
                      <td colSpan={3} className="px-2 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            Tax (
                            {projectDetails?.taxType === "percent"
                              ? `${projectDetails?.taxValue}%`
                              : "₹"}
                            )
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-amber-600">
                        +₹{projectDetails?.taxAmount?.toLocaleString("en-IN") || 0}
                      </td>
                    </tr>
                  )}

                  {/* Grand Total Row */}
                  <tr className="border-t-2 border-primary/30 bg-primary/5">
                    <td colSpan={3} className="px-2 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-base">Grand Total</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-bold text-primary text-base">
                      ₹{projectDetails?.grandTotal?.toLocaleString("en-IN") || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Waste Materials */}
          <section className="mt-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Trash2 className="h-4 w-4" />
              Waste Material stock
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <WasteMaterialSection
                emptyText="No waste materials created from this project."
                rows={createdWaste}
                title="Created Waste"
              />
              <WasteMaterialSection
                emptyText="No waste materials used for this project."
                rows={usedWaste}
                title="Used Waste"
              />
            </div>
          </section>

          {/* Assigned Employees */}
          <section className="mt-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <UsersRound className="h-4 w-4" />
                Assigned employees
              </h3>
              <Badge variant="secondary">{detailAssignedStaff.length} members</Badge>
            </div>
            {detailAssignedStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees assigned.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {detailAssignedStaff.map((staff) => (
                  <div
                    key={`${staff.id || staff.userId || staff.name}-${staff.role || ""}`}
                    className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{staff.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {staff.email || "Email not added"}
                        </p>
                        {staff.updatedAt ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Updated {formatDateTimeCompact(staff.updatedAt)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline">{staff.role || "Staff"}</Badge>
                        <Badge variant="outline" className={cn("border", getStaffStatusClasses(staff.status))}>
                          {staff.status || "Not started"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={staff.status || "Not started"}
                        onChange={(event) =>
                          void updateAssignedStaffStatus(staff.id || staff.userId, event.target.value)
                        }
                        className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                        disabled={savingStatusUserId === (staff.id || staff.userId)}
                      >
                        <option value="Not started">Not started</option>
                        <option value="In progress">In progress</option>
                        <option value="On hold">On hold</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

function PreviewCard({ icon, label, value, helper, children }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {children && <div className="mt-3">{children}</div>}
      <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
    </section>
  );
}

function WasteMaterialSection({ emptyText, title, rows }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border/80">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
          <h4 className="text-sm font-semibold">{title}</h4>
          <Badge variant="secondary">0 items</Badge>
        </div>
        <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/80">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge variant="secondary">{rows.length} items</Badge>
      </div>
      <div className="overflow-x-auto">
        <div className="md:hidden space-y-2 p-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-md border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.id}</span>
                <span className="text-muted-foreground">{row.material}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Size: {row.size || "-"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Note: {row.note || "-"}</p>
            </div>
          ))}
        </div>
        <table className="hidden w-full text-sm md:table">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Material</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-2 font-medium">{row.id}</td>
                <td className="px-3 py-2">{row.material}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.size || "-"}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectPreviewSheet;
