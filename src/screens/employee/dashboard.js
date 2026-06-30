"use client";

import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status/status-badge.js";
import { canPageAction } from "@/lib/auth";
import { DEFAULT_MATERIAL_TYPES } from "@/lib/material-types";
import { api, apiRequest } from "@/lib/api";
import { formatDateTimeCompact } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  CheckCircle2,
  FolderKanban,
  Layers3,
  LogOut,
  Package,
  MoreVertical,
  Plus,
  Trash2,
  CircleDollarSign,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

const stageStatusOptions = ["Not started", "In progress", "On hold", "Completed"];

function roleToStage(role) {
  const name = role.toLowerCase();
  if (name.includes("press")) return "Pressing";
  if (name.includes("cut")) return "Cutting";
  if (name.includes("edge")) return "Edge band";
  if (name.includes("bor")) return "Boring";
  if (name.includes("pack") || name.includes("deliver")) return "Packing";
  return "";
}

function projectFromApi(row) {
  return {
    id: row.code,
    backendId: row.id,
    name: row.name,
    customer: row.customerName,
    status: row.status,
    progress: row.progress,
    delivery: row.delivery ?? "TBD",
    amount: Number(row.amount),
    materials: row.materials ?? [],
    workflowStages: row.workflowStages ?? [],
  };
}

function emptyWasteMaterial() {
  return {
    type: "MDF",
    size: "",
    note: "",
  };
}

function mapWasteMaterial(row) {
  return {
    id: row.code,
    backendId: row.id,
    material: row.material,
    projectId: row.projectId ?? null,
    projectName: row.projectName || "",
    usedForProjectId: row.usedForProjectId ?? null,
    usedForProjectName: row.usedForProjectName || "",
    size: row.size ?? "",
    note: row.note ?? "",
  };
}

function projectWasteLabel(project) {
  return `${project.id} - ${project.name}`;
}

function nextWasteCodeValue(current) {
  const match = /(?:\D*)(\d+)$/u.exec(current ?? "");
  const nextNumber = match ? Number(match[1]) + 1 : 1;
  return `W${String(nextNumber).padStart(3, "0")}`;
}

