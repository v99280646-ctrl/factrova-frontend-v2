"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { PaginationControls } from "@/components/pagination-controls.js";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Check, Trash2, MoreVertical, Edit, Eye } from "lucide-react";
import { StatusBadge } from "@/components/status/status-badge.js";
import { toast } from "sonner";
import { api, apiRequest } from "@/lib/api";
import { canPageAction } from "@/lib/auth";
import { formatDateTimeCompact } from "@/lib/date-format";
import CreateProjectDialog from "./createProjectDialog";
import ProjectEditDialog from "./projectEditDialog";
import ProjectPreviewSheet from "./projectPreviewSheet";

// Main Component
export function Projects() {
  const canAdd = canPageAction("projects", "add");
  const canEdit = canPageAction("projects", "edit");
  const canDelete = canPageAction("projects", "delete");
  const canUpdate = canPageAction("projects", "update");

  const [projects, setProjects] = useState([]);
  const [projectBackendIds, setProjectBackendIds] = useState({});
  const [assignedProjects, setAssignedProjects] = useState({});
  const [assignmentLoading, setAssignmentLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [previewProject, setPreviewProject] = useState(null);
  const [editProject, setEditProject] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [projectAction, setProjectAction] = useState("view");
  const [loginRole, setLoginRole] = useState("admin");
  const [refreshToken, setRefreshToken] = useState(0);

  const employeeMode = loginRole === "employee";

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesFilter = filterStatus === "all" || p.status === filterStatus;
      const matchesSearch = [p.name, p.customer, p.id]
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [projects, filterStatus, searchQuery]);

  // Load role from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem("factrova-login-role");
    setLoginRole(storedRole === "employee" || storedRole === "staff" ? "employee" : "admin");
  }, []);

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      const data = await api.list("projects", {
        page,
        limit: 20,
        search: searchQuery.trim() || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      });
      const rows = Array.isArray(data) ? data : (data?.items ?? []);
      const projectList = rows.map((row) => ({
        id: row.code,
        name: row.name,
        customer: row.customerName,
        status: row.status,
        progress: row.progress,
        delivery: row.delivery ?? "TBD",
        amount: Number(row.amount),
      }));
      setProjects(projectList);
      setProjectBackendIds(Object.fromEntries(rows.map((row) => [row.code, row.id])));
      setAssignedProjects(
        Object.fromEntries(rows.map((row) => [row.code, Boolean(row.assignedToMe)])),
      );
      setPagination(
        Array.isArray(data)
          ? { page, limit: 20, total: rows.length, totalPages: 1, hasNext: false, hasPrev: false }
          : (data?.pagination ?? {
              page,
              limit: 20,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load projects");
    }
  }, [page, searchQuery, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadProjects, refreshToken]);

  // Project actions
  const openProjectAction = async (project, action) => {
    if (action === "view") {
      setPreviewProject({ ...project });
      return;
    }

    const backendId = projectBackendIds[project.id];
    if (!backendId) {
      toast.error("Project backend id missing");
      return;
    }

    setEditLoading(true);
    try {
      const detail = await api.get("projects", backendId);
      setEditProject(detail);
      setProjectAction(action);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load project");
    } finally {
      setEditLoading(false);
    }
  };

  const toggleMyProject = async (project) => {
    const backendId = projectBackendIds[project.id];
    if (!backendId) {
      toast.error("Project backend id missing");
      return;
    }

    const assigned = Boolean(assignedProjects[project.id]);
    setAssignmentLoading(project.id);
    try {
      await apiRequest(`/projects/${backendId}/assign-self`, {
        method: assigned ? "DELETE" : "POST",
      });
      setAssignedProjects((current) => ({ ...current, [project.id]: !assigned }));
      toast.success(assigned ? "Project removed from My Projects" : "Project added to My Projects");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update My Projects");
    } finally {
      setAssignmentLoading(null);
    }
  };

  const deleteProject = async (project) => {
    const backendId = projectBackendIds[project.id];
    if (backendId) {
      try {
        await api.remove("projects", backendId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete project");
        return;
      }
    }
    setProjects((items) => items.filter((item) => item.id !== project.id));
    toast.success("Project deleted");
    setRefreshToken((value) => value + 1);
  };

  const addProject = (project, backendId) => {
    setProjects((items) => [project, ...items]);
    if (backendId) {
      setProjectBackendIds((ids) => ({ ...ids, [project.id]: backendId }));
    }
    setRefreshToken((value) => value + 1);
  };

  const saveProject = async (project) => {
    const backendId = project?.backendId || projectBackendIds[project?.id] || project?.id;
    if (!backendId) {
      throw new Error("Project backend id missing");
    }

    const payload = {
      code: project.code || undefined,
      name: project.name,
      customerName: project.customerName,
      customerId: project.customerId ?? null,
      status: project.status,
      progress: Number(project.progress ?? 0),
      delivery: project.delivery ? project.delivery : null,
      subtotal: Number(project.subtotal ?? project.amount ?? 0),
      taxType: project.taxType || "percent",
      taxValue: Number(project.taxValue ?? 0),
      taxAmount: Number(project.taxAmount ?? 0),
      discountType: project.discountType || "amount",
      discountValue: Number(project.discountValue ?? 0),
      discountAmount: Number(project.discountAmount ?? 0),
      grandTotal: Number(project.grandTotal ?? project.amount ?? 0),
      amount: Number(project.grandTotal ?? project.amount ?? 0),
      notes: project.notes ?? "",
      workType: project.workType || "own",
      materials: (project.materials ?? []).map((material) => ({
        id: material.id,
        source: material.source === "inventory" ? "inventory" : "new-stock",
        stockItemId: material.stockId ?? null,
        materialName: material.materialName || material.type || material.materialType || "",
        materialType: material.materialType || material.type || "MDF",
        thickness: material.thickness || "1mm",
        quantity: Number(material.quantity ?? material.sheets ?? 0),
        unit: material.unit || "sheets",
      })),
      services: (project.services ?? []).map((service) => ({
        id: service.id,
        serviceId: service.serviceId ?? null,
        serviceName: service.serviceName || service.name || "",
        employeeRole: service.employeeRole || "",
        unit: service.unit || "sheet",
        quantity: Number(service.usage ?? service.quantity ?? 1),
        rate: Number(service.rate ?? service.price ?? 0),
        total: Number(service.amount ?? service.total ?? (Number(service.usage ?? service.quantity ?? 1) * Number(service.price ?? service.rate ?? 0))),
      })),
      workflowStages: (project.workflowStages ?? []).map((stage) => ({
        id: stage.id,
        name: stage.name,
        completed: Number(stage.completed ?? 0),
        total: Number(stage.total ?? 0),
        sortOrder: Number(stage.sortOrder ?? 0),
        materials: stage.materials ?? [],
      })),
    };

    const updated = await api.update("projects", backendId, payload);
    const normalizedProject = {
      id: updated.id || updated.code || project.id,
      backendId: updated.id || backendId,
      name: updated.name,
      customer: updated.customerName,
      status: updated.status,
      progress: updated.progress,
      delivery: updated.delivery ?? "TBD",
      subtotal: Number(updated.subtotal ?? updated.amount ?? 0),
      taxType: updated.taxType ?? "percent",
      taxValue: Number(updated.taxValue ?? 0),
      taxAmount: Number(updated.taxAmount ?? 0),
      discountType: updated.discountType ?? "amount",
      discountValue: Number(updated.discountValue ?? 0),
      discountAmount: Number(updated.discountAmount ?? 0),
      grandTotal: Number(updated.grandTotal ?? updated.amount ?? 0),
      amount: Number(updated.grandTotal ?? updated.amount ?? 0),
    };

    setProjects((items) =>
      items.map((item) =>
        item.id === normalizedProject.id || item.id === project.id
          ? { ...item, ...normalizedProject }
          : item,
      ),
    );
    setProjectBackendIds((ids) => ({
      ...ids,
      [normalizedProject.id]: backendId,
      [project.id]: backendId,
    }));
    setEditProject(null);
    setRefreshToken((value) => value + 1);
    toast.success("Project updated");
    return updated;
  };

  return (
    <DashboardLayout title="Projects">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setPage(1);
              setSearchQuery(e.target.value);
            }}
            placeholder="Search projects..."
            className="pl-9"
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(value) => {
            setPage(1);
            setFilterStatus(value);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="hold">On hold</SelectItem>
          </SelectContent>
        </Select>
        {!employeeMode && canAdd && (
          <div className="ml-auto">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Project
            </Button>
          </div>
        )}
      </div>

      {/* Projects Table */}
      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.customer}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(Math.max(p.progress, 0), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Number(p.progress.toFixed(2))}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTimeCompact(p.delivery)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {employeeMode ? (
                        <Button
                          size="sm"
                          variant={assignedProjects[p.id] ? "outline" : "default"}
                          disabled={assignmentLoading === p.id}
                          onClick={() => toggleMyProject(p)}
                        >
                          {assignedProjects[p.id] ? (
                            <>
                              <Check className="mr-1 h-4 w-4" />
                              Remove
                            </>
                          ) : (
                            <>
                              <Plus className="mr-1 h-4 w-4" />
                              Add to My Projects
                            </>
                          )}
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Project actions for ${p.name}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => openProjectAction(p, "view")}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            {canEdit && canUpdate && (
                              <DropdownMenuItem onClick={() => openProjectAction(p, "update")}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteProject(p)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No projects match your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="mt-4">
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          label="projects"
          loading={false}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => current + 1)}
        />
      </div>

      {/* Modals and Dialogs */}
      {!employeeMode && (
        <>
          <CreateProjectDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            onCreate={addProject}
          />
          <ProjectPreviewSheet
            project={previewProject}
            backendId={previewProject ? projectBackendIds[previewProject.id] : undefined}
            onClose={() => setPreviewProject(null)}
          />
          <ProjectEditDialog
            action={projectAction}
            project={editProject}
            loading={editLoading}
            onProjectChange={setEditProject}
            onClose={() => setEditProject(null)}
            onSave={saveProject}
          />
        </>
      )}
    </DashboardLayout>
  );
}
