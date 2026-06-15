import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { type Project, type ProjectStatus } from "@/lib/data";
import { canPageAction } from "@/lib/auth";
import { api, apiRequest } from "@/lib/api";
import { formatDateTimeCompact } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { CalendarDays, FolderKanban, LogOut, MoreVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/employee/dashboard")({
  head: () => ({ meta: [{ title: "My Projects - Factrova" }] }),
  component: EmployeeDashboard,
});

type WasteMaterial = {
  type: string;
  size: string;
  note: string;
};
type WasteMaterialMode = "create" | "use";
type ExistingWasteMaterial = {
  id: string;
  backendId: string;
  type: string;
  size: string;
  note?: string;
  projectName?: string;
  usedForProjectId?: string;
};
type ApiWasteMaterial = {
  id: string;
  code: string;
  material: string;
  projectId?: string | null;
  projectName?: string;
  usedForProjectId?: string | null;
  usedForProjectName?: string;
  size?: string;
  note?: string;
};
type NextWasteCode = {
  code: string;
};
type StageMaterial = {
  projectMaterialId: string;
  stockItemId?: string | null;
  materialName: string;
  materialType: string;
  thickness?: string;
  requiredQuantity: number;
  completedQuantity: number;
  unit: string;
};
type UsageHistoryRecord = {
  id: string;
  staffName?: string;
  role?: string;
  note?: string;
  stageStatus?: string;
  createdAt: string;
  materials: Array<{
    projectMaterialId: string;
    materialName: string;
    materialType?: string;
    thickness?: string;
    quantityUsed: number;
    unit: string;
  }>;
};
type ProjectMaterial = {
  id: string;
  stockItemId?: string | null;
  materialName: string;
  materialType: string;
  thickness?: string;
  quantity: number;
  unit: string;
};
type WorkflowStage = {
  id: string;
  name: string;
  completed: number;
  total: number;
  staffStatus?: string;
  materials?: StageMaterial[];
  usageHistory?: UsageHistoryRecord[];
};
type ApiProject = {
  id: string;
  code: string;
  name: string;
  customerName: string;
  status: ProjectStatus;
  progress: number;
  delivery?: string | null;
  amount: number;
  materials?: ProjectMaterial[];
  workflowStages?: WorkflowStage[];
};
type WorkProject = Project & {
  backendId: string;
  materials: ProjectMaterial[];
  workflowStages: WorkflowStage[];
};

const materialTypes = ["MDF", "Plywood", "Laminate", "Veneer", "Acrylic", "Edge Band", "Hardware"];
const stageStatusOptions = ["Not started", "In progress", "On hold", "Completed"];

function mapWasteMaterial(row: ApiWasteMaterial): ExistingWasteMaterial {
  return {
    id: row.code,
    backendId: row.id,
    type: row.material,
    size: row.size ?? "",
    note: row.note ?? "",
    projectName: row.projectName ?? "",
  };
}

function nextWasteCode(current?: string) {
  const match = /(?:\D*)(\d+)$/u.exec(current ?? "");
  const nextNumber = match ? Number(match[1]) + 1 : 1;
  return `W${String(nextNumber).padStart(3, "0")}`;
}

function roleToStage(role: string) {
  const name = role.toLowerCase();
  if (name.includes("press")) return "Pressing";
  if (name.includes("cut")) return "Cutting";
  if (name.includes("edge")) return "Edge band";
  if (name.includes("bor")) return "Boring";
  if (name.includes("pack") || name.includes("deliver")) return "Packing";
  return "";
}

