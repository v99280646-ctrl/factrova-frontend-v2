import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  MoreVertical,
  ClipboardList,
  CalendarDays,
  ChartLine,
  CircleDollarSign,
  Cuboid,
  Mail,
  MapPin,
  Package,
  Phone,
  UserRound,
  UsersRound,
} from "lucide-react";
import { ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
  projects as initial,
  stock as initialStock,
  type Customer,
  type Project,
  type ProjectStatus,
  type StockItem,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { loadStoredServices, mergeServices } from "@/lib/project-services";
import { loadStoredCustomers, mergeCustomers, saveStoredCustomers } from "@/lib/customer-store";
import { api, apiRequest } from "@/lib/api";
import { canPageAction } from "@/lib/auth";
import { formatDateTimeCompact } from "@/lib/date-format";
import { findWasteAssignment } from "@/lib/waste-assignment-store";

export const Route = createFileRoute("/dashboard/projects")({
  head: () => ({ meta: [{ title: "Projects — Factrova" }] }),
  component: Projects,
});

type Service = { id: string; name: string };
type ApiProject = {
  id: string;
  assignedToMe?: boolean;
  assignedStaffIds?: string[];
  assignedStaff?: {
    id?: string;
    name: string;
    email?: string;
    role?: string;
  }[];
  code: string;
  name: string;
  customerId?: string | null;
  customerName: string;
  customerDetails?: Customer | null;
  workType: "own" | "job";
  status: ProjectStatus;
  progress: number;
  createdAt?: string;
  delivery?: string | null;
  amount: number;
  notes?: string;
  materials?: {
    id: string;
    source: MaterialSource;
    stockItemId?: string | null;
    materialName: string;
    materialType: string;
    thickness?: string;
    quantity: number;
    unit: string;
  }[];
  services?: {
    id: string;
    serviceId?: string | null;
    serviceName: string;
    unit?: string;
  }[];
  workflowStages?: {
    id: string;
    name: string;
    completed: number;
    total: number;
    sortOrder: number;
    materials?: {
      id?: string;
      projectMaterialId?: string | null;
      stockItemId?: string | null;
      materialName: string;
      materialType: string;
      requiredQuantity: number;
      completedQuantity: number;
      unit: string;
    }[];
  }[];
};
type ProjectAction = "view" | "update";
type DailyUpdateStep = "menu" | "job";
type ProjectMaterialStock = {
  material: string;
  required: number;
  inStock: number;
  unit: string;
};
type ProjectServiceUsage = {
  name: string;
  completed: number;
  total: number;
};
type ProjectDetailMaterial = ProjectMaterialStock & {
  source: MaterialSource;
};
type ProjectWorkflowStage = ProjectServiceUsage["name"];
type ProjectWasteMaterial = {
  id: string;
  backendId?: string;
  material: string;
  projectId?: string | null;
  projectName?: string;
  usedForProjectId?: string | null;
  usedForProjectName?: string;
  size: string;
  note?: string;
};
type ApiWasteMaterial = ProjectWasteMaterial & {
  code: string;
  project_id?: string | null;
  project_name?: string | null;
  used_for_project_id?: string | null;
  used_for_project_name?: string | null;
};
type NextWasteCode = {
  code: string;
};

function projectWasteLabel(project: Pick<ApiProject, "code" | "name">) {
  return `${project.code} - ${project.name}`;
}

function matchesProjectWaste(
  project: Pick<ApiProject, "id" | "code" | "name">,
  projectId?: string | null,
  projectName?: string,
) {
  return projectId === project.id || (projectName ?? "").startsWith(`${project.code} -`);
}

function mapProjectWasteMaterial(row: ApiWasteMaterial): ProjectWasteMaterial {
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

function Projects() {
  const canAdd = canPageAction("projects", "add");
  const canEdit = canPageAction("projects", "edit");
  const canDelete = canPageAction("projects", "delete");
  const canUpdate = canPageAction("projects", "update");
  const [list, setList] = useState<Project[]>(initial);
  const [projectBackendIds, setProjectBackendIds] = useState<Record<string, string>>({});
  const [assignedProjects, setAssignedProjects] = useState<Record<string, boolean>>({});
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [editProject, setEditProject] = useState<ApiProject | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [projectAction, setProjectAction] = useState<ProjectAction>("view");
  const [dailyUpdateProject, setDailyUpdateProject] = useState<ApiProject | null>(null);
  const [dailyUpdateLoading, setDailyUpdateLoading] = useState(false);
  const [dailyUpdateStep, setDailyUpdateStep] = useState<DailyUpdateStep>("menu");
  const [dailyUpdateMaterialUsage, setDailyUpdateMaterialUsage] = useState<
    Record<string, string>
  >({});
  const [loginRole, setLoginRole] = useState<"admin" | "employee">("admin");
  const employeeMode = loginRole === "employee";

  const filtered = list.filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      [p.name, p.customer].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  useEffect(() => {
    const storedRole = localStorage.getItem("factrova-login-role");
    setLoginRole(storedRole === "employee" || storedRole === "staff" ? "employee" : "admin");
  }, []);

  const loadProjects = async () => {
    let data: ApiProject[] = [];
    try {
      data = await api.list<ApiProject>("projects");
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Unable to load projects");
    }
    setList(
      (data ?? []).map((row) => ({
        id: row.code,
        name: row.name,
        customer: row.customerName,
        status: row.status as ProjectStatus,
        progress: row.progress,
        delivery: row.delivery ?? "TBD",
        amount: Number(row.amount),
      })),
    );
    setProjectBackendIds(Object.fromEntries((data ?? []).map((row) => [row.code, row.id])));
    setAssignedProjects(
      Object.fromEntries((data ?? []).map((row) => [row.code, Boolean(row.assignedToMe)])),
    );
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openProjectAction = async (project: Project, action: ProjectAction) => {
    if (action === "view") {
      setPreviewProject({ ...project });
      return;
    }
    const backendId = projectBackendIds[project.id];
    if (!backendId) return toast.error("Project backend id missing");
    setEditLoading(true);
    try {
      const detail = await api.get<ApiProject>("projects", backendId);
      setEditProject(detail);
      setProjectAction(action);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load project");
    } finally {
      setEditLoading(false);
    }
  };

  const openDailyUpdate = async (project: Project) => {
    const backendId = projectBackendIds[project.id];
    if (!backendId) return toast.error("Project backend id missing");
    setDailyUpdateLoading(true);
    setDailyUpdateStep("menu");
    try {
      const detail = await api.get<ApiProject>("projects", backendId);
      setDailyUpdateProject(detail);
      const materials = detail.workflowStages?.[0]?.materials ?? [];
      setDailyUpdateMaterialUsage(
        Object.fromEntries(materials.map((material) => [material.id ?? material.materialName, ""])),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load project");
    } finally {
      setDailyUpdateLoading(false);
    }
  };

  const saveProjectUpdate = async (project: Project) => {
    const backendId = projectBackendIds[project.id];
    if (backendId) {
      try {
        await api.update<ApiProject>("projects", backendId, {
          name: project.name,
          customerName: project.customer,
          status: project.status,
          progress: project.progress,
          delivery: project.delivery === "TBD" ? null : project.delivery,
          amount: project.amount,
        });
      } catch (error) {
        return toast.error(error instanceof Error ? error.message : "Unable to update project");
      }
    }
    setList((items) => items.map((item) => (item.id === project.id ? project : item)));
    setSelectedProject(null);
    toast.success("Project updated");
  };

  const saveProjectEdit = async (project: ApiProject) => {
    try {
      let saved = await api.update<ApiProject>("projects", project.id, {
        code: project.code,
        name: project.name,
        customerId: project.customerId || null,
        customerName: project.customerName,
        workType: project.workType,
        status: project.status,
        progress: Number(project.progress) || 0,
        delivery: project.delivery || null,
        amount: Number(project.amount) || 0,
        notes: project.notes ?? "",
        materials: (project.materials ?? []).map((material) => ({
          _id: /^[0-9a-f]{24}$/i.test(material.id) ? material.id : undefined,
          source: material.source,
          stockItemId: material.stockItemId || null,
          materialName: material.materialName,
          materialType: material.materialType,
          thickness: material.thickness ?? "",
          quantity: Number(material.quantity) || 0,
          unit: material.unit || "sheets",
        })),
        services: (project.services ?? []).map((service) => ({
          _id: /^[0-9a-f]{24}$/i.test(service.id) ? service.id : undefined,
          serviceId: service.serviceId || null,
          serviceName: service.serviceName,
          unit: service.unit ?? "",
        })),
      });
      if (project.workflowStages?.length) {
        saved = await apiRequest<ApiProject>(`/projects/${project.id}/workflow`, {
          method: "PATCH",
          body: {
            stages: project.workflowStages.map((stage, index) => ({
              _id: /^[0-9a-f]{24}$/i.test(stage.id) ? stage.id : undefined,
              name: stage.name,
              completed: Number(stage.completed) || 0,
              total: Number(stage.total) || 0,
              sortOrder: Number(stage.sortOrder) || index,
              materials: (stage.materials ?? []).map((material) => ({
                _id:
                  "id" in material &&
                  typeof material.id === "string" &&
                  /^[0-9a-f]{24}$/i.test(material.id)
                    ? material.id
                    : undefined,
                projectMaterialId: material.projectMaterialId || null,
                stockItemId: material.stockItemId || null,
                materialName: material.materialName,
                materialType: material.materialType,
                requiredQuantity: Number(material.requiredQuantity) || 0,
                completedQuantity: Number(material.completedQuantity) || 0,
                unit: material.unit || "sheets",
              })),
            })),
          },
        });
      }
      const row: Project = {
        id: saved.code,
        name: saved.name,
        customer: saved.customerName,
        status: saved.status,
        progress: saved.progress,
        delivery: saved.delivery ?? "TBD",
        amount: Number(saved.amount),
      };
      setList((items) => items.map((item) => (item.id === project.code ? row : item)));
      setProjectBackendIds((ids) => {
        const next = { ...ids };
        delete next[project.code];
        next[saved.code] = saved.id;
        return next;
      });
      setEditProject(null);
      toast.success("Project updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update project");
    }
  };

  const deleteProject = async (project: Project) => {
    const backendId = projectBackendIds[project.id];
    if (backendId) {
      try {
        await api.remove("projects", backendId);
      } catch (error) {
        return toast.error(error instanceof Error ? error.message : "Unable to delete project");
      }
    }
    setList((items) => items.filter((item) => item.id !== project.id));
    toast.success("Project deleted");
  };

  const toggleMyProject = async (project: Project) => {
    const backendId = projectBackendIds[project.id];
    if (!backendId) return toast.error("Project backend id missing");
    const assigned = Boolean(assignedProjects[project.id]);
    setAssignmentLoading(project.id);
    try {
      await apiRequest<ApiProject>(`/projects/${backendId}/assign-self`, {
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

  const addProject = (project: Project, backendId?: string) => {
    setList((items) => [project, ...items]);
    if (backendId) {
      setProjectBackendIds((ids) => ({ ...ids, [project.id]: backendId }));
    }
  };

  return (
    <DashboardLayout title="Projects">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects…"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as ProjectStatus | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue />
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
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New Project
            </Button>
          </div>
        )}
      </div>

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
                {filtered.map((p) => (
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
                            className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{Number(p.progress.toFixed(2))}%</span>
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
                              <Check className="mr-1 h-4 w-4" /> Remove
                            </>
                          ) : (
                            <>
                              <Plus className="mr-1 h-4 w-4" /> Add to My Projects
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
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDailyUpdate(p)}>
                              <ClipboardList className="mr-2 h-4 w-4" />
                              Daily Update
                            </DropdownMenuItem>
                            {canEdit && canUpdate ? (
                              <DropdownMenuItem onClick={() => openProjectAction(p, "update")}>
                                Edit
                              </DropdownMenuItem>
                            ) : null}
                            {canDelete ? (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteProject(p)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No projects match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!employeeMode && (
        <CreateProjectDialog open={open} onOpenChange={setOpen} onCreate={addProject} />
      )}

      {!employeeMode && (
        <ProjectPreviewSheet
          project={previewProject}
          backendId={previewProject ? projectBackendIds[previewProject.id] : undefined}
          onClose={() => setPreviewProject(null)}
        />
      )}

      {!employeeMode && (
        <DailyUpdateDialog
          open={Boolean(dailyUpdateProject) || dailyUpdateLoading}
          step={dailyUpdateStep}
          project={dailyUpdateProject}
          usage={dailyUpdateMaterialUsage}
          onStepChange={setDailyUpdateStep}
          onUsageChange={setDailyUpdateMaterialUsage}
          onClose={() => {
            setDailyUpdateProject(null);
            setDailyUpdateStep("menu");
            setDailyUpdateMaterialUsage({});
          }}
        />
      )}

      {!employeeMode && (
        <ProjectActionDialog
          action={projectAction}
          project={selectedProject}
          onProjectChange={setSelectedProject}
          onClose={() => setSelectedProject(null)}
          onSave={saveProjectUpdate}
        />
      )}

      {!employeeMode && (
        <ProjectEditDialog
          action={projectAction}
          project={editProject}
          loading={editLoading}
          onProjectChange={setEditProject}
          onClose={() => setEditProject(null)}
          onSave={saveProjectEdit}
        />
      )}
    </DashboardLayout>
  );
}

function ProjectEditDialog({
  action,
  project,
  loading,
  onProjectChange,
  onClose,
  onSave,
}: {
  action: ProjectAction;
  project: ApiProject | null;
  loading: boolean;
  onProjectChange: (project: ApiProject | null) => void;
  onClose: () => void;
  onSave: (project: ApiProject) => void;
}) {
  const [wasteRows, setWasteRows] = useState<ProjectWasteMaterial[]>([]);
  const [wasteLoading, setWasteLoading] = useState(false);
  const [nextWasteCode, setNextWasteCode] = useState("W001");
  const [newWasteMaterial, setNewWasteMaterial] = useState("");
  const [newWasteSize, setNewWasteSize] = useState("");
  const [newWasteNote, setNewWasteNote] = useState("");
  const [selectedWasteToUse, setSelectedWasteToUse] = useState("none");

  const update = <K extends keyof ApiProject>(key: K, value: ApiProject[K]) => {
    onProjectChange(project ? { ...project, [key]: value } : project);
  };
  const updateMaterial = (
    index: number,
    key: NonNullable<ApiProject["materials"]>[number] extends infer T ? keyof T : never,
    value: unknown,
  ) => {
    if (!project) return;
    const materials = [...(project.materials ?? [])];
    materials[index] = { ...materials[index], [key]: value };
    onProjectChange({ ...project, materials });
  };
  const updateService = (
    index: number,
    key: NonNullable<ApiProject["services"]>[number] extends infer T ? keyof T : never,
    value: unknown,
  ) => {
    if (!project) return;
    const services = [...(project.services ?? [])];
    services[index] = { ...services[index], [key]: value };
    onProjectChange({ ...project, services });
  };
  const updateStage = (
    index: number,
    key: NonNullable<ApiProject["workflowStages"]>[number] extends infer T ? keyof T : never,
    value: unknown,
  ) => {
    if (!project) return;
    const workflowStages = [...(project.workflowStages ?? [])];
    workflowStages[index] = { ...workflowStages[index], [key]: value };
    onProjectChange({ ...project, workflowStages });
  };

  const addMaterial = () => {
    if (!project) return;
    onProjectChange({
      ...project,
      materials: [
        ...(project.materials ?? []),
        {
          id: crypto.randomUUID(),
          source: "new-stock",
          stockItemId: null,
          materialName: "New Material",
          materialType: "MDF",
          thickness: "",
          quantity: 0,
          unit: "sheets",
        },
      ],
    });
  };
  const addService = () => {
    if (!project) return;
    onProjectChange({
      ...project,
      services: [
        ...(project.services ?? []),
        { id: crypto.randomUUID(), serviceId: null, serviceName: "New Service", unit: "sheet" },
      ],
    });
  };
  const addStage = () => {
    if (!project) return;
    onProjectChange({
      ...project,
      workflowStages: [
        ...(project.workflowStages ?? []),
        {
          id: crypto.randomUUID(),
          name: "New Stage",
          completed: 0,
          total: 0,
          sortOrder: project.workflowStages?.length ?? 0,
          materials: [],
        },
      ],
    });
  };

  useEffect(() => {
    if (!project?.id) {
      setWasteRows([]);
      setNextWasteCode("W001");
      setSelectedWasteToUse("none");
      return;
    }

    let active = true;
    const loadWasteData = async () => {
      setWasteLoading(true);
      try {
        const [wasteItems, nextCode] = await Promise.all([
          api.list<ApiWasteMaterial>("waste"),
          apiRequest<NextWasteCode>("/waste/next-code"),
        ]);
        if (!active) return;
        setWasteRows((wasteItems ?? []).map(mapProjectWasteMaterial));
        setNextWasteCode(nextCode.code || "W001");
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Unable to load waste materials");
      } finally {
        if (active) setWasteLoading(false);
      }
    };

    loadWasteData();
    return () => {
      active = false;
    };
  }, [project?.id]);

  const createdWaste = project
    ? wasteRows.filter((row) => matchesProjectWaste(project, row.projectId, row.projectName))
    : [];
  const usedWaste = project
    ? wasteRows.filter((row) =>
        matchesProjectWaste(project, row.usedForProjectId, row.usedForProjectName),
      )
    : [];
  const availableWaste = project
    ? wasteRows.filter((row) => {
        const belongsToProject = matchesProjectWaste(project, row.projectId, row.projectName);
        const alreadyUsedHere = matchesProjectWaste(
          project,
          row.usedForProjectId,
          row.usedForProjectName,
        );
        return row.backendId && !belongsToProject && (!row.usedForProjectId || alreadyUsedHere);
      })
    : [];
  const wasteMaterialOptions = Array.from(
    new Set(
      (project?.materials ?? [])
        .map((material) => material.materialName || material.materialType)
        .filter(Boolean),
    ),
  );

  const createWasteForProject = async () => {
    if (!project) return;
    if (!newWasteMaterial.trim()) return toast.error("Waste material is required");

    try {
      const saved = await api.create<ApiWasteMaterial>("waste", {
        code: nextWasteCode,
        material: newWasteMaterial.trim(),
        projectId: project.id,
        projectName: projectWasteLabel(project),
        size: newWasteSize.trim() || null,
        note: newWasteNote.trim() || null,
      });
      setWasteRows((current) => [mapProjectWasteMaterial(saved), ...current]);
      const next = await apiRequest<NextWasteCode>("/waste/next-code");
      setNextWasteCode(next.code || nextWasteCode);
      setNewWasteMaterial("");
      setNewWasteSize("");
      setNewWasteNote("");
      toast.success("Waste material created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create waste material");
    }
  };

  const linkWasteToProject = async () => {
    if (!project) return;
    if (selectedWasteToUse === "none") return toast.error("Select a waste item first");

    const wasteItem = availableWaste.find((row) => row.backendId === selectedWasteToUse);
    if (!wasteItem?.backendId) return toast.error("Selected waste item was not found");

    try {
      const updated = await api.update<ApiWasteMaterial>("waste", wasteItem.backendId, {
        usedForProjectId: project.id,
        usedForProjectName: projectWasteLabel(project),
      });
      setWasteRows((current) =>
        current.map((row) =>
          row.backendId === wasteItem.backendId ? mapProjectWasteMaterial(updated) : row,
        ),
      );
      setSelectedWasteToUse("none");
      toast.success("Waste item linked to project");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to use waste item");
    }
  };

  const unlinkWasteFromProject = async (wasteItem: ProjectWasteMaterial) => {
    if (!wasteItem.backendId) return;
    try {
      const updated = await api.update<ApiWasteMaterial>("waste", wasteItem.backendId, {
        usedForProjectId: null,
        usedForProjectName: "",
      });
      setWasteRows((current) =>
        current.map((row) =>
          row.backendId === wasteItem.backendId ? mapProjectWasteMaterial(updated) : row,
        ),
      );
      toast.success("Waste item removed from project");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to unlink waste item");
    }
  };

  return (
    <Dialog open={Boolean(project) || loading} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="left-auto right-0 top-0 flex h-dvh max-h-dvh w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 sm:max-w-5xl sm:rounded-none">
        <DialogHeader className="border-b border-border bg-background px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="text-base">
            {action === "update" ? "Edit project" : "Project"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {project
              ? `${project.code} - ${project.customerName || "No customer"}`
              : "Loading project"}
          </p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto bg-muted/20 px-4 py-4 sm:px-6">
          {loading && (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading project...</p>
          )}
          {project && (
            <div className="mx-auto max-w-4xl space-y-4">
              <section className="rounded-lg border border-border bg-background shadow-sm">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold">Project Details</h3>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Project Code</Label>
                    <Input value={project.code} onChange={(e) => update("code", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Work Type</Label>
                    <Select
                      value={project.workType}
                      onValueChange={(value) => update("workType", value as "own" | "job")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">Own Work</SelectItem>
                        <SelectItem value="job">Job Work</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={project.status}
                      onValueChange={(value) => update("status", value as ProjectStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="hold">On hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Project Name</Label>
                    <Input value={project.name} onChange={(e) => update("name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Customer</Label>
                    <Input
                      value={project.customerName}
                      onChange={(e) => update("customerName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Progress</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={project.progress}
                      onChange={(e) => update("progress", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Delivery</Label>
                    <Input
                      value={project.delivery ?? ""}
                      placeholder="25 JUN 26 05:30"
                      onChange={(e) => update("delivery", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      value={project.amount}
                      onChange={(e) => update("amount", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5 lg:col-span-3">
                    <Label>Notes</Label>
                    <Textarea
                      className="min-h-20"
                      value={project.notes ?? ""}
                      onChange={(e) => update("notes", e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-border bg-background shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold">Materials</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="space-y-3 p-4">
                  {(project.materials ?? []).map((material, index) => (
                    <div
                      key={material.id ?? index}
                      className="flex flex-col gap-3 rounded-md border border-border/70 bg-muted/20 p-3 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_100px_120px_40px]"
                    >
                      <div className="space-y-1.5">
                        <Label>Material</Label>
                        <Input
                          value={material.materialName}
                          onChange={(e) => updateMaterial(index, "materialName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Input
                          value={material.materialType}
                          onChange={(e) => updateMaterial(index, "materialType", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Thickness</Label>
                        <Input
                          value={material.thickness ?? ""}
                          onChange={(e) => updateMaterial(index, "thickness", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          value={material.quantity}
                          onChange={(e) =>
                            updateMaterial(index, "quantity", Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Unit</Label>
                        <Input
                          value={material.unit}
                          onChange={(e) => updateMaterial(index, "unit", e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={(project.materials ?? []).length <= 1}
                          onClick={() =>
                            onProjectChange({
                              ...project,
                              materials: (project.materials ?? []).filter((_, i) => i !== index),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-background shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold">Services Used</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addService}>
                      <Plus className="mr-1 h-4 w-4" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2 p-4">
                    {(project.services ?? []).map((service, index) => (
                      <div
                        key={service.id ?? index}
                        className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_100px_40px]"
                      >
                        <Input
                          value={service.serviceName}
                          onChange={(e) => updateService(index, "serviceName", e.target.value)}
                        />
                        <Input
                          value={service.unit ?? ""}
                          onChange={(e) => updateService(index, "unit", e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            onProjectChange({
                              ...project,
                              services: (project.services ?? []).filter((_, i) => i !== index),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(project.services ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No services added.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold">Workflow Progress</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addStage}>
                      <Plus className="mr-1 h-4 w-4" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2 p-4">
                    {(project.workflowStages ?? []).map((stage, index) => (
                      <div
                        key={stage.id ?? index}
                        className="flex flex-col gap-2 rounded-md border border-border/70 bg-muted/20 p-2 sm:grid sm:grid-cols-[1fr_86px_86px_40px]"
                      >
                        <Input
                          value={stage.name}
                          onChange={(e) => updateStage(index, "name", e.target.value)}
                        />
                        <Input
                          type="number"
                          min={0}
                          value={stage.completed}
                          onChange={(e) => updateStage(index, "completed", Number(e.target.value))}
                        />
                        <Input
                          type="number"
                          min={0}
                          value={stage.total}
                          onChange={(e) => updateStage(index, "total", Number(e.target.value))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            onProjectChange({
                              ...project,
                              workflowStages: (project.workflowStages ?? []).filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(project.workflowStages ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No workflow stages added.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-background shadow-sm">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold">Create Waste</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add waste generated from this project
                    </p>
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="space-y-1.5">
                      <Label>Waste code</Label>
                      <Input value={nextWasteCode} readOnly />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Material</Label>
                      {wasteMaterialOptions.length > 0 ? (
                        <Select value={newWasteMaterial} onValueChange={setNewWasteMaterial}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {wasteMaterialOptions.map((material) => (
                              <SelectItem key={material} value={material}>
                                {material}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={newWasteMaterial}
                          onChange={(e) => setNewWasteMaterial(e.target.value)}
                          placeholder="Waste material"
                        />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Size</Label>
                      <Input
                        value={newWasteSize}
                        onChange={(e) => setNewWasteSize(e.target.value)}
                        placeholder="e.g. 18mm offcuts"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Note</Label>
                      <Input
                        value={newWasteNote}
                        onChange={(e) => setNewWasteNote(e.target.value)}
                        placeholder="Add note"
                      />
                    </div>
                    <Button type="button" onClick={createWasteForProject}>
                      <Plus className="mr-1 h-4 w-4" /> Create Waste
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background shadow-sm">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold">Use Waste Item</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Link available waste stock to this project
                    </p>
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="space-y-1.5">
                      <Label>Available waste</Label>
                      <Select value={selectedWasteToUse} onValueChange={setSelectedWasteToUse}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select waste item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select waste item</SelectItem>
                          {availableWaste.map((item) => (
                            <SelectItem
                              key={item.backendId ?? item.id}
                              value={item.backendId ?? item.id}
                            >
                              {item.id} - {item.material}
                              {item.size ? ` (${item.size})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={linkWasteToProject}
                      disabled={availableWaste.length === 0}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Use Waste
                    </Button>
                    {availableWaste.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No available waste items found.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <WasteMaterialSection
                  emptyText={
                    wasteLoading
                      ? "Loading waste materials..."
                      : "No waste materials created from this project."
                  }
                  rows={createdWaste}
                  title="Created Waste"
                />
                <div className="rounded-lg border border-border/80 bg-background">
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
                    <h4 className="text-sm font-semibold">Used Waste</h4>
                    <Badge variant="secondary">{usedWaste.length} items</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    {usedWaste.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        {wasteLoading
                          ? "Loading waste materials..."
                          : "No waste materials used for this project."}
                      </div>
                    ) : (
                      <>
                        {/* Mobile view: Card-like layout */}
                        <div className="md:hidden space-y-2 p-3">
                          {usedWaste.map((row) => (
                            <div key={row.backendId ?? row.id} className="rounded-md border border-border/70 bg-muted/20 p-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{row.id}</span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => unlinkWasteFromProject(row)}
                                >
                                  Remove
                                </Button>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">Material: {row.material}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Size: {row.size || "-"}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Note: {row.note || "-"}</p>
                            </div>
                          ))}
                        </div>

                        {/* Desktop view: Table layout */}
                        <table className="hidden w-full text-sm md:table">
                          <thead>
                            <tr className="border-b border-border text-left text-xs text-muted-foreground">
                              <th className="px-3 py-2 font-medium">ID</th>
                              <th className="px-3 py-2 font-medium">Material</th>
                              <th className="px-3 py-2 font-medium">Size</th>
                              <th className="px-3 py-2 font-medium">Note</th>
                              <th className="px-3 py-2 text-right font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usedWaste.map((row) => (
                              <tr
                                key={row.backendId ?? row.id}
                                className="border-b border-border/70 last:border-0"
                              >
                                <td className="px-3 py-2 font-medium">{row.id}</td>
                                <td className="px-3 py-2">{row.material}</td>
                                <td className="px-3 py-2 text-muted-foreground">{row.size || "-"}</td>
                                <td className="px-3 py-2 text-muted-foreground">{row.note || "-"}</td>
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => unlinkWasteFromProject(row)}
                                  >
                                    Remove
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
        <DialogFooter className="border-t border-border bg-background px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {project && <Button onClick={() => onSave(project)}>Save Project</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectActionDialog({
  action,
  project,
  onProjectChange,
  onClose,
  onSave,
}: {
  action: ProjectAction;
  project: Project | null;
  onProjectChange: (project: Project | null) => void;
  onClose: () => void;
  onSave: (project: Project) => void;
}) {
  const updateProject = <K extends keyof Project>(key: K, value: Project[K]) => {
    onProjectChange(project ? { ...project, [key]: value } : project);
  };

  return (
    <Dialog open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{action === "view" ? "View project" : "Update project"}</DialogTitle>
        </DialogHeader>
        {project && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Project Name</Label>
              <Input
                value={project.name}
                readOnly={action === "view"}
                onChange={(e) => updateProject("name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Input
                value={project.customer}
                readOnly={action === "view"}
                onChange={(e) => updateProject("customer", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              {action === "view" ? (
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3">
                  <StatusBadge status={project.status} />
                </div>
              ) : (
                <Select
                  value={project.status}
                  onValueChange={(value) => updateProject("status", value as ProjectStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="hold">On hold</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Progress</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={project.progress}
                readOnly={action === "view"}
                onChange={(e) => updateProject("progress", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery</Label>
              <Input
                type="date"
                value={project.delivery}
                readOnly={action === "view"}
                onChange={(e) => updateProject("delivery", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                value={project.amount}
                readOnly={action === "view"}
                onChange={(e) => updateProject("amount", Number(e.target.value))}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {action === "view" ? "Close" : "Cancel"}
          </Button>
          {action === "update" && project && (
            <Button onClick={() => onSave(project)}>Save Update</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectPreviewSheet({
  project,
  backendId,
  onClose,
}: {
  project: Project | null;
  backendId?: string;
  onClose: () => void;
}) {
  const [detailMaterials, setDetailMaterials] = useState<ProjectDetailMaterial[]>([]);
  const [detailStages, setDetailStages] = useState<ProjectServiceUsage[]>([]);
  const [createdWaste, setCreatedWaste] = useState<ProjectWasteMaterial[]>([]);
  const [usedWaste, setUsedWaste] = useState<ProjectWasteMaterial[]>([]);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailAssignedStaff, setDetailAssignedStaff] = useState<
    NonNullable<ApiProject["assignedStaff"]>
  >([]);
  const [createdDate, setCreatedDate] = useState<string>("");
  const progressTone =
    project?.progress && project.progress >= 70
      ? "bg-emerald-500"
      : project?.progress && project.progress >= 40
        ? "bg-sky-500"
        : "bg-amber-500";
  const visibleProductionStages = detailStages;
  const visibleMaterials = detailMaterials;

  useEffect(() => {
    if (!backendId) {
      setDetailMaterials([]);
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
      let detail: ApiProject;
      let stockRows: StockItem[] = [];
      let wasteRows: ApiWasteMaterial[] = [];
      try {
        [detail, stockRows, wasteRows] = await Promise.all([
          api.get<ApiProject>("projects", backendId),
          api.list<StockItem>("stock"),
          api.list<ApiWasteMaterial>("waste"),
        ]);
      } catch {
        return;
      }
      if (!active) return;

      const stockById = new Map((stockRows ?? []).map((row) => [row.id, row]));
      const findStock = (material: NonNullable<ApiProject["materials"]>[number]) => {
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
            required: Number(row.quantity),
            inStock: Number(stockItem?.quantity ?? 0),
            unit: stockItem?.unit ?? row.unit,
            source: row.source as MaterialSource,
          };
        }),
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
      const matchesCurrentProject = (projectId?: string | null, projectName?: string) =>
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
    };

    loadDetails();
    return () => {
      active = false;
    };
  }, [backendId]);

  const customerName = detailCustomer?.company || project?.customer || "";
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

  return (
    <Sheet open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-4xl">
        <SheetHeader className="sr-only">
          <SheetTitle>Project preview</SheetTitle>
        </SheetHeader>
        {project && (
          <div className="min-h-full bg-background p-5 sm:p-7">
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
                  Rs {project.amount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

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
                  text={detailCustomer?.phone || "Phone not added"}
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
                helper="27 days remaining"
              />
            </div>

            <div className="mt-4">
              <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <CircleDollarSign className="h-4 w-4" />
                  Production progress
                </h3>
                <div className="space-y-4">
                  {visibleProductionStages.length === 0 && (
                    <p className="text-sm text-muted-foreground">No production stages added.</p>
                  )}
                  {visibleProductionStages.map((service) => {
                    const percent = Math.min(
                      100,
                      Math.round((service.completed / service.total) * 100),
                    );
                    return (
                      <div key={service.name}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{service.name}</span>
                            <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
                              In progress
                            </Badge>
                          </div>
                          <span className="text-muted-foreground">
                            {Number(service.completed.toFixed(2))}/{Number(service.total.toFixed(2))} {percent}%
                          </span>
                        </div>
                        <ProgressLine value={percent} className={serviceProgressColor(percent)} />
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

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
                      <th className="px-2 py-2 text-right font-medium">In stock</th>
                      <th className="px-2 py-2 font-medium">Unit</th>
                      <th className="px-2 py-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMaterials.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-2 py-6 text-center text-sm text-muted-foreground"
                        >
                          No materials added.
                        </td>
                      </tr>
                    )}
                    {visibleMaterials.map((row) => {
                      const sufficient = row.inStock >= row.required;
                      return (
                        <tr key={row.material} className="border-b border-border/70 last:border-0">
                          <td className="px-2 py-2 font-medium">{row.material}</td>
                          <td className="px-2 py-2 text-right">{Number(row.required.toFixed(2))}</td>
                          <td className="px-2 py-2 text-right">{Number(row.inStock.toFixed(2))}</td>
                          <td className="px-2 py-2 text-muted-foreground">{row.unit}</td>
                          <td className="px-2 py-2 text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-md",
                                sufficient
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700",
                              )}
                            >
                              {sufficient ? "Sufficient" : "Low"}
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
                      key={`${staff.id || staff.name}-${staff.role || ""}`}
                      className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {staff.email || "Email not added"}
                          </p>
                        </div>
                        <Badge variant="outline">{staff.role || "Staff"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PreviewCard({
  icon,
  label,
  value,
  helper,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {children && <div className="mt-3">{children}</div>}
      <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
    </section>
  );
}

function WasteMaterialSection({
  emptyText,
  title,
  rows,
}: {
  emptyText: string;
  title: string;
  rows: ProjectWasteMaterial[];
}) {
  return (
    <div className="rounded-lg border border-border/80">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge variant="secondary">{rows.length} items</Badge>
      </div>
      <div className="overflow-x-auto">
        {rows.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <>
            {/* Mobile view: Card-like layout */}
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

            {/* Desktop view: Table layout */}
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
          </>
        )}
      </div>
    </div>
  );
}

function PreviewInfo({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <p className="flex items-start gap-2 text-muted-foreground">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </p>
  );
}

function ProgressLine({ value, className }: { value: number; className: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", className)} style={{ width: `${value}%` }} />
    </div>
  );
}

function serviceProgressColor(value: number) {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 50) return "bg-sky-500";
  return "bg-amber-500";
}

const STEPS = ["Basic info", "Materials", "Services", "Summary"] as const;

type MaterialSource = "inventory" | "new-stock";
type MaterialRow = {
  id: string;
  type: string;
  thickness: string;
  sheets: number;
  source: MaterialSource;
  stockId?: string;
  materialName?: string;
  unit?: string;
};

const MATERIAL_TYPES = ["MDF", "Plywood", "Particle Board", "HDHMR", "Multi Wood", "WPC"];
const THICKNESS_OPTIONS = Array.from({ length: 40 }, (_, i) => `${i + 1}mm`);

function newMaterial(): MaterialRow {
  return {
    id: crypto.randomUUID(),
    type: "MDF",
    thickness: "1mm",
    sheets: 0,
    source: "new-stock",
  };
}

function makeProjectCode() {
  return `P${Date.now().toString().slice(-6)}`;
}

function serviceToWorkflowStage(serviceName: string) {
  const name = serviceName.toLowerCase();
  if (name.includes("press")) return "Pressing";
  if (name.includes("cut")) return "Cutting";
  if (name.includes("edge")) return "Edge band";
  if (name.includes("bor")) return "Boring";
  if (name.includes("pack")) return "Packing";
  if (name.includes("deliver")) return "Deliverd";
  return serviceName;
}

function DailyUpdateDialog({
  open,
  step,
  project,
  usage,
  onStepChange,
  onUsageChange,
  onClose,
}: {
  open: boolean;
  step: DailyUpdateStep;
  project: ApiProject | null;
  usage: Record<string, string>;
  onStepChange: (step: DailyUpdateStep) => void;
  onUsageChange: (usage: Record<string, string>) => void;
  onClose: () => void;
}) {
  const materials = project?.workflowStages?.[0]?.materials ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="bottom-0 left-0 right-0 top-auto flex max-h-[92dvh] max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden rounded-b-none rounded-t-2xl p-0 duration-300 data-[state=closed]:!slide-out-to-bottom data-[state=closed]:!slide-out-to-left-0 data-[state=closed]:!slide-out-to-top-0 data-[state=closed]:!zoom-out-100 data-[state=open]:!slide-in-from-bottom data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0 data-[state=open]:!zoom-in-100 sm:left-[50%] sm:right-auto sm:top-[50%] sm:max-w-3xl sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:rounded-lg">
        <DialogHeader className="shrink-0 border-b border-border bg-[image:var(--gradient-soft)] px-4 py-3 text-left sm:px-6 sm:py-4">
          <DialogTitle className="text-lg sm:text-xl">Daily Update</DialogTitle>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:text-sm">
            <span>Project Name: {project?.name ?? "—"}</span>
            <span>Status: {project?.status ?? "—"}</span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {step === "menu" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium">Stage of progress</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                      style={{ width: `${project?.progress ?? 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{project?.progress ?? 0}%</span>
                </div>
              </div>

              <div className="space-y-3">
                {["Job Update", "Materials", "Waste Materials"].map((label) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    className="h-14 w-full justify-start rounded-xl text-left text-base"
                    onClick={() => {
                      if (label === "Job Update") {
                        onStepChange("job");
                        return;
                      }
                      toast.message(`${label} is coming next`);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Required materials</p>
                  <p className="text-xs text-muted-foreground">Update how much was used</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => onStepChange("menu")}>
                  Back
                </Button>
              </div>

              <div className="space-y-3">
                {materials.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No required materials found for this project stage.
                  </div>
                ) : (
                  materials.map((material) => {
                    const key = material.id ?? material.materialName;
                    return (
                      <div key={key} className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{material.materialName}</p>
                            <p className="text-xs text-muted-foreground">
                              Required: {material.requiredQuantity} {material.unit}
                            </p>
                          </div>
                          <Badge variant="secondary">{material.materialType}</Badge>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Used materials</Label>
                          <Input
                            type="number"
                            min={0}
                            value={usage[key] ?? ""}
                            onChange={(e) =>
                              onUsageChange({
                                ...usage,
                                [key]: e.target.value,
                              })
                            }
                            placeholder="Enter used quantity"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (p: Project, backendId?: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [inventoryStock, setInventoryStock] = useState<StockItem[]>(initialStock);
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [advancedCustomerOpen, setAdvancedCustomerOpen] = useState(false);
  const [materialStage, setMaterialStage] = useState<MaterialSource>("new-stock");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customMaterialTypes, setCustomMaterialTypes] = useState<string[]>([]);
  const [materialTypeDialog, setMaterialTypeDialog] = useState<{
    open: boolean;
    rowId: string | null;
    value: string;
  }>({ open: false, rowId: null, value: "" });
  const [newCust, setNewCust] = useState({
    company: "",
    contact: "",
    phone: "",
    email: "",
    address: "",
    state: "",
    district: "",
    pincode: "",
    gstin: "",
  });
  const [data, setData] = useState({
    workType: "own" as "own" | "job",
    customer: "",
    name: "",
    delivery: "",
    notes: "",
    materials: [newMaterial()] as MaterialRow[],
    selectedServiceIds: [] as string[],
  });

  const loadLookups = async () => {
    const localServices = loadStoredServices();
    try {
      const [cs, ss, stockRows] = await Promise.all([
        api.list<Customer>("customers"),
        api.list<Service & { price?: number; unit?: string }>("services"),
        api.list<StockItem>("stock"),
      ]);
      setCustomers(mergeCustomers((cs ?? []) as Customer[], loadStoredCustomers()));
      setInventoryStock(
        stockRows?.map((row) => ({
          id: row.id,
          material: row.material,
          type: row.type,
          thickness: row.thickness ?? "",
          quantity: Number(row.quantity),
          unit: row.unit,
        })) ?? initialStock,
      );
      const mergedServices = mergeServices(
        ((ss ?? []) as (Service & { price?: number; unit?: string })[]).map((service) => ({
          id: service.id,
          name: service.name,
          price: service.price ?? 0,
          unit: service.unit ?? "sheet",
        })),
        localServices,
      );
      setServices(mergedServices.map(({ id, name }) => ({ id, name })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Using locally stored lookups");
      setCustomers(mergeCustomers(loadStoredCustomers()));
      setInventoryStock(initialStock);
      setServices(localServices.map(({ id, name }) => ({ id, name })));
    }
  };

  useEffect(() => {
    if (open) loadLookups();
  }, [open]);

  const reset = () => {
    setStep(0);
    setCreating(false);
    setMaterialStage("new-stock");
    setData({
      workType: "own",
      customer: "",
      name: "",
      delivery: "",
      notes: "",
      materials: [newMaterial()],
      selectedServiceIds: [],
    });
  };

  const totalSheets = data.materials.reduce((s, m) => s + (Number(m.sheets) || 0), 0);
  const validMaterials = data.materials.filter((material) => Number(material.sheets) > 0);
  const inventoryMaterials = data.materials.filter((material) => material.source === "inventory");
  const newStockMaterials = data.materials.filter((material) => material.source === "new-stock");
  const materialTypeOptions = [...MATERIAL_TYPES, ...customMaterialTypes];

  const addCustomer = async () => {
    if (!newCust.company.trim()) return toast.error("Company name required");
    const localCustomer: Customer = {
      id: crypto.randomUUID(),
      company: newCust.company.trim(),
      contact: newCust.contact.trim(),
      phone: newCust.phone.trim(),
      email: newCust.email.trim(),
      address: newCust.address.trim(),
      state: newCust.state.trim(),
      district: newCust.district.trim(),
      pincode: newCust.pincode.trim(),
      gstin: newCust.gstin.trim(),
    };
    const nextCustomers = mergeCustomers([...customers, localCustomer]);
    setCustomers(nextCustomers);
    saveStoredCustomers(
      nextCustomers.map((customer) => ({
        id: customer.id,
        company: customer.company,
        contact: customer.contact,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        state: customer.state,
        district: customer.district,
        pincode: customer.pincode,
        gstin: customer.gstin,
      })),
    );
    setData((d) => ({ ...d, customer: localCustomer.company }));
    try {
      const row = await api.create<Customer>("customers", {
        company: newCust.company.trim(),
        contact: newCust.contact.trim(),
        phone: newCust.phone.trim(),
        email: newCust.email.trim(),
        address: newCust.address.trim(),
        state: newCust.state.trim(),
        district: newCust.district.trim(),
        pincode: newCust.pincode.trim(),
        gstin: newCust.gstin.trim(),
      });
      const syncedCustomers = mergeCustomers(nextCustomers, [row as Customer]);
      setCustomers(syncedCustomers);
      saveStoredCustomers(
        syncedCustomers.map((customer) => ({
          id: customer.id,
          company: customer.company,
          contact: customer.contact,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          state: customer.state,
          district: customer.district,
          pincode: customer.pincode,
          gstin: customer.gstin,
        })),
      );
      setData((d) => ({ ...d, customer: row.company }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Customer saved locally only");
    }
    toast.success("Customer added");
    setNewCust({
      company: "",
      contact: "",
      phone: "",
      email: "",
      address: "",
      state: "",
      district: "",
      pincode: "",
      gstin: "",
    });
    setAdvancedCustomerOpen(false);
    setAddCustOpen(false);
  };

  const selectMaterialType = (rowId: string, value: string) => {
    setData((d) => ({
      ...d,
      materials: d.materials.map((x) => (x.id === rowId ? { ...x, type: value } : x)),
    }));
  };

  const saveMaterialType = () => {
    const materialType = materialTypeDialog.value.trim();
    if (!materialType) return toast.error("Material type required");
    const existingType = materialTypeOptions.find(
      (type) => type.toLowerCase() === materialType.toLowerCase(),
    );
    const selectedType = existingType ?? materialType;

    setCustomMaterialTypes((types) =>
      materialTypeOptions.some((type) => type.toLowerCase() === materialType.toLowerCase())
        ? types
        : [...types, materialType],
    );
    setData((d) => ({
      ...d,
      materials: d.materials.map((x) =>
        x.id === materialTypeDialog.rowId ? { ...x, type: selectedType } : x,
      ),
    }));
    setMaterialTypeDialog({ open: false, rowId: null, value: "" });
    toast.success("Material type added");
  };

  const addInventoryMaterial = (item: StockItem) => {
    const alreadyAdded = data.materials.some((material) => material.stockId === item.id);
    if (alreadyAdded) return toast.error("Material already added");

    setData((d) => ({
      ...d,
      materials: [
        ...d.materials,
        {
          id: crypto.randomUUID(),
          type: item.type,
          thickness: item.thickness || item.material,
          sheets: 1,
          source: "inventory",
          stockId: item.id,
          materialName: item.type,
          unit: item.unit,
        },
      ],
    }));
    toast.success("Material added");
  };

  const validateCurrentStep = () => {
    if (step === 0) {
      if (!data.customer.trim()) return "Select a customer";
      if (!data.name.trim()) return "Project name required";
    }
    if (step === 1) {
      if (!validMaterials.length) return "Add at least one material quantity";
      const unavailable = validMaterials.find((material) => {
        if (material.source !== "inventory" || !material.stockId) return false;
        const stockItem = inventoryStock.find((item) => item.id === material.stockId);
        return !stockItem || Number(material.sheets) > stockItem.quantity;
      });
      if (unavailable)
        return `${unavailable.materialName ?? unavailable.type} exceeds available stock`;
    }
    return "";
  };

  const create = async () => {
    const validationError = validateCurrentStep();
    if (validationError) return toast.error(validationError);

    setCreating(true);
    try {
      const project: Project = {
        id: makeProjectCode(),
        name: data.name || "Untitled project",
        customer: data.customer || "-",
        status: "ongoing",
        progress: 5,
        delivery: data.delivery || "TBD",
        amount: 0,
      };
      const selectedCustomer = customers.find((customer) => customer.company === data.customer);
      const customerId = /^[0-9a-f]{24}$/i.test(selectedCustomer?.id ?? "")
        ? selectedCustomer?.id
        : null;
      const projectRow = await api.create<ApiProject>("projects", {
        name: project.name,
        customerId,
        customerName: project.customer,
        workType: data.workType,
        status: project.status,
        progress: project.progress,
        delivery: data.delivery || null,
        amount: project.amount,
        notes: data.notes.trim(),
        materials: validMaterials.map((material) => ({
          source: material.source,
          stockItemId: material.stockId ?? null,
          materialName:
            material.materialName ??
            (material.source === "new-stock"
              ? `${material.type} ${material.thickness}`
              : material.type),
          materialType: material.type,
          thickness: material.thickness,
          quantity: material.sheets,
          unit: material.unit ?? "sheets",
        })),
        services: services
          .filter((service) => data.selectedServiceIds.includes(service.id))
          .map((service) => ({
            serviceId: /^[0-9a-f]{24}$/i.test(service.id) ? service.id : null,
            serviceName: service.name,
          })),
      });

      // Update or create entries in Stock Management for "New Stock" materials
      const newStockMaterialsToSync = validMaterials.filter((m) => m.source === "new-stock");
      for (const item of newStockMaterialsToSync) {
        const existing = inventoryStock.find(
          (s) =>
            s.type.toLowerCase() === item.type.toLowerCase() &&
            (s.thickness || "").toLowerCase() === (item.thickness || "").toLowerCase(),
        );

        if (existing) {
          const newQuantity = Number(existing.quantity) + Number(item.sheets);
          await apiRequest(`/stock/${existing.id}/quantity`, {
            method: "PATCH",
            body: { quantity: newQuantity },
          });
        } else {
          await api.create("stock", {
            material: item.type,
            type: item.type,
            thickness: item.thickness,
            quantity: Number(item.sheets),
            unit: item.unit || "sheets",
          });
        }
      }

      const savedProject: Project = {
        id: projectRow.code,
        name: projectRow.name,
        customer: projectRow.customerName,
        status: projectRow.status,
        progress: projectRow.progress,
        delivery: projectRow.delivery ?? "TBD",
        amount: Number(projectRow.amount),
      };
      onCreate(savedProject, projectRow.id);
      toast.success("Project created");
      onOpenChange(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          onOpenChange(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[90dvh]">
          <DialogHeader className="shrink-0 border-b border-border bg-background px-5 py-4 sm:px-6">
            <DialogTitle>Create new project</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {/* Stepper */}
            <ol className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <li key={s} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      i < step && "border-primary bg-primary text-primary-foreground",
                      i === step &&
                        "border-primary bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)]",
                      i > step && "border-border text-muted-foreground",
                    )}
                  >
                    {i < step ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs font-medium sm:inline",
                      i === step ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s}
                  </span>
                  {i < STEPS.length - 1 && <span className="ml-1 h-px flex-1 bg-border" />}
                </li>
              ))}
            </ol>

            <div className="mt-4 min-h-[280px] pb-1">
              {step === 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Work Type</Label>
                    <RadioGroup
                      value={data.workType}
                      onValueChange={(v) => setData({ ...data, workType: v as "own" | "job" })}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-[image:var(--gradient-soft)]">
                        <RadioGroupItem value="own" />
                        <span className="text-sm font-medium">Own Work</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-[image:var(--gradient-soft)]">
                        <RadioGroupItem value="job" />
                        <span className="text-sm font-medium">Job Work</span>
                      </label>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Customer</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select
                          value={data.customer}
                          onValueChange={(v) => setData({ ...data, customer: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={c.company}>
                                {c.company}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setAddCustOpen(true)}
                        aria-label="Add new customer"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Project Name</Label>
                    <Input
                      value={data.name}
                      onChange={(e) => setData({ ...data, name: e.target.value })}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Delivery Date</Label>
                    <Input
                      type="date"
                      value={data.delivery}
                      onChange={(e) => setData({ ...data, delivery: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      rows={3}
                      value={data.notes}
                      onChange={(e) => setData({ ...data, notes: e.target.value })}
                      placeholder="Additional details…"
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <Tabs
                    value={materialStage}
                    onValueChange={(value) => setMaterialStage(value as MaterialSource)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <TabsList>
                        <TabsTrigger value="inventory">Use inventry</TabsTrigger>
                        <TabsTrigger value="new-stock">New Stock</TabsTrigger>
                      </TabsList>
                      {materialStage === "inventory" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setInventoryOpen(true)}
                        >
                          <Plus className="mr-1 h-4 w-4" /> Add metrial
                        </Button>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setMaterialTypeDialog({ open: true, rowId: null, value: "" })
                            }
                          >
                            <Plus className="mr-1 h-4 w-4" /> New Material
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setData((d) => ({ ...d, materials: [...d.materials, newMaterial()] }))
                            }
                          >
                            <Plus className="mr-1 h-4 w-4" /> Add material
                          </Button>
                        </div>
                      )}
                    </div>

                    <TabsContent value="inventory" className="mt-3 space-y-2">
                      {inventoryMaterials.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                          No inventory materials selected.
                        </div>
                      )}
                      {inventoryMaterials.map((m, idx) => (
                        <div
                          key={m.id}
                          className="grid items-end gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_120px_90px_auto]"
                        >
                          <div>
                            <Label className="text-xs">Inventory material</Label>
                            <p className="mt-2 text-sm font-medium">
                              {m.materialName ?? m.thickness}
                            </p>
                            <p className="text-xs text-muted-foreground">
                            {m.type} - Available {m.thickness || ""}{" "}
                            {Number((inventoryStock.find((item) => item.id === m.stockId)?.quantity ?? 0).toFixed(2))} {m.unit ?? "units"}
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min={0}
                              value={m.sheets || ""}
                              onChange={(e) =>
                                setData((d) => ({
                                  ...d,
                                  materials: d.materials.map((x) =>
                                    x.id === m.id ? { ...x, sheets: Number(e.target.value) } : x,
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="pb-2 text-sm text-muted-foreground">
                            {m.unit ?? "units"}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setData((d) => ({
                                ...d,
                                materials: d.materials.filter((x) => x.id !== m.id),
                              }))
                            }
                            aria-label={`Remove inventory material ${idx + 1}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="new-stock" className="mt-3 space-y-2">
                      {newStockMaterials.map((m, idx) => (
                        <div
                          key={m.id}
                          className="grid items-end gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_1fr_120px_auto]"
                        >
                          <div className="space-y-1.5">
                            <Label className="text-xs">Material type</Label>
                            <Select
                              value={m.type}
                              onValueChange={(v) => selectMaterialType(m.id, v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {materialTypeOptions.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Thickness</Label>
                            <Select
                              value={m.thickness}
                              onValueChange={(v) =>
                                setData((d) => ({
                                  ...d,
                                  materials: d.materials.map((x) =>
                                    x.id === m.id ? { ...x, thickness: v } : x,
                                  ),
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {THICKNESS_OPTIONS.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Sheets</Label>
                            <Input
                              type="number"
                              min={0}
                              value={m.sheets || ""}
                              onChange={(e) =>
                                setData((d) => ({
                                  ...d,
                                  materials: d.materials.map((x) =>
                                    x.id === m.id ? { ...x, sheets: Number(e.target.value) } : x,
                                  ),
                                }))
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={newStockMaterials.length === 1}
                            onClick={() =>
                              setData((d) => ({
                                ...d,
                                materials: d.materials.filter((x) => x.id !== m.id),
                              }))
                            }
                            aria-label={`Remove material ${idx + 1}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                  <p className="text-right text-sm text-muted-foreground">
                    Total sheets:{" "}
                    <span className="font-semibold text-foreground">{Number(totalSheets.toFixed(2))}</span>
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Select services required for this project.
                  </p>
                  {services.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No services configured. Add some in the Services page.
                    </div>
                  )}
                  {services.map((sv) => {
                    const checked = data.selectedServiceIds.includes(sv.id);
                    return (
                      <label
                        key={sv.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
                          checked
                            ? "border-primary bg-[image:var(--gradient-soft)]"
                            : "border-border",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) =>
                            setData((d) => ({
                              ...d,
                              selectedServiceIds: c
                                ? [...d.selectedServiceIds, sv.id]
                                : d.selectedServiceIds.filter((id) => id !== sv.id),
                            }))
                          }
                        />
                        <span className="text-sm font-medium">{sv.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                    <Row k="Work type" v={data.workType === "own" ? "Own Work" : "Job Work"} />
                    <Row k="Customer" v={data.customer || "—"} />
                    <Row k="Project" v={data.name || "—"} />
                    <Row
                      k="Delivery"
                      v={data.delivery ? formatDateTimeCompact(data.delivery) : "—"}
                    />
                    <Row k="Material quantity" v={String(Number(totalSheets.toFixed(2)))} />
                  </div>
                  <div className="rounded-lg border border-border bg-card">
                    <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Materials
                    </div>
                    <div className="divide-y divide-border">
                      {validMaterials.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between px-4 py-2 text-sm"
                        >
                          <span>
                            {m.materialName ?? m.type}{" "}
                            <span className="text-muted-foreground">({m.thickness})</span>
                          </span>
                          <span className="font-medium">
                            {Number(m.sheets.toFixed(2))} {m.unit ?? "sheets"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card">
                    <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Selected services
                    </div>
                    <div className="divide-y divide-border">
                      {services
                        .filter((sv) => data.selectedServiceIds.includes(sv.id))
                        .map((sv) => (
                          <div key={sv.id} className="px-4 py-2 text-sm">
                            {sv.name}
                          </div>
                        ))}
                      {data.selectedServiceIds.length === 0 && (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          No services selected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-background px-5 py-4 sm:px-6">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => {
                  const validationError = validateCurrentStep();
                  if (validationError) return toast.error(validationError);
                  setStep(step + 1);
                }}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={create} disabled={creating}>
                {creating ? "Creating..." : "Create Order"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick add material type */}
      <Dialog
        open={materialTypeDialog.open}
        onOpenChange={(open) =>
          setMaterialTypeDialog({
            open,
            rowId: open ? materialTypeDialog.rowId : null,
            value: "",
          })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add material type</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Material type</Label>
            <Input
              value={materialTypeDialog.value}
              onChange={(e) =>
                setMaterialTypeDialog((current) => ({ ...current, value: e.target.value }))
              }
              placeholder="Enter material type"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMaterialTypeDialog({ open: false, rowId: null, value: "" })}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveMaterialType}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inventoryOpen} onOpenChange={setInventoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add metrial from inventry</DialogTitle>
          </DialogHeader>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Thickness</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {inventoryStock.map((item) => {
                  const selected = data.materials.some((material) => material.stockId === item.id);
                  return (
                    <tr key={item.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 font-medium">{item.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.thickness || item.material}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant={selected ? "secondary" : "outline"}
                          disabled={selected}
                          onClick={() => addInventoryMaterial(item)}
                        >
                          {selected ? "Added" : "Add"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setInventoryOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick add customer */}
      <Dialog
        open={addCustOpen}
        onOpenChange={(v) => {
          setAddCustOpen(v);
          if (!v) setAdvancedCustomerOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                value={newCust.company}
                onChange={(e) => setNewCust({ ...newCust, company: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Contact name</Label>
                <Input
                  value={newCust.contact}
                  onChange={(e) => setNewCust({ ...newCust, contact: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Button
                type="button"
                variant="ghost"
                className="h-auto px-0 text-sm font-medium text-foreground hover:bg-transparent"
                onClick={() => setAdvancedCustomerOpen((v) => !v)}
              >
                Advanced
                <ChevronDown
                  className={cn(
                    "ml-1 h-4 w-4 transition-transform",
                    advancedCustomerOpen && "rotate-180",
                  )}
                />
              </Button>
            </div>
            {advancedCustomerOpen && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={newCust.address}
                    onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input
                    value={newCust.state}
                    onChange={(e) => setNewCust({ ...newCust, state: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>District</Label>
                  <Input
                    value={newCust.district}
                    onChange={(e) => setNewCust({ ...newCust, district: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Pincode</Label>
                  <Input
                    value={newCust.pincode}
                    onChange={(e) => setNewCust({ ...newCust, pincode: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>GSTIN</Label>
                  <Input
                    value={newCust.gstin}
                    onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCustomer}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