function isTodayForEmployee(entry, employeeName) {
  if (!employeeName.trim()) return false;
  const createdAt = new Date(entry.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;
  const now = new Date();
  return (
    createdAt.getFullYear() === now.getFullYear() &&
    createdAt.getMonth() === now.getMonth() &&
    createdAt.getDate() === now.getDate() &&
    entry.staffName?.trim().toLowerCase() === employeeName.trim().toLowerCase()
  );
}

function todayUsageMap(stage, employeeName) {
  const todayRecord = (stage?.usageHistory ?? []).find((entry) =>
    isTodayForEmployee(entry, employeeName),
  );
  return Object.fromEntries(
    (stage?.materials ?? []).map((material) => [
      material.projectMaterialId,
      String(
        todayRecord?.materials.find(
          (entryMaterial) => entryMaterial.projectMaterialId === material.projectMaterialId,
        )?.quantityUsed ?? "",
      ),
    ]),
  );
}

export function EmployeeDashboard() {
  const canUpdate = canPageAction("projects", "update");
  const canDelete = canPageAction("projects", "delete");
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [allocationProject, setAllocationProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [employeeName, setEmployeeName] = useState("Employee");
  const [employeePosition, setEmployeePosition] = useState("Cutting Mechine");
  const [allocationQuantities, setAllocationQuantities] = useState({});
  const [usageQuantities, setUsageQuantities] = useState({});
  const [usageNote, setUsageNote] = useState("");
  const [stageStatus, setStageStatus] = useState("In progress");
  const [dailyUpdateView, setDailyUpdateView] = useState("menu");
  const [materialQuantities, setMaterialQuantities] = useState({});
  const [wasteMaterialRows, setWasteMaterialRows] = useState([emptyWasteMaterial()]);
  const [wasteMaterialMode, setWasteMaterialMode] = useState("create");
  const [wasteRows, setWasteRows] = useState([]);
  const [nextWasteCode, setNextWasteCode] = useState("W001");
  const [materialTypes, setMaterialTypes] = useState(
    DEFAULT_MATERIAL_TYPES.map((label) => ({
      id: `default:${label.toLowerCase()}`,
      label,
      source: "default",
    })),
  );
  const [selectedWasteIds, setSelectedWasteIds] = useState([]);
  const [wasteSearch, setWasteSearch] = useState("");
  const [createdWasteMessage, setCreatedWasteMessage] = useState(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  useEffect(() => {
    localStorage.setItem("factrova-login-role", "staff");
    setEmployeeName(localStorage.getItem("factrova-employee-name") || "Employee");
    setEmployeePosition(localStorage.getItem("factrova-employee-position") || "Cutting Mechine");

    const loadProjects = async () => {
      try {
        const [rows, wasteItems, nextCode, materialTypeRows] = await Promise.all([
          api.list("projects", { scope: "mine" }),
          api.list("waste"),
          apiRequest("/waste/next-code"),
          apiRequest("stock/material-types"),
        ]);

        setProjects(rows.map(projectFromApi));
        setWasteRows((wasteItems ?? []).map(mapWasteMaterial));
        setNextWasteCode(nextCode.code || "W001");
        setMaterialTypes([
          ...(materialTypeRows.defaults ?? []),
          ...(materialTypeRows.custom ?? []),
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load projects");
      }
    };

    loadProjects();
  }, []);

  const refreshProject = async (project) => {
    const row = await api.get("projects", project.backendId);
    const nextProject = projectFromApi(row);
    setProjects((items) =>
      items.map((item) => (item.backendId === nextProject.backendId ? nextProject : item)),
    );
    return nextProject;
  };

  const deleteProject = async (project) => {
    try {
      await api.remove("projects", project.backendId);
      setProjects((items) => items.filter((item) => item.backendId !== project.backendId));
      if (selectedProject?.backendId === project.backendId) {
        setSelectedProject(null);
      }
      toast.success("Project deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete project");
    }
  };

  const openProjectUpdate = async (project) => {
    const stageName = roleToStage(employeePosition);
    if (!stageName) {
      toast.error("This role cannot update project stages");
      return;
    }

    let detail = project;
    try {
      detail = await refreshProject(project);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load project");
      return;
    }

    const stage = detail.workflowStages.find(
      (item) => item.name.toLowerCase() === stageName.toLowerCase(),
    );

    if (!stage?.materials?.length) {
      if (!canUpdate) {
        toast.error("Project update permission is required to set material requirements");
        return;
      }
      if (!detail.materials.length) {
        toast.error("This project has no materials available for staff setup");
        return;
      }
      setAllocationProject(detail);
      setAllocationQuantities(
        Object.fromEntries(detail.materials.map((material) => [material.id, ""])),
      );
      return;
    }

    setSelectedProject(detail);
    setDailyUpdateView("menu");
    setMaterialQuantities(
      Object.fromEntries(
        detail.materials.map((material) => [material.id, String(material.quantity)]),
      ),
    );
    setWasteMaterialRows([emptyWasteMaterial()]);
    setUsageQuantities(todayUsageMap(stage, employeeName));
    setUsageNote("");
    setStageStatus(stage?.staffStatus || "In progress");
    setWasteMaterialMode("create");
    setSelectedWasteIds([]);
    setWasteSearch("");
    setCreatedWasteMessage(null);
    setIsSavingStatus(false);
  };

  const currentStage = selectedProject
    ? selectedProject.workflowStages.find(
        (item) => item.name.toLowerCase() === roleToStage(employeePosition).toLowerCase(),
      )
    : null;

  const stageMaterials = currentStage?.materials ?? [];
  const todayUsageByMaterial = todayUsageMap(currentStage, employeeName);

  const stageProgressPercent =
    currentStage?.total && currentStage.total > 0
      ? Math.min(100, Math.round((currentStage.completed / currentStage.total) * 100))
      : 0;

  const saveAllocation = async () => {
    if (!allocationProject) return;

    const stageName = roleToStage(employeePosition);
    const materials = allocationProject.materials
      .map((material) => ({
        projectMaterialId: material.id,
        requiredQuantity: Number(allocationQuantities[material.id]) || 0,
      }))
      .filter((material) => material.requiredQuantity > 0);

    if (!materials.length) {
      toast.error("Enter required quantity for at least one material");
      return;
    }

    try {
      const updated = await api.create(
        `projects/${allocationProject.backendId}/stages/${encodeURIComponent(stageName)}/allocation`,
        { role: employeePosition, staffName: employeeName, materials },
      );

      const nextProject = projectFromApi(updated);
      setProjects((items) =>
        items.map((item) => (item.backendId === nextProject.backendId ? nextProject : item)),
      );
      setAllocationProject(null);
      setSelectedProject(nextProject);

      const stage = nextProject.workflowStages.find(
        (item) => item.name.toLowerCase() === stageName.toLowerCase(),
      );
      setUsageQuantities(todayUsageMap(stage, employeeName));
      toast.success("Stage material requirement saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save stage materials");
    }
  };

  const availableWaste = selectedProject ? wasteRows.filter((row) => !row.usedForProjectId) : [];

  const filteredAvailableWaste = availableWaste.filter((row) =>
    [row.id, row.material, row.size, row.note]
      .join(" ")
      .toLowerCase()
      .includes(wasteSearch.toLowerCase()),
  );

  const saveCreatedWasteMaterial = async () => {
    if (!selectedProject) return;

    const rowsToCreate = wasteMaterialRows
      .map((row) => ({
        type: row.type.trim(),
        size: row.size.trim(),
        note: row.note.trim(),
      }))
      .filter((row) => row.type);

    if (!rowsToCreate.length) {
      toast.error("Add at least one waste material");
      return;
    }

    try {
      let runningCode = nextWasteCode;
      const createdItems = [];

      for (const row of rowsToCreate) {
        const saved = await api.create("waste", {
          code: runningCode,
          material: row.type,
          projectId: selectedProject.backendId,
          projectName: projectWasteLabel(selectedProject),
          size: row.size || null,
          note: row.note || null,
        });
        createdItems.push(mapWasteMaterial(saved));
        runningCode = nextWasteCodeValue(runningCode);
      }

      setWasteRows((current) => [...createdItems.reverse(), ...current]);
      setNextWasteCode(runningCode);
      setWasteMaterialRows([emptyWasteMaterial()]);
      setCreatedWasteMessage({ count: createdItems.length });

      toast.success(
        createdItems.length === 1
          ? "Waste material created"
          : `${createdItems.length} waste materials created`,
      );

      setSelectedProject(null);
      setDailyUpdateView("menu");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create waste material");
    }
  };

  const saveUsedWasteMaterials = async () => {
    if (!selectedProject) return;
    if (!selectedWasteIds.length) {
      toast.error("Select at least one waste material");
      return;
    }

    try {
      const updatedRows = [];
      for (const wasteId of selectedWasteIds) {
        const wasteItem = availableWaste.find((row) => row.backendId === wasteId);
        if (!wasteItem?.backendId) continue;

        const updated = await api.update("waste", wasteItem.backendId, {
          usedForProjectId: selectedProject.backendId,
          usedForProjectName: projectWasteLabel(selectedProject),
        });
        updatedRows.push(mapWasteMaterial(updated));
      }

      if (!updatedRows.length) {
        toast.error("Selected waste material was not found");
        return;
      }

      const updatedById = new Map(updatedRows.map((row) => [row.backendId, row]));
      setWasteRows((current) => current.map((row) => updatedById.get(row.backendId) ?? row));
      setSelectedWasteIds([]);
      setWasteSearch("");

      toast.success(
        updatedRows.length === 1
          ? "Waste material used"
          : `${updatedRows.length} waste materials used`,
      );

      setSelectedProject(null);
      setDailyUpdateView("menu");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to use waste material");
    }
  };

  // Save only status update without materials
  const saveStatusUpdate = async () => {
    if (!selectedProject || !currentStage) return;

    setIsSavingStatus(true);
    const stageName = roleToStage(employeePosition);

    try {
      const updated = await api.create(
        `projects/${selectedProject.backendId}/stages/${encodeURIComponent(stageName)}/usage`,
        {
          role: employeePosition,
          staffName: employeeName,
          note: usageNote || "Status updated",
          stageStatus,
          materials: [],
        },
      );

      const nextProject = projectFromApi(updated);
      setProjects((items) =>
        items.map((item) => (item.backendId === nextProject.backendId ? nextProject : item)),
      );
      setSelectedProject(nextProject);

      // Update local state
      const stage = nextProject.workflowStages.find(
        (item) => item.name.toLowerCase() === stageName.toLowerCase(),
      );
      setStageStatus(stage?.staffStatus || stageStatus);
      setUsageNote("");

      toast.success("Status updated successfully");

      // Close dialog after short delay
      setTimeout(() => {
        setSelectedProject(null);
        setDailyUpdateView("menu");
      }, 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update status");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const saveUsage = async () => {
    if (!selectedProject || !currentStage) return;

    const stageName = roleToStage(employeePosition);

    const materials = (currentStage.materials ?? [])
      .map((material) => ({
        projectMaterialId: material.projectMaterialId,
        quantityUsed: Number(usageQuantities[material.projectMaterialId]) || 0,
        previousTodayUsed: Number(todayUsageByMaterial[material.projectMaterialId]) || 0,
      }))
      .filter((material) => material.quantityUsed > 0 || material.previousTodayUsed > 0)
      .map(({ projectMaterialId, quantityUsed }) => ({
        projectMaterialId,
        quantityUsed,
      }));

    const hasUsage = materials.length > 0;
    const hasStageStatus = Boolean(stageStatus.trim());
    const hasNote = Boolean(usageNote.trim());

    if (!hasUsage && !hasStageStatus && !hasNote) {
      return toast.error("Add usage, stage status, note, or waste update");
    }

    try {
      const updated = await api.create(
        `projects/${selectedProject.backendId}/stages/${encodeURIComponent(stageName)}/usage`,
        {
          role: employeePosition,
          staffName: employeeName,
          note: usageNote,
          stageStatus,
          materials,
        },
      );

      const nextProject = projectFromApi(updated);
      setProjects((items) =>
        items.map((item) => (item.backendId === nextProject.backendId ? nextProject : item)),
      );
      setSelectedProject(nextProject);

      const stage = nextProject.workflowStages.find(
        (item) => item.name.toLowerCase() === stageName.toLowerCase(),
      );
      setUsageQuantities(todayUsageMap(stage, employeeName));
      setStageStatus(stage?.staffStatus || stageStatus);
      setUsageNote("");
      setWasteMaterialMode("create");

      toast.success("Project update saved");
      setSelectedProject(null);
      setDailyUpdateView("menu");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update usage");
    }
  };

  const logout = () => {
    localStorage.removeItem("factrova-login-role");
    localStorage.removeItem("factrova-employee-name");
    localStorage.removeItem("factrova-employee-position");
    navigate({ to: "/" });
  };

  return (
    <>
      {/* Mobile View */}
      <div className="min-h-screen bg-muted/30 md:hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-base font-semibold leading-tight">{employeeName}</p>
            <p className="text-xs text-muted-foreground">{employeePosition}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Employee menu">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => navigate({ to: "/dashboard/projects" })}>
                <FolderKanban className="mr-2 h-4 w-4" />
                All Projects
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="space-y-4 p-4">
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "relative w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors",
                  "hover:bg-muted/30",
                )}
              >
                <div className="absolute right-2 top-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Project actions for ${project.name}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => openProjectUpdate(project)}>
                        Update
                      </DropdownMenuItem>
                      {canDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteProject(project)}
                        >
                          Delete
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openProjectUpdate(project)}>
                        Daily Update
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <button
                  type="button"
                  onClick={() => openProjectUpdate(project)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-3 pr-10">
                    <p className="text-sm font-semibold text-foreground">{project.name}</p>
                    <StatusBadge status={project.status} />
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Progress</span>
                      <span className="font-semibold">{Number(project.progress.toFixed(2))}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-md bg-muted/45 px-3 py-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Completion</span>
                      <span className="ml-2 font-semibold text-foreground">
                        {project.workflowStages.find(
                          (stage) =>
                            stage.name.toLowerCase() ===
                            roleToStage(employeePosition).toLowerCase(),
                        )?.completed ?? 0}
                        /
                        {project.workflowStages.find(
                          (stage) =>
                            stage.name.toLowerCase() ===
                            roleToStage(employeePosition).toLowerCase(),
                        )?.total ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDateTimeCompact(project.delivery)}
                    </div>
                  </div>
                </button>
              </div>
            ))}

            {projects.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center">
                <p className="text-sm font-medium">No projects selected</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open All Projects and add a project to start working on it.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <DashboardLayout title="My Projects" role="staff">
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
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr
                        key={project.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openProjectUpdate(project)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openProjectUpdate(project);
                          }
                        }}
                        className={cn(
                          "border-b border-border/50 outline-none last:border-0",
                          "cursor-pointer hover:bg-muted/30 focus:bg-muted/40",
                        )}
                      >
                        <td className="px-4 py-3 font-medium">{project.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{project.customer}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Number(project.progress.toFixed(2))}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTimeCompact(project.delivery)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Project actions for ${project.name}`}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openProjectUpdate(project)}>
                                Update
                              </DropdownMenuItem>
                              {canDelete && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => deleteProject(project)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openProjectUpdate(project)}>
                                Daily Update
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}

                    {projects.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <p className="text-sm font-medium">No projects selected</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Open All Projects and add a project to start working on it.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </DashboardLayout>
      </div>

      {/* Allocation Dialog */}
      <Dialog
        open={!!allocationProject}
        onOpenChange={(open) => {
          if (!open) {
            setAllocationProject(null);
            setAllocationQuantities({});
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set {roleToStage(employeePosition)} material requirement</DialogTitle>
            {allocationProject && (
              <p className="text-sm font-medium text-muted-foreground">{allocationProject.name}</p>
            )}
          </DialogHeader>

          <div className="space-y-3">
            {allocationProject?.materials.map((material) => (
              <div
                key={material.id}
                className="grid items-center gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_140px_90px]"
              >
                <div>
                  <p className="text-sm font-medium">
                    {material.materialType || material.materialName}
                    {material.thickness ? ` ${material.thickness}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {material.materialName !== material.materialType
                      ? `${material.materialName} - `
                      : ""}
                    Project quantity: {material.quantity} {material.unit}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={material.quantity}
                  value={allocationQuantities[material.id] ?? ""}
                  onChange={(event) =>
                    setAllocationQuantities((current) => ({
                      ...current,
                      [material.id]: event.target.value,
                    }))
                  }
                  placeholder="Required"
                />
                <span className="text-sm text-muted-foreground">{material.unit}</span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAllocationProject(null);
                setAllocationQuantities({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveAllocation}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Update Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent
          className={cn(
            "bottom-0 left-0 right-0 top-auto flex max-h-[92dvh] max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden rounded-b-none rounded-t-2xl p-0 duration-300",
            "data-[state=closed]:!slide-out-to-bottom data-[state=closed]:!slide-out-to-left-0",
            "data-[state=closed]:!slide-out-to-top-0 data-[state=closed]:!zoom-out-100",
            "data-[state=open]:!slide-in-from-bottom data-[state=open]:!slide-in-from-left-0",
            "data-[state=open]:!slide-in-from-top-0 data-[state=open]:!zoom-in-100",
            "sm:left-[50%] sm:right-auto sm:top-auto sm:max-w-3xl sm:!translate-x-[-50%]",
            "[&>button]:hidden",
          )}
        >
          <DialogHeader className="shrink-0 border-b border-border bg-[image:var(--gradient-soft)] px-4 py-2.5 text-left sm:px-6 sm:py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {dailyUpdateView !== "menu" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Back to daily update"
                    onClick={() => setDailyUpdateView("menu")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <DialogTitle className="text-lg sm:text-xl leading-tight">
                  {dailyUpdateView === "job"
                    ? "Job Updates"
                    : dailyUpdateView === "materials"
                      ? "Required Materials"
                      : dailyUpdateView === "waste"
                        ? "Waste Materials"
                        : "Daily Update"}
                </DialogTitle>
              </div>
              {selectedProject && (
                <p className="shrink-0 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                  Status: {selectedProject.status}
                </p>
              )}
            </div>
            {selectedProject && dailyUpdateView === "menu" && (
              <p className="-mt-0.5 text-xs sm:text-sm font-medium text-muted-foreground truncate">
                Project Name: {selectedProject.name}
              </p>
            )}
          </DialogHeader>

          {selectedProject && dailyUpdateView === "menu" && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-medium">Stage of progress</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                        style={{ width: `${stageProgressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{stageProgressPercent}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    className="h-14 w-full justify-start rounded-xl border-blue-600 bg-blue-50 text-left text-base text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                    onClick={() => setDailyUpdateView("job")}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Job Update
                  </Button>
                  <Button
                    type="button"
                    className="h-14 w-full justify-start rounded-xl border-blue-600 bg-blue-50 text-left text-base text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                    onClick={() => setDailyUpdateView("materials")}
                  >
                    <Layers3 className="mr-2 h-4 w-4" />
                    Materials
                  </Button>
                  <Button
                    type="button"
                    className="h-14 w-full justify-start rounded-xl border-blue-600 bg-blue-50 text-left text-base text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                    onClick={() => setDailyUpdateView("waste")}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Waste Materials
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Status Update</p>
                  </div>

                  <div className="space-y-3">
                    <Select value={stageStatus} onValueChange={setStageStatus}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {stageStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedProject && dailyUpdateView === "job" && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-3">
                {stageMaterials.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No required materials set for this stage yet.
                  </div>
                ) : (
                  stageMaterials.map((material) => {
                    const remaining = material.requiredQuantity - material.completedQuantity;
                    const currentDayUsed = Number(
                      todayUsageByMaterial[material.projectMaterialId] ?? 0,
                    );
                    const editableLimit = Math.max(0, remaining + currentDayUsed);

                    return (
                      <div
                        key={material.projectMaterialId}
                        className="grid grid-cols-[minmax(0,1fr)_110px] gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-start"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {material.materialType || material.materialName}
                            {material.thickness ? ` ${material.thickness}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Required: {Number(material.requiredQuantity.toFixed(2))} {material.unit}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Today used: {Number(currentDayUsed.toFixed(2))} {material.unit}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Remaining: {Number(remaining.toFixed(2))} {material.unit}
                          </p>
                        </div>
                        <div className="space-y-1.5 justify-self-end w-[110px] sm:w-[180px]">
                          <Label className="text-xs">Used materials</Label>
                          <Input
                            type="number"
                            min={0}
                            max={editableLimit}
                            disabled={!canUpdate || editableLimit <= 0}
                            value={usageQuantities[material.projectMaterialId] ?? ""}
                            onChange={(event) =>
                              setUsageQuantities((current) => ({
                                ...current,
                                [material.projectMaterialId]: event.target.value,
                              }))
                            }
                            placeholder="0"
                          />
                          <p className="text-[10px] text-muted-foreground">Max: {editableLimit}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {selectedProject && dailyUpdateView === "materials" && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-3">
                {selectedProject.materials.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No required materials available for this project.
                  </div>
                ) : (
                  selectedProject.materials.map((material) => (
                    <div
                      key={material.id}
                      className="grid grid-cols-[minmax(0,1fr)_110px] gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-start"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {material.materialType || material.materialName}
                          {material.thickness ? ` ${material.thickness}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Project quantity: {material.quantity} {material.unit}
                        </p>
                      </div>
                      <div className="space-y-1.5 justify-self-end w-[110px] sm:w-[180px]">
                        <Label className="text-xs">Required materials</Label>
                        <Input
                          type="number"
                          min={0}
                          value={materialQuantities[material.id] ?? ""}
                          onChange={(event) =>
                            setMaterialQuantities((current) => ({
                              ...current,
                              [material.id]: event.target.value,
                            }))
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedProject && dailyUpdateView === "waste" && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    className={cn(
                      "h-12 rounded-xl",
                      wasteMaterialMode === "create"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100",
                    )}
                    onClick={() => {
                      setWasteMaterialMode("create");
                      setSelectedWasteIds([]);
                      setWasteSearch("");
                    }}
                  >
                    Create Material
                  </Button>
                  <Button
                    type="button"
                    className={cn(
                      "h-12 rounded-xl",
                      wasteMaterialMode === "use"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100",
                    )}
                    onClick={() => {
                      setWasteMaterialMode("use");
                      setCreatedWasteMessage(null);
                    }}
                  >
                    Use Material
                  </Button>
                </div>

                {wasteMaterialMode === "create" ? (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    {createdWasteMessage && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-sm">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">Material saved</p>
                            <p className="mt-1 text-sm text-emerald-800">
                              {createdWasteMessage.count === 1
                                ? "1 waste material created"
                                : `${createdWasteMessage.count} waste materials created`}
                            </p>
                            <p className="mt-1 text-xs font-medium text-emerald-700">
                              Ready for the next material
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                            onClick={() => setCreatedWasteMessage(null)}
                          >
                            Add more
                          </Button>
                        </div>
                      </div>
                    )}

                    {wasteMaterialRows.map((row, index) => (
                      <div
                        key={`waste-create-${index}`}
                        className="space-y-3 rounded-xl border border-border/70 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">Waste material {index + 1}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={wasteMaterialRows.length === 1}
                            onClick={() =>
                              setWasteMaterialRows((current) =>
                                current.filter((_, rowIndex) => rowIndex !== index),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={row.type}
                            onValueChange={(value) =>
                              setWasteMaterialRows((current) =>
                                current.map((item, rowIndex) =>
                                  rowIndex === index ? { ...item, type: value } : item,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="h-12 rounded-xl">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {materialTypes.map((type) => (
                                <SelectItem key={type.id} value={type.label}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Size</Label>
                          <Input
                            value={row.size}
                            onChange={(event) =>
                              setWasteMaterialRows((current) =>
                                current.map((item, rowIndex) =>
                                  rowIndex === index ? { ...item, size: event.target.value } : item,
                                ),
                              )
                            }
                            placeholder="Enter size"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Note</Label>
                          <Textarea
                            value={row.note}
                            onChange={(event) =>
                              setWasteMaterialRows((current) =>
                                current.map((item, rowIndex) =>
                                  rowIndex === index ? { ...item, note: event.target.value } : item,
                                ),
                              )
                            }
                            placeholder="Add a note"
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full rounded-xl"
                      onClick={() =>
                        setWasteMaterialRows((current) => [...current, emptyWasteMaterial()])
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add another material
                    </Button>

                    <Button
                      type="button"
                      className="h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => void saveCreatedWasteMaterial()}
                    >
                      Create
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Search available waste</Label>
                      <Input
                        value={wasteSearch}
                        onChange={(event) => setWasteSearch(event.target.value)}
                        placeholder="Search waste material"
                      />
                    </div>

                    <div className="space-y-2">
                      {filteredAvailableWaste.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                          No available waste materials found.
                        </div>
                      ) : (
                        filteredAvailableWaste.map((item) => {
                          const checked = selectedWasteIds.includes(item.backendId);
                          return (
                            <label
                              key={item.backendId}
                              className="flex items-start gap-3 rounded-xl border border-border p-3"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  setSelectedWasteIds((current) =>
                                    value
                                      ? [...current, item.backendId]
                                      : current.filter((id) => id !== item.backendId),
                                  )
                                }
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">
                                  {item.id} - {item.material}
                                </p>
                                {item.size && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Size: {item.size}
                                  </p>
                                )}
                                {item.note && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Note: {item.note}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <Button
                      type="button"
                      className="h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                      disabled={filteredAvailableWaste.length === 0}
                      onClick={() => void saveUsedWasteMaterials()}
                    >
                      Use selected waste
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0 grid grid-cols-2 gap-2 border-t border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProject(null);
                setDailyUpdateView("menu");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (dailyUpdateView === "job") {
                  saveUsage();
                  return;
                }
                if (dailyUpdateView === "materials") {
                  toast.success("Required materials updated");
                  return;
                }
                if (dailyUpdateView === "waste") {
                  if (wasteMaterialMode === "create") {
                    void saveCreatedWasteMaterial();
                    return;
                  }
                  if (wasteMaterialMode === "use") {
                    void saveUsedWasteMaterials();
                    return;
                  }
                  return;
                }
                // If in menu view, save status update
                if (dailyUpdateView === "menu") {
                  saveStatusUpdate();
                  return;
                }
              }}
              disabled={(!canUpdate && dailyUpdateView !== "menu") || isSavingStatus}
            >
              {dailyUpdateView === "job"
                ? "Save changes"
                : dailyUpdateView === "materials"
                  ? "Save Materials"
                  : dailyUpdateView === "waste"
                    ? "Save"
                    : isSavingStatus
                      ? "Saving..."
                      : "Save Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