function projectFromApi(row: ApiProject): WorkProject {
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

function emptyWasteMaterial(): WasteMaterial {
  return {
    type: "MDF",
    size: "",
    note: "",
  };
}

function EmployeeDashboard() {
  const canUpdate = canPageAction("projects", "update");
  const navigate = useNavigate();
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [allocationProject, setAllocationProject] = useState<WorkProject | null>(null);
  const [selectedProject, setSelectedProject] = useState<WorkProject | null>(null);
  const [employeeName, setEmployeeName] = useState("Employee");
  const [employeePosition, setEmployeePosition] = useState("Cutting Mechine");
  const [allocationQuantities, setAllocationQuantities] = useState<Record<string, string>>({});
  const [usageQuantities, setUsageQuantities] = useState<Record<string, string>>({});
  const [usageNote, setUsageNote] = useState("");
  const [stageStatus, setStageStatus] = useState("In progress");
  const [hasWasteMaterials, setHasWasteMaterials] = useState(false);
  const [wasteMaterialMode, setWasteMaterialMode] = useState<WasteMaterialMode>("create");
  const [wasteMaterials, setWasteMaterials] = useState<WasteMaterial[]>([emptyWasteMaterial()]);
  const [wasteMaterialSearch, setWasteMaterialSearch] = useState("");
  const [selectedWasteMaterialIds, setSelectedWasteMaterialIds] = useState<string[]>([]);
  const [existingWasteMaterials, setExistingWasteMaterials] = useState<ExistingWasteMaterial[]>([]);
  const [nextWasteId, setNextWasteId] = useState("W001");

  const filteredWasteMaterials = existingWasteMaterials.filter((item) =>
    [item.id, item.type, item.size, item.note, item.projectName]
      .join(" ")
      .toLowerCase()
      .includes(wasteMaterialSearch.toLowerCase()),
  );

  useEffect(() => {
    localStorage.setItem("factrova-login-role", "staff");
    setEmployeeName(localStorage.getItem("factrova-employee-name") || "Employee");
    setEmployeePosition(localStorage.getItem("factrova-employee-position") || "Cutting Mechine");

    const loadProjects = async () => {
      try {
        const rows = await api.list<ApiProject>("projects", { scope: "mine" });
        setProjects(rows.map(projectFromApi));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load projects");
      }
    };

    loadProjects();
  }, []);

  const refreshProject = async (project: WorkProject) => {
    const row = await api.get<ApiProject>("projects", project.backendId);
    const nextProject = projectFromApi(row);
    setProjects((items) =>
      items.map((item) => (item.backendId === nextProject.backendId ? nextProject : item)),
    );
    return nextProject;
  };

  const openProjectUpdate = async (project: WorkProject) => {
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
    setUsageQuantities(
      Object.fromEntries(
        (stage.materials ?? []).map((material) => [material.projectMaterialId, ""]),
      ),
    );
    setUsageNote("");
    setStageStatus(stage?.staffStatus || "In progress");
    setHasWasteMaterials(false);
    setWasteMaterialMode("create");
    setWasteMaterials([emptyWasteMaterial()]);
    setWasteMaterialSearch("");
    setSelectedWasteMaterialIds([]);
  };

  const currentStage = selectedProject
    ? selectedProject.workflowStages.find(
        (item) => item.name.toLowerCase() === roleToStage(employeePosition).toLowerCase(),
      )
    : null;
  const stageMaterials = currentStage?.materials ?? [];
  const stageProgressPercent =
    currentStage?.total && currentStage.total > 0
      ? Math.min(100, Math.round((currentStage.completed / currentStage.total) * 100))
      : 0;
  const stageRemaining = Math.max(
    0,
    Number(currentStage?.total ?? 0) - Number(currentStage?.completed ?? 0),
  );

  useEffect(() => {
    if (!selectedProject) {
      setExistingWasteMaterials([]);
      setNextWasteId("W001");
      return;
    }

    let active = true;
    const loadWasteMaterials = async () => {
      try {
        const [wasteRows, nextCode] = await Promise.all([
          api.list<ApiWasteMaterial>("waste", { status: "available" }),
          apiRequest<NextWasteCode>("/waste/next-code"),
        ]);
        if (!active) return;
        setExistingWasteMaterials((wasteRows ?? []).map(mapWasteMaterial));
        setSelectedWasteMaterialIds([]);
        setNextWasteId(nextCode.code || "W001");
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Unable to load waste materials");
      }
    };

    loadWasteMaterials();
    return () => {
      active = false;
    };
  }, [selectedProject?.backendId]);

  const saveAllocation = async () => {
    if (!allocationProject) return;
    const stageName = roleToStage(employeePosition);
    const materials = allocationProject.materials
      .map((material) => ({
        projectMaterialId: material.id,
        requiredQuantity: Number(allocationQuantities[material.id]) || 0,
      }))
      .filter((material) => material.requiredQuantity > 0);
    if (!materials.length) return toast.error("Enter required quantity for at least one material");

    try {
      const updated = await api.create<ApiProject>(
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
      setUsageQuantities(
        Object.fromEntries(
          (stage?.materials ?? []).map((material) => [material.projectMaterialId, ""]),
        ),
      );
      toast.success("Stage material requirement saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save stage materials");
    }
  };

  const saveUsage = async () => {
    if (!selectedProject || !currentStage) return;
    const stageName = roleToStage(employeePosition);
    const materials = (currentStage.materials ?? [])
      .map((material) => ({
        projectMaterialId: material.projectMaterialId,
        quantityUsed: Number(usageQuantities[material.projectMaterialId]) || 0,
      }))
      .filter((material) => material.quantityUsed > 0);
    const hasUsage = materials.length > 0;
    const hasStageStatus = Boolean(stageStatus.trim());
    const hasNote = Boolean(usageNote.trim());
    const hasWasteSelection =
      hasWasteMaterials &&
      ((wasteMaterialMode === "create" && wasteMaterials.some((item) => item.type.trim())) ||
        (wasteMaterialMode === "use" && selectedWasteMaterialIds.length > 0));
    if (!hasUsage && !hasStageStatus && !hasNote && !hasWasteSelection) {
      return toast.error("Add usage, stage status, note, or waste update");
    }

    try {
      const updated = await api.create<ApiProject>(
        `projects/${selectedProject.backendId}/stages/${encodeURIComponent(stageName)}/usage`,
        {
          role: employeePosition,
          staffName: employeeName,
          note: usageNote,
          stageStatus,
          materials,
        },
      );

      if (hasWasteMaterials) {
        if (wasteMaterialMode === "create") {
          const wasteEntries = wasteMaterials.filter((item) => item.type.trim());
          let currentWasteCode = nextWasteId;
          for (const wasteItem of wasteEntries) {
            await api.create<ApiWasteMaterial>("waste", {
              code: currentWasteCode,
              material: wasteItem.type.trim(),
              projectId: selectedProject.backendId,
              projectName: `${selectedProject.id} - ${selectedProject.name}`,
              size: wasteItem.size.trim() || null,
              note: wasteItem.note.trim() || null,
            });
            currentWasteCode = nextWasteCode(currentWasteCode);
          }
          setNextWasteId(currentWasteCode);
        }

        if (wasteMaterialMode === "use") {
          const selectedWasteItems = existingWasteMaterials.filter((item) =>
            selectedWasteMaterialIds.includes(item.id),
          );
          for (const wasteItem of selectedWasteItems) {
            await api.update<ApiWasteMaterial>("waste", wasteItem.backendId, {
              usedForProjectId: selectedProject.backendId,
              usedForProjectName: `${selectedProject.id} - ${selectedProject.name}`,
            });
          }
        }
      }

      const nextProject = projectFromApi(updated);
      setProjects((items) =>
        items.map((item) => (item.backendId === nextProject.backendId ? nextProject : item)),
      );
      setSelectedProject(nextProject);
      const stage = nextProject.workflowStages.find(
        (item) => item.name.toLowerCase() === stageName.toLowerCase(),
      );
      setUsageQuantities(
        Object.fromEntries(
          (stage?.materials ?? []).map((material) => [material.projectMaterialId, ""]),
        ),
      );
      setStageStatus(stage?.staffStatus || stageStatus);
      setUsageNote("");
      setHasWasteMaterials(false);
      setWasteMaterialMode("create");
      setWasteMaterials([emptyWasteMaterial()]);
      setWasteMaterialSearch("");
      setSelectedWasteMaterialIds([]);
      toast.success("Project update saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update usage");
    }
  };

  const updateWasteMaterial = (index: number, updates: Partial<WasteMaterial>) => {
    setWasteMaterials((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item)),
    );
  };

  const removeWasteMaterial = (index: number) => {
    setWasteMaterials((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const toggleExistingWasteMaterial = (id: string, checked: boolean) => {
    setSelectedWasteMaterialIds((items) =>
      checked ? [...items, id] : items.filter((item) => item !== id),
    );
  };

  const openRequiredMaterialsEditor = () => {
    if (!selectedProject) return;
    setAllocationProject(selectedProject);
    const existingRequired = new Map(
      (currentStage?.materials ?? []).map((material) => [
        material.projectMaterialId,
        String(material.requiredQuantity ?? ""),
      ]),
    );
    setAllocationQuantities(
      Object.fromEntries(
        selectedProject.materials.map((material) => [
          material.id,
          existingRequired.get(material.id) ?? "",
        ]),
      ),
    );
  };

  const logout = () => {
    localStorage.removeItem("factrova-login-role");
    localStorage.removeItem("factrova-employee-name");
    localStorage.removeItem("factrova-employee-position");
    navigate({ to: "/" });
  };

  return (
    <>
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
              <button
                key={project.id}
                type="button"
                onClick={() => openProjectUpdate(project)}
                className={cn(
                  "w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors",
                  "hover:bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{project.name}</p>
                  </div>
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
                          stage.name.toLowerCase() === roleToStage(employeePosition).toLowerCase(),
                      )?.completed ?? 0}
                      /
                      {project.workflowStages.find(
                        (stage) =>
                          stage.name.toLowerCase() === roleToStage(employeePosition).toLowerCase(),
                      )?.total ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDateTimeCompact(project.delivery)}
                  </div>
                </div>
              </button>
            ))}
            {projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center">
                <p className="text-sm font-medium">No projects selected</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open All Projects and add a project to start working on it.
                </p>
              </div>
            ) : null}
          </div>
        </main>
      </div>

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
                            <span className="text-xs text-muted-foreground">{Number(project.progress.toFixed(2))}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTimeCompact(project.delivery)}
                        </td>
                      </tr>
                    ))}
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <p className="text-sm font-medium">No projects selected</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Open All Projects and add a project to start working on it.
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </DashboardLayout>
      </div>

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

      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto flex max-h-[92dvh] max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden rounded-b-none rounded-t-2xl p-0 duration-300 data-[state=closed]:!slide-out-to-bottom data-[state=closed]:!slide-out-to-left-0 data-[state=closed]:!slide-out-to-top-0 data-[state=closed]:!zoom-out-100 data-[state=open]:!slide-in-from-bottom data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0 data-[state=open]:!zoom-in-100 sm:left-[50%] sm:right-auto sm:top-auto sm:max-w-3xl sm:!translate-x-[-50%]">
          <DialogHeader className="shrink-0 border-b border-border bg-[image:var(--gradient-soft)] px-4 py-3 sm:px-6 sm:py-4 text-left">
            <DialogTitle className="text-lg sm:text-xl">Update project</DialogTitle>
            {selectedProject && (
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                {selectedProject.name}
              </p>
            )}
          </DialogHeader>

          {selectedProject && (
            <>
              {/* Scrollable content with better mobile padding */}
              <div className="min-h-0 flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4 sm:space-y-5">
                {/* Stats Cards - Better mobile grid */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Stage Progress Card */}
                  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
                      Stage progress
                    </p>
                    <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold">
                      {Number((currentStage?.completed ?? 0).toFixed(2))}
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {" "}
                        / {currentStage?.total ?? 0}
                      </span>
                    </p>
                    <div className="mt-2 sm:mt-3 h-1.5 sm:h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                        style={{ width: `${stageProgressPercent}%` }}
                      />
                    </div>
                    <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
                      {stageRemaining} remaining
                    </p>
                  </div>

                  {/* Required Materials Card */}
                  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
                      Required materials
                    </p>
                    <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold">
                      {stageMaterials.length}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 sm:mt-3 w-full text-xs sm:text-sm"
                      onClick={openRequiredMaterialsEditor}
                      disabled={!canUpdate}
                    >
                      Edit materials
                    </Button>
                  </div>

                  {/* Staff Status Card */}
                  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
                      Staff status
                    </p>
                    <p className="mt-1 sm:mt-2 text-base sm:text-lg font-semibold truncate">
                      {stageStatus}
                    </p>
                    <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                      Update your stage work status
                    </p>
                  </div>
                </div>

                {/* Tabs - Mobile optimized */}
                <Tabs defaultValue="usage" className="space-y-3 sm:space-y-4">
                  <TabsList className="grid w-full grid-cols-4 gap-1 bg-muted/50 p-1">
                    <TabsTrigger value="usage" className="text-[11px] sm:text-sm px-1 sm:px-3">
                      Update
                    </TabsTrigger>
                    <TabsTrigger value="materials" className="text-[11px] sm:text-sm px-1 sm:px-3">
                      Materials
                    </TabsTrigger>
                    <TabsTrigger value="status" className="text-[11px] sm:text-sm px-1 sm:px-3">
                      Status
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-[11px] sm:text-sm px-1 sm:px-3">
                      History
                    </TabsTrigger>
                  </TabsList>

                  {/* Usage Tab - Mobile improvements */}
                  <TabsContent value="usage" className="space-y-3 sm:space-y-4">
                    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                      <div className="mb-3 sm:mb-4">
                        <h3 className="text-sm sm:text-base font-semibold">Daily usage update</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                          Add what you used today
                        </p>
                      </div>

                      <div className="space-y-3">
                        {stageMaterials.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                            No required materials set for this stage yet.
                          </div>
                        ) : (
                          stageMaterials.map((material) => {
                            const remaining =
                              material.requiredQuantity - material.completedQuantity;
                            const progress =
                              material.requiredQuantity > 0
                                ? Math.min(
                                    100,
                                    (material.completedQuantity / material.requiredQuantity) * 100,
                                  )
                                : 0;

                            return (
                              <div
                                key={material.projectMaterialId}
                                className="rounded-lg border border-border/80 p-3 space-y-3"
                              >
                                {/* Material Info */}
                                <div>
                                  <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                                    <p className="text-sm font-medium">
                                      {material.materialType || material.materialName}
                                      {material.thickness ? ` ${material.thickness}` : ""}
                                    </p>
                                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                                      {Number(material.completedQuantity.toFixed(2))}/{Number(material.requiredQuantity.toFixed(2))}{" "}
                                      {material.unit}
                                    </span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <p className="mt-1.5 text-[10px] sm:text-xs text-muted-foreground">
                                    Remaining: {Number(remaining.toFixed(2))} {material.unit}
                                  </p>
                                </div>

                                {/* Usage Input - Full width on mobile */}
                                <div className="flex items-end gap-2">
                                  <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Used today</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={remaining}
                                      disabled={!canUpdate || remaining <= 0}
                                      value={usageQuantities[material.projectMaterialId] ?? ""}
                                      onChange={(event) =>
                                        setUsageQuantities((current) => ({
                                          ...current,
                                          [material.projectMaterialId]: event.target.value,
                                        }))
                                      }
                                      placeholder="0"
                                      className="text-sm"
                                    />
                                  </div>
                                  <div className="pb-2 text-sm text-muted-foreground">
                                    {material.unit}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Usage Note */}
                      <div className="mt-4 space-y-1.5">
                        <Label className="text-xs sm:text-sm">Usage note (optional)</Label>
                        <Textarea
                          value={usageNote}
                          onChange={(event) => setUsageNote(event.target.value)}
                          placeholder="Add work notes, delays, or completed details..."
                          rows={3}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Waste Materials Section - Mobile optimized */}
                    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <Checkbox
                          id="has-waste-materials"
                          checked={hasWasteMaterials}
                          onCheckedChange={(value) => setHasWasteMaterials(Boolean(value))}
                          className="mt-0.5"
                        />
                        <Label htmlFor="has-waste-materials" className="text-sm font-medium">
                          Waste materials update
                        </Label>
                      </div>

                      {hasWasteMaterials ? (
                        <div className="space-y-3">
                          <Tabs
                            value={wasteMaterialMode}
                            onValueChange={(value) =>
                              setWasteMaterialMode(value as WasteMaterialMode)
                            }
                            className="w-full"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <TabsList className="flex-1 grid grid-cols-2">
                                <TabsTrigger value="create" className="text-xs sm:text-sm">
                                  Create
                                </TabsTrigger>
                                <TabsTrigger value="use" className="text-xs sm:text-sm">
                                  Use
                                </TabsTrigger>
                              </TabsList>
                              <Button
                                type="button"
                                size="sm"
                                className="shrink-0 border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => {
                                  setWasteMaterialMode("create");
                                  setWasteMaterials((items) => [...items, emptyWasteMaterial()]);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>

                            <TabsContent value="create" className="space-y-3 mt-0">
                              {wasteMaterials.map((item, index) => (
                                <div
                                  key={index}
                                  className="space-y-3 rounded-lg border border-border/70 p-3"
                                >
                                  <div className="space-y-2">
                                    <Label className="text-xs">Material Type</Label>
                                    <Select
                                      value={item.type}
                                      onValueChange={(value) =>
                                        updateWasteMaterial(index, { type: value })
                                      }
                                    >
                                      <SelectTrigger className="text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {materialTypes.map((type) => (
                                          <SelectItem key={type} value={type}>
                                            {type}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs">Size</Label>
                                    <Input
                                      value={item.size}
                                      onChange={(event) =>
                                        updateWasteMaterial(index, { size: event.target.value })
                                      }
                                      placeholder="e.g., 120x240cm"
                                      className="text-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs">Note</Label>
                                    <Input
                                      value={item.note}
                                      onChange={(event) =>
                                        updateWasteMaterial(index, { note: event.target.value })
                                      }
                                      placeholder="Additional info"
                                      className="text-sm"
                                    />
                                  </div>
                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeWasteMaterial(index)}
                                      disabled={wasteMaterials.length === 1}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </TabsContent>

                            <TabsContent value="use" className="space-y-3 mt-0">
                              <Input
                                value={wasteMaterialSearch}
                                onChange={(event) => setWasteMaterialSearch(event.target.value)}
                                placeholder="Search waste materials..."
                                className="text-sm"
                              />
                              <div className="max-h-64 overflow-y-auto rounded-lg border border-border/70">
                                {filteredWasteMaterials.map((item) => {
                                  const checked = selectedWasteMaterialIds.includes(item.id);
                                  return (
                                    <label
                                      key={item.id}
                                      className="flex items-center gap-3 border-b border-border/60 p-3 last:border-0 hover:bg-muted/30 cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) =>
                                          toggleExistingWasteMaterial(item.id, Boolean(value))
                                        }
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.type}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {item.size}
                                        </p>
                                      </div>
                                      <span
                                        className={`text-xs font-medium whitespace-nowrap ${
                                          selectedProject &&
                                          item.usedForProjectId === selectedProject.backendId
                                            ? "text-emerald-600"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {selectedProject &&
                                        item.usedForProjectId === selectedProject.backendId
                                          ? "Linked"
                                          : "Ready"}
                                      </span>
                                    </label>
                                  );
                                })}
                                {filteredWasteMaterials.length === 0 && (
                                  <div className="px-3 py-6 text-center text-xs sm:text-sm text-muted-foreground">
                                    No waste materials found.
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Enable to create or use waste materials for today's work
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Materials Tab */}
                  <TabsContent value="materials" className="space-y-3 sm:space-y-4">
                    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold">Required materials</h3>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                            Quantities needed for this stage
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={openRequiredMaterialsEditor}
                          disabled={!canUpdate}
                          className="w-full sm:w-auto"
                        >
                          Edit materials
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {stageMaterials.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground text-center">
                            No required materials configured yet
                          </div>
                        ) : (
                          stageMaterials.map((material) => (
                            <div
                              key={`required-${material.projectMaterialId}`}
                              className="flex items-center justify-between rounded-lg border border-border/70 p-3"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {material.materialType || material.materialName}
                                  {material.thickness ? ` ${material.thickness}` : ""}
                                </p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  Required: {Number(material.requiredQuantity.toFixed(2))} {material.unit}
                                </p>
                              </div>
                              <div className="text-sm font-medium whitespace-nowrap ml-2">
                                {material.completedQuantity}/{material.requiredQuantity}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Status Tab */}
                  <TabsContent value="status" className="space-y-3 sm:space-y-4">
                    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                      <div className="mb-4">
                        <h3 className="text-sm sm:text-base font-semibold">Update stage status</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                          Status for your work stage
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs sm:text-sm">Stage status</Label>
                          <Select value={stageStatus} onValueChange={setStageStatus}>
                            <SelectTrigger className="text-sm">
                              <SelectValue />
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

                        <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Current stage:{" "}
                            <span className="font-medium text-foreground">
                              {roleToStage(employeePosition)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history" className="space-y-3 sm:space-y-4">
                    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                      <div className="mb-4">
                        <h3 className="text-sm sm:text-base font-semibold">Daily usage history</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                          Previous updates for this stage
                        </p>
                      </div>

                      {(currentStage?.usageHistory ?? []).length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground text-center">
                          No daily updates yet
                        </div>
                      ) : (
                        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                          {(currentStage?.usageHistory ?? []).map((record) => (
                            <div
                              key={record.id}
                              className="rounded-lg border border-border bg-background p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                                <span className="text-xs sm:text-sm font-medium">
                                  {record.staffName || "Staff"} -{" "}
                                  {record.stageStatus ||
                                    record.role ||
                                    roleToStage(employeePosition)}
                                </span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  {formatDateTimeCompact(record.createdAt)}
                                </span>
                              </div>

                              {record.materials.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {record.materials.map((material) => (
                                    <span
                                      key={`${record.id}-${material.projectMaterialId}`}
                                      className="rounded-md bg-muted px-2 py-0.5 text-[10px] sm:text-xs"
                                    >
                                      {material.materialType || material.materialName}{material.thickness ? ` ${material.thickness}` : ""}: {Number(material.quantityUsed.toFixed(2))} {material.unit}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {record.materials.length === 0 && (
                                <div className="mb-2">
                                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] sm:text-xs">
                                    Status update only
                                  </span>
                                </div>
                              )}

                              {record.note && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                  {record.note}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer - Fixed at bottom */}
              <DialogFooter className="sticky bottom-0 grid shrink-0 grid-cols-2 gap-2 sm:gap-3 border-t border-border bg-background px-3 sm:px-6 py-3 sm:py-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProject(null)}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button onClick={saveUsage} disabled={!canUpdate} className="text-sm">
                  Save changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
