"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  Package,
  Wrench,
  Recycle,
  FileText,
  Calendar,
  User,
  Hash,
  Info,
  Layers,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api, apiRequest } from "@/lib/api";
import { findWasteAssignment } from "@/lib/waste-assignment-store";
import { DEFAULT_MATERIAL_TYPES } from "@/lib/material-types";
import { cn } from "@/lib/utils";

const THICKNESS_OPTIONS = Array.from({ length: 40 }, (_, index) => `${index + 1}mm`);
const PROJECT_STATUSES = [
  { value: "ongoing", label: "Ongoing", color: "bg-blue-500" },
  { value: "completed", label: "Completed", color: "bg-green-500" },
  { value: "hold", label: "On Hold", color: "bg-yellow-500" },
];
const ADMIN_MANUAL_STAFF_ID = "__admin_manual__";
const ADMIN_MANUAL_STAFF = {
  id: ADMIN_MANUAL_STAFF_ID,
  name: "Admin (Manual Entry)",
  role: "",
};

function normalizeMaterial(material) {
  return {
    id: material.id || crypto.randomUUID(),
    type: material.type || material.materialType || "MDF",
    materialType: material.materialType || material.type || "MDF",
    thickness: material.thickness || "1mm",
    sheets: material.sheets ?? material.quantity ?? 0,
    quantity: material.quantity ?? material.sheets ?? 0,
    source: material.source || "new-stock",
    unit: material.unit || "sheets",
    materialName: material.materialName || material.name || "",
    stockId: material.stockId || null,
  };
}

function newMaterial() {
  return {
    id: crypto.randomUUID(),
    type: "MDF",
    materialType: "MDF",
    thickness: "1mm",
    sheets: 0,
    quantity: 0,
    source: "new-stock",
    unit: "sheets",
    materialName: "",
    stockId: null,
  };
}

function newInventoryMaterial(stockItem) {
  return {
    id: crypto.randomUUID(),
    type: stockItem?.type || "MDF",
    materialType: stockItem?.type || "MDF",
    thickness: stockItem?.thickness || "1mm",
    sheets: 1,
    quantity: 1,
    source: "inventory",
    unit: stockItem?.unit || "sheets",
    materialName: stockItem?.type || "",
    stockId: stockItem?.id || null,
  };
}

function newService() {
  return {
    id: crypto.randomUUID(),
    serviceName: "New Service",
    name: "New Service",
    employeeRole: "",
    unit: "sheet",
    rate: 0,
    price: 0,
    total: 0,
    isNew: true,
  };
}

function newWorkflowStage() {
  return {
    id: crypto.randomUUID(),
    name: "New Stage",
    completed: 0,
    total: 0,
    sortOrder: 0,
    materials: [],
  };
}

function toDateInputValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function projectWasteLabel(project) {
  return `${project.id} - ${project.name}`;
}

function matchesProjectWaste(project, projectId, projectName) {
  return projectId === project.id || (projectName ?? "").startsWith(`${project.id} -`);
}

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

function serviceRoleToStageName(value) {
  const name = String(value ?? "").toLowerCase();
  if (name.includes("press")) return "Pressing";
  if (name.includes("cut")) return "Cutting";
  if (name.includes("edge")) return "Edge band";
  if (name.includes("bor")) return "Boring";
  if (name.includes("pack") || name.includes("deliver")) return "Packing";
  return "";
}

function resolveUsageStageName(service) {
  return (
    serviceRoleToStageName(service?.employeeRole || service?.serviceName) ||
    String(service?.employeeRole || service?.serviceName || "Custom Stage").trim()
  );
}

function getUsageStageContext(service) {
  return {
    stageName: resolveUsageStageName(service),
    isDirectUsageService: isNonMaterialUsageService(service),
  };
}

function isNonMaterialUsageService(service) {
  const serviceId = String(service?.serviceId || "")
    .trim()
    .toLowerCase();
  const role = String(service?.employeeRole || "").toLowerCase();
  const name = String(service?.serviceName || "").toLowerCase();
  return (
    serviceId === "custom" ||
    !role.trim() ||
    role.includes("pack") ||
    role.includes("deliver") ||
    name.includes("pack") ||
    name.includes("deliver")
  );
}

function getServiceIdentity(service) {
  return String(service?.serviceId || service?.id || "").trim();
}

function findUsageStage(project, service) {
  const serviceId = getServiceIdentity(service);
  const { stageName } = getUsageStageContext(service);
  const stages = project?.workflowStages ?? [];
  return (
    stages.find((stage) => String(stage.serviceId || "") === serviceId) ||
    stages.find((stage) => String(stage.name).toLowerCase() === stageName.toLowerCase()) ||
    null
  );
}

function isSameDay(dateValue, reference = new Date()) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function mergeUsageRecords(records = []) {
  const mergedMaterials = new Map();
  for (const record of records) {
    for (const material of record?.materials ?? []) {
      const key = String(material.projectMaterialId);
      const current = mergedMaterials.get(key) ?? {
        projectMaterialId: key,
        materialName: material.materialName,
        materialType: material.materialType,
        thickness: material.thickness,
        unit: material.unit || "units",
        quantityUsed: 0,
      };
      current.quantityUsed += Number(material.quantityUsed ?? 0);
      mergedMaterials.set(key, current);
    }
  }

  return [...mergedMaterials.values()];
}

function getAssignedStaffStatus(project, staffId) {
  const entry = (project?.assignedStaff ?? []).find(
    (item) => String(item.userId || item.id || "") === String(staffId || ""),
  );
  return entry?.status || "Not started";
}

const ProjectEditDialog = ({ action, project, loading, onProjectChange, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState("details");
  const [materialStage, setMaterialStage] = useState("all");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryStock, setInventoryStock] = useState([]);
  const [wasteRows, setWasteRows] = useState([]);
  const [wasteLoading, setWasteLoading] = useState(false);
  const [nextWasteCode, setNextWasteCode] = useState("W001");
  const [newWasteMaterial, setNewWasteMaterial] = useState("");
  const [newWasteSize, setNewWasteSize] = useState("");
  const [newWasteNote, setNewWasteNote] = useState("");
  const [selectedWasteToUse, setSelectedWasteToUse] = useState("none");
  const [isSaving, setIsSaving] = useState(false);
  const [staffOptions, setStaffOptions] = useState([]);
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [usageTargetIndex, setUsageTargetIndex] = useState(null);
  const [usageStaffId, setUsageStaffId] = useState("");
  const [usageNote, setUsageNote] = useState("");
  const [usageStatus, setUsageStatus] = useState("In progress");
  const [usageDirectValue, setUsageDirectValue] = useState(0);
  const [usageRows, setUsageRows] = useState([]);
  const [stageAllocationRows, setStageAllocationRows] = useState([]);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [materialTypes, setMaterialTypes] = useState(
    DEFAULT_MATERIAL_TYPES.map((label) => ({
      id: `default:${label.toLowerCase()}`,
      label,
      source: "default",
    })),
  );
  const [materialTypeDialog, setMaterialTypeDialog] = useState({
    open: false,
    value: "",
  });

  // Normalize materials when project changes
  useEffect(() => {
    if (project && project.materials) {
      const normalizedMaterials = project.materials.map(normalizeMaterial);
      if (JSON.stringify(normalizedMaterials) !== JSON.stringify(project.materials)) {
        onProjectChange((current) => ({
          ...current,
          materials: normalizedMaterials,
        }));
      }
    }
  }, [project?.id]);

  const update = (key, value) => {
    if (project) {
      onProjectChange((current) => ({ ...current, [key]: value }));
    }
  };

  const updateMaterial = (index, key, value) => {
    if (!project) return;
    onProjectChange((current) => {
      const materials = [...(current.materials ?? [])];
      const nextRow = { ...materials[index] };
      if (key === "materialType" || key === "type") {
        nextRow.materialType = value;
        nextRow.type = value;
      } else if (key === "quantity" || key === "sheets") {
        nextRow.quantity = value;
        nextRow.sheets = value;
      } else {
        nextRow[key] = value;
      }
      materials[index] = nextRow;
      return { ...current, materials };
    });
  };

  const updateService = (index, key, value) => {
    if (!project) return;
    onProjectChange((current) => {
      const services = [...(current.services ?? [])];
      const nextRow = { ...services[index] };
      if (key === "price" || key === "rate") {
        nextRow.price = value;
        nextRow.rate = value;
        nextRow.total = Number(nextRow.usage ?? nextRow.quantity ?? 0) * Number(value ?? 0);
        nextRow.amount = nextRow.total;
      } else if (key === "quantity") {
        nextRow.quantity = value;
        nextRow.total = Number(value ?? 0) * Number(nextRow.price ?? nextRow.rate ?? 0);
        nextRow.amount = nextRow.total;
      } else if (key === "serviceName" && !nextRow.serviceId) {
        nextRow.serviceName = value;
      } else {
        nextRow[key] = value;
      }
      services[index] = nextRow;
      return { ...current, services };
    });
  };

  const updateServiceSelection = (index, value) => {
    if (!project) return;
    const selected = serviceOptions.find((item) => item.id === value);
    onProjectChange((current) => {
      const services = [...(current.services ?? [])];
      if (!services[index]) return current;

      if (value === "custom") {
        services[index] = {
          ...services[index],
          serviceId: "",
          serviceName: services[index].serviceName || "",
          employeeRole: "",
          unit: services[index].unit || "sheet",
          price: Number(services[index].price ?? services[index].rate ?? 0),
          rate: Number(services[index].rate ?? services[index].price ?? 0),
          total:
            Number(services[index].quantity ?? 1) *
            Number(services[index].price ?? services[index].rate ?? 0),
          amount:
            Number(services[index].quantity ?? 1) *
            Number(services[index].price ?? services[index].rate ?? 0),
        };
      } else {
        services[index] = {
          ...services[index],
          serviceId: selected?.id ?? value,
          serviceName: selected?.name ?? services[index].serviceName,
          employeeRole: selected?.employeeRole ?? services[index].employeeRole ?? "",
          unit: selected?.unit ?? services[index].unit ?? "sheet",
          price: Number(selected?.price ?? services[index].price ?? 0),
          rate: Number(selected?.price ?? services[index].rate ?? 0),
          total:
            Number(services[index].quantity ?? 1) *
            Number(selected?.price ?? services[index].price ?? 0),
          amount:
            Number(services[index].quantity ?? 1) *
            Number(selected?.price ?? services[index].price ?? 0),
        };
      }

      return { ...current, services };
    });
  };

  const updateStage = (index, key, value) => {
    if (!project) return;
    onProjectChange((current) => {
      const workflowStages = [...(current.workflowStages ?? [])];
      workflowStages[index] = { ...workflowStages[index], [key]: value };
      return { ...current, workflowStages };
    });
  };

  const addMaterial = () => {
    if (!project) return;
    const newMat = newMaterial();
    onProjectChange((current) => ({
      ...current,
      materials: [...(current.materials ?? []), newMat],
    }));
  };

  const addInventoryMaterial = (stockItem) => {
    if (!project) return;
    const newMat = newInventoryMaterial(stockItem);
    onProjectChange((current) => ({
      ...current,
      materials: [...(current.materials ?? []), newMat],
    }));
    toast.success("Material added from inventory");
    setInventoryOpen(false);
  };

  const addService = () => {
    if (!project) return;
    onProjectChange((current) => ({
      ...current,
      services: [...(current.services ?? []), newService()],
    }));
  };

  const addStage = () => {
    if (!project) return;
    onProjectChange((current) => ({
      ...current,
      workflowStages: [...(current.workflowStages ?? []), newWorkflowStage()],
    }));
  };

  const openUsageModal = (service, index) => {
    if (!project) return;
    const { stageName, isDirectUsageService } = getUsageStageContext(service);
    const stage = findUsageStage(project, service);

    const matchingStaff =
      staffOptions.find((staff) => {
        const staffRole = String(staff.role || "").toLowerCase();
        return staffRole && staffRole === String(service.employeeRole || "").toLowerCase();
      }) || null;
    const fallbackStaff = matchingStaff || ADMIN_MANUAL_STAFF;

    const matchingUsageRecords = (stage?.usageHistory ?? []).filter((entry) => {
      const sameDay = isSameDay(entry.createdAt);
      const userMatches =
        fallbackStaff.id === ADMIN_MANUAL_STAFF_ID
          ? Boolean(entry.isAdminOverride) || !entry.userId
          : String(entry.userId || "") === String(fallbackStaff.id || "") ||
            String(entry.staffName || "")
              .trim()
              .toLowerCase() ===
              String(fallbackStaff.name || "")
                .trim()
                .toLowerCase();
      return sameDay && userMatches;
    });
    const latestUsageRecord =
      [...matchingUsageRecords].sort(
        (a, b) =>
          new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime() -
          new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime(),
      )[0] || null;

    setUsageTargetIndex(index);
    setUsageStaffId(fallbackStaff.id);
    setUsageStatus(
      getAssignedStaffStatus(project, fallbackStaff.id) || stage?.staffStatus || "Not started",
    );
    setUsageNote(latestUsageRecord?.note || "");
    setUsageDirectValue(
      Number(
        latestUsageRecord?.directUsage ??
          (isDirectUsageService ? (service?.usage ?? service?.quantity ?? 0) : 0),
      ),
    );
    setUsageRows(
      isDirectUsageService
        ? []
        : (stage?.materials ?? []).map((material) => ({
            projectMaterialId: material.projectMaterialId,
            materialName: material.materialName,
            materialType: material.materialType,
            thickness: material.thickness,
            unit: material.unit || "units",
            quantityUsed: Number(material.completedQuantity ?? 0),
          })),
    );
    setStageAllocationRows(
      stage?.materials?.length || isDirectUsageService
        ? []
        : (project.materials ?? []).map((material) => ({
            projectMaterialId: material.id,
            materialName: material.materialName || material.materialType || material.type,
            materialType: material.materialType || material.type || "",
            thickness: material.thickness || "",
            unit: material.unit || "units",
            requiredQuantity: Number(material.quantity ?? material.sheets ?? 0),
          })),
    );
    setUsageModalOpen(true);
  };

  const saveDailyUsage = async () => {
    if (!project || usageTargetIndex === null) return;
    const service = project.services?.[usageTargetIndex];
    if (!service) return;

    const { stageName, isDirectUsageService } = getUsageStageContext(service);
    const selectedStaff =
      staffOptions.find((staff) => staff.id === usageStaffId) ||
      (usageStaffId === ADMIN_MANUAL_STAFF_ID ? ADMIN_MANUAL_STAFF : null);
    const isAdminOverride = !selectedStaff || selectedStaff.id === ADMIN_MANUAL_STAFF_ID;
    const stage = findUsageStage(project, service);
    const stageHasMaterials = Boolean(stage?.materials?.length);

    const materials = usageRows.map((row) => ({
      projectMaterialId: row.projectMaterialId,
      quantityUsed: Number(row.quantityUsed ?? 0),
    }));
    const directUsage = Math.max(0, Number(usageDirectValue ?? 0));

    if (!materials.length && !directUsage && !usageStatus.trim() && !usageNote.trim()) {
      toast.error("Add usage, update status, or add a note");
      return;
    }

    try {
      const note =
        usageNote.trim() ||
        (isDirectUsageService ? "Custom service usage" : isAdminOverride ? "Admin override" : "");
      if (!stageHasMaterials && !isDirectUsageService) {
        const allocationMaterials = stageAllocationRows
          .map((row) => ({
            projectMaterialId: row.projectMaterialId,
            requiredQuantity: Number(row.requiredQuantity ?? 0),
          }))
          .filter((row) => row.requiredQuantity > 0);

        if (!allocationMaterials.length) {
          toast.error("Assign materials to this stage first");
          return;
        }

        await api.create(
          `projects/${project.id}/stages/${encodeURIComponent(stageName)}/allocation`,
          {
            role: isAdminOverride
              ? service.employeeRole || ""
              : selectedStaff.role || service.employeeRole || "",
            staffName: isAdminOverride ? ADMIN_MANUAL_STAFF.name : selectedStaff.name,
            materials: allocationMaterials,
          },
        );
      }
      await api.create(`projects/${project.id}/stages/${encodeURIComponent(stageName)}/usage`, {
        serviceId: getServiceIdentity(service),
        userId: isAdminOverride ? null : selectedStaff.id,
        role: isAdminOverride
          ? service.employeeRole || ""
          : selectedStaff.role || service.employeeRole || "",
        staffName: isAdminOverride ? ADMIN_MANUAL_STAFF.name : selectedStaff.name,
        stageStatus: usageStatus,
        note,
        usageMode: "absolute",
        isAdminOverride,
        directUsage: isDirectUsageService ? directUsage : undefined,
        materials,
      });
      const updated = await api.get("projects", project.id);
      onProjectChange(updated);
      setUsageModalOpen(false);
      toast.success("Daily usage saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save daily usage");
    }
  };

  const saveStageAllocationFromUsageModal = async () => {
    if (!project || usageTargetIndex === null) return;
    const service = project.services?.[usageTargetIndex];
    if (!service) return;

    const { stageName, isDirectUsageService } = getUsageStageContext(service);
    if (isDirectUsageService) {
      toast.error("Custom services can be saved directly without assigning materials");
      return;
    }
    const selectedStaff =
      staffOptions.find((staff) => staff.id === usageStaffId) ||
      (usageStaffId === ADMIN_MANUAL_STAFF_ID ? ADMIN_MANUAL_STAFF : null);

    const materials = stageAllocationRows
      .map((row) => ({
        projectMaterialId: row.projectMaterialId,
        requiredQuantity: Number(row.requiredQuantity ?? 0),
      }))
      .filter((row) => row.requiredQuantity > 0);

    if (!materials.length) {
      toast.error("Enter required quantity for at least one material");
      return;
    }

    try {
      await api.create(
        `projects/${project.id}/stages/${encodeURIComponent(stageName)}/allocation`,
        {
          role: selectedStaff?.role || service.employeeRole || "",
          staffName: selectedStaff?.name || ADMIN_MANUAL_STAFF.name,
          materials,
        },
      );
      const updated = await api.get("projects", project.id);
      onProjectChange(updated);
      setUsageModalOpen(false);
      toast.success("Stage materials assigned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign stage materials");
    }
  };

  useEffect(() => {
    if (!usageModalOpen || usageTargetIndex === null || !project?.services?.[usageTargetIndex]) {
      return;
    }

    const service = project.services[usageTargetIndex];
    const { stageName, isDirectUsageService } = getUsageStageContext(service);
    const stage = findUsageStage(project, service);
    const selectedStaff =
      staffOptions.find((staff) => staff.id === usageStaffId) ||
      (usageStaffId === ADMIN_MANUAL_STAFF_ID ? ADMIN_MANUAL_STAFF : null);
    const matchingUsageRecords = (stage?.usageHistory ?? []).filter((entry) => {
      const sameDay = isSameDay(entry.createdAt);
      const userMatches =
        selectedStaff?.id === ADMIN_MANUAL_STAFF_ID
          ? Boolean(entry.isAdminOverride) || !entry.userId
          : selectedStaff
            ? String(entry.userId || "") === String(selectedStaff.id || "") ||
              String(entry.staffName || "")
                .trim()
                .toLowerCase() ===
                String(selectedStaff.name || "")
                  .trim()
                  .toLowerCase()
            : true;
      return sameDay && userMatches;
    });
    const latestUsageRecord =
      [...matchingUsageRecords].sort(
        (a, b) =>
          new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime() -
          new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime(),
      )[0] || null;

    setUsageStatus(
      getAssignedStaffStatus(project, selectedStaff?.id) || stage?.staffStatus || "Not started",
    );
    setUsageNote(latestUsageRecord?.note || "");
    setUsageDirectValue(
      Number(
        latestUsageRecord?.directUsage ??
          (isDirectUsageService ? (service?.usage ?? service?.quantity ?? 0) : 0),
      ),
    );
    setUsageRows(
      isDirectUsageService
        ? []
        : (stage?.materials ?? []).map((material) => ({
            projectMaterialId: material.projectMaterialId,
            materialName: material.materialName,
            materialType: material.materialType,
            thickness: material.thickness,
            unit: material.unit || "units",
            quantityUsed: Number(
              latestUsageRecord?.materials?.find(
                (entryMaterial) => entryMaterial.projectMaterialId === material.projectMaterialId,
              )?.quantityUsed ?? 0,
            ),
          })),
    );
  }, [usageModalOpen, usageTargetIndex, usageStaffId, staffOptions, project]);

  const materialTypeValue = useCallback(
    (material) => {
      return materialTypes.some((item) => item.label === material.materialType)
        ? material.materialType
        : "__custom__";
    },
    [materialTypes],
  );

  const serviceValue = useCallback((service) => {
    if (!service?.serviceId) return "custom";
    return service.serviceId;
  }, []);

  const totalSheets = useMemo(() => {
    return (project?.materials ?? []).reduce(
      (sum, m) => sum + (Number(m.sheets || m.quantity) || 0),
      0,
    );
  }, [project?.materials]);

  const serviceTotal = useMemo(() => {
    return (project?.services ?? []).reduce((sum, sv) => {
      const quantity = Number(sv.usage ?? sv.quantity ?? 1);
      const rate = Number(sv.price ?? sv.rate ?? 0);
      return sum + Number(sv.amount ?? sv.total ?? quantity * rate);
    }, 0);
  }, [project?.services]);

  const taxType = project?.taxType || "percent";
  const taxValue = Number(project?.taxValue ?? 0);
  const discountType = project?.discountType || "amount";
  const discountValue = Number(project?.discountValue ?? 0);
  const discountAmount = useMemo(() => {
    return discountType === "percent" ? (serviceTotal * discountValue) / 100 : discountValue;
  }, [serviceTotal, discountType, discountValue]);
  const taxAmount = useMemo(() => {
    return taxType === "percent" ? ((serviceTotal - discountAmount) * taxValue) / 100 : taxValue;
  }, [serviceTotal, discountAmount, taxType, taxValue]);
  const discountedBase = Math.max(0, serviceTotal - discountAmount);
  const grandTotal = Math.max(0, discountedBase + taxAmount);

  const progressPercentage = useMemo(() => {
    const stages = project?.workflowStages ?? [];
    if (stages.length === 0) return 0;
    const totalTotal = stages.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalCompleted = stages.reduce((sum, s) => sum + Number(s.completed || 0), 0);
    return totalTotal > 0 ? Math.round((totalCompleted / totalTotal) * 100) : 0;
  }, [project?.workflowStages]);

  // Load inventory stock
  useEffect(() => {
    let active = true;

    const loadInventory = async () => {
      try {
        const stockRows = await api.list("stock");
        if (!active) return;
        setInventoryStock(
          (stockRows ?? []).map((row) => ({
            id: row.id,
            material: row.material,
            type: row.type,
            thickness: row.thickness ?? "",
            quantity: Number(row.quantity),
            unit: row.unit,
          })),
        );
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Unable to load inventory");
      }
    };

    loadInventory();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadServiceOptions = async () => {
      try {
        const [serviceResult, materialTypeResult, staffResult] = await Promise.allSettled([
          api.list("services"),
          apiRequest("stock/material-types"),
          api.list("staff", { limit: 100 }),
        ]);
        if (!active) return;
        if (serviceResult.status === "fulfilled") {
          setServiceOptions(
            (serviceResult.value ?? []).map((row) => ({
              id: row.id,
              name: row.name,
              unit: row.unit ?? "sheet",
              price: Number(row.price ?? 0),
              employeeRole: row.employeeRole ?? "",
            })),
          );
        } else {
          toast.error(
            serviceResult.reason instanceof Error
              ? serviceResult.reason.message
              : "Unable to load services",
          );
        }
        if (materialTypeResult.status === "fulfilled") {
          setMaterialTypes([
            ...(materialTypeResult.value?.defaults ?? []),
            ...(materialTypeResult.value?.custom ?? []),
          ]);
        } else {
          setMaterialTypes(
            DEFAULT_MATERIAL_TYPES.map((label) => ({
              id: `default:${label.toLowerCase()}`,
              label,
              source: "default",
            })),
          );
        }

        if (staffResult.status === "fulfilled") {
          setStaffOptions(
            (staffResult.value ?? []).map((row) => ({
              id: row.id,
              name: row.name,
              role: row.role || row.employeeRole || "",
            })),
          );
        }
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Unable to load services");
      }
    };

    void loadServiceOptions();

    return () => {
      active = false;
    };
  }, []);

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
          api.list("waste"),
          apiRequest("/waste/next-code"),
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
        .map((material) => material.materialName || material.materialType || material.type)
        .filter(Boolean),
    ),
  );

  const createWasteForProject = async () => {
    if (!project) return;
    if (!newWasteMaterial.trim()) {
      toast.error("Waste material is required");
      return;
    }

    try {
      const saved = await api.create("waste", {
        code: nextWasteCode,
        material: newWasteMaterial.trim(),
        projectId: project.id,
        projectName: projectWasteLabel(project),
        size: newWasteSize.trim() || null,
        note: newWasteNote.trim() || null,
      });
      setWasteRows((current) => [mapProjectWasteMaterial(saved), ...current]);
      const next = await apiRequest("/waste/next-code");
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
    if (selectedWasteToUse === "none") {
      toast.error("Select a waste item first");
      return;
    }

    const wasteItem = availableWaste.find((row) => row.backendId === selectedWasteToUse);
    if (!wasteItem?.backendId) {
      toast.error("Selected waste item was not found");
      return;
    }

    try {
      const updated = await api.update("waste", wasteItem.backendId, {
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

  const unlinkWasteFromProject = async (wasteItem) => {
    if (!wasteItem.backendId) return;

    try {
      const updated = await api.update("waste", wasteItem.backendId, {
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

  const saveMaterialType = async () => {
    const materialType = materialTypeDialog.value.trim();
    if (!materialType) {
      toast.error("Material type required");
      return;
    }

    try {
      await apiRequest("stock/material-types", {
        method: "POST",
        body: { label: materialType },
      });
      toast.success("Material type added");
      setMaterialTypeDialog({ open: false, value: "" });
      const materialTypeRows = await apiRequest("stock/material-types");
      setMaterialTypes([
        ...(materialTypeRows?.defaults ?? []),
        ...(materialTypeRows?.custom ?? []),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add material type");
    }
  };

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      await onSave(project);
    } finally {
      setIsSaving(false);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage < 30) return "bg-red-500";
    if (percentage < 60) return "bg-yellow-500";
    if (percentage < 90) return "bg-blue-500";
    return "bg-green-500";
  };

  const filteredMaterials = project?.materials ?? [];
  const inventoryMaterials = (project?.materials ?? []).filter((m) => m.source === "inventory");
  const newStockMaterials = (project?.materials ?? []).filter(
    (m) => m.source === "new-stock" || !m.source,
  );

  return (
    <Dialog open={Boolean(project) || loading} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="left-auto right-0 top-0 flex h-dvh max-h-dvh w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 sm:max-w-6xl sm:rounded-none">
        <DialogHeader className="border-b border-border bg-background px-5 py-4 pr-12 sm:px-6">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                {action === "update" ? "Edit Project" : "Project Details"}
              </DialogTitle>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono bg-muted/30 px-2 py-0.5 rounded">
                  {project?.code || "Loading..."}
                </span>
                <span className="h-4 w-px bg-border" />
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {project?.customerName || "No customer"}
                </span>
                {project?.status && (
                  <>
                    <span className="h-4 w-px bg-border" />
                    <Badge variant="outline" className="capitalize">
                      {project.status}
                    </Badge>
                  </>
                )}
              </div>
            </div>
            {project && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="text-sm font-semibold">{progressPercentage}%</p>
                </div>
                <div className="hidden sm:block h-8 w-32 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      getProgressColor(progressPercentage),
                    )}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/10 px-4 py-4 sm:px-6">
          {loading && (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Loading project details...</p>
              </div>
            </div>
          )}

          {project && (
            <div className="mx-auto max-w-5xl">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 bg-muted/30 p-1 rounded-xl">
                  <TabsTrigger
                    value="details"
                    className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Details</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="materials"
                    className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">Materials</span>
                    {(project.materials ?? []).length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                        {project.materials.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="services"
                    className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline">Services</span>
                    {(project.services ?? []).length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                        {project.services.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="waste"
                    className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Recycle className="h-4 w-4" />
                    <span className="hidden sm:inline">Waste</span>
                    {createdWaste.length + usedWaste.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                        {createdWaste.length + usedWaste.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
                      <p className="text-xs text-muted-foreground">Total Materials</p>
                      <p className="text-lg font-semibold">{totalSheets.toFixed(1)} units</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
                      <p className="text-xs text-muted-foreground">Service Total</p>
                      <p className="text-lg font-semibold">
                        ₹{serviceTotal.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
                      <p className="text-xs text-muted-foreground">Workflow Stages</p>
                      <p className="text-lg font-semibold">{project.workflowStages?.length || 0}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
                      <p className="text-xs text-muted-foreground">Progress</p>
                      <p className="text-lg font-semibold">{progressPercentage}%</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-background shadow-sm">
                    <div className="border-b border-border px-4 py-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        Project Information
                      </h3>
                    </div>
                    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Hash className="h-3.5 w-3.5" />
                          Project Code
                        </Label>
                        <Input
                          value={project.code || ""}
                          readOnly
                          className="bg-muted/30 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Package className="h-3.5 w-3.5" />
                          Project Name
                        </Label>
                        <Input
                          value={project.name || ""}
                          onChange={(e) => update("name", e.target.value)}
                          placeholder="Enter project name"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          Customer
                        </Label>
                        <Input
                          value={project.customerName || ""}
                          readOnly
                          className="bg-muted/30"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          Delivery Date
                        </Label>
                        <Input
                          type="date"
                          value={toDateInputValue(project.delivery)}
                          onChange={(e) => update("delivery", e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Layers className="h-3.5 w-3.5" />
                          Work Type
                        </Label>
                        <Select
                          value={project.workType || "own"}
                          onValueChange={(value) => update("workType", value)}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="own">Own Work</SelectItem>
                            <SelectItem value="job">Job Work</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Status
                        </Label>
                        <Select
                          value={project.status || "ongoing"}
                          onValueChange={(value) => update("status", value)}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_STATUSES.map((status, index) => (
                              <SelectItem key={`${status.value}-${index}`} value={status.value}>
                                <div className="flex items-center gap-2">
                                  <span className={cn("h-2 w-2 rounded-full", status.color)} />
                                  {status.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          Notes
                        </Label>
                        <Textarea
                          className="min-h-20 bg-background"
                          value={project.notes ?? ""}
                          onChange={(e) => update("notes", e.target.value)}
                          placeholder="Additional project details..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-background shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        Workflow Progress
                      </h3>
                      <Button type="button" variant="outline" size="sm" onClick={addStage}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add Stage
                      </Button>
                    </div>
                    <div className="space-y-3 p-4">
                      {(project.workflowStages ?? []).map((stage, index) => (
                        <div
                          key={`stage-${index}-${stage?.id}`}
                          className="group flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 transition-colors hover:bg-muted/20 sm:flex-row sm:items-end"
                        >
                          <div className="flex-1 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Stage Name</Label>
                            <Input
                              value={stage?.name}
                              onChange={(e) => updateStage(index, "name", e.target.value)}
                              placeholder="Stage name"
                              className="bg-background"
                            />
                          </div>
                          <div className="w-full space-y-1.5 sm:w-28">
                            <Label className="text-xs text-muted-foreground">Completed</Label>
                            <Input
                              type="number"
                              min={0}
                              value={stage?.completed}
                              onChange={(e) =>
                                updateStage(index, "completed", Number(e.target.value))
                              }
                              className="bg-background"
                            />
                          </div>
                          <div className="w-full space-y-1.5 sm:w-28">
                            <Label className="text-xs text-muted-foreground">Total</Label>
                            <Input
                              type="number"
                              min={0}
                              value={stage?.total}
                              onChange={(e) => updateStage(index, "total", Number(e.target.value))}
                              className="bg-background"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              onProjectChange((current) => ({
                                ...current,
                                workflowStages: (current.workflowStages ?? []).filter(
                                  (_, i) => i !== index,
                                ),
                              }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {(project.workflowStages ?? []).length === 0 && (
                        <div className="py-6 text-center">
                          <Layers className="mx-auto h-8 w-8 text-muted-foreground/40" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            No workflow stages added.
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={addStage}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Add your first stage
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Materials Tab - Fixed with proper tabs and display */}
                <TabsContent value="materials" className="space-y-6">
                  <div className="rounded-lg border border-border bg-background shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        Materials
                        <Badge variant="secondary" className="ml-1">
                          {(project.materials ?? []).length}
                        </Badge>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMaterialTypeDialog({ open: true, value: "" })}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          New Type
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInventoryOpen(true)}
                        >
                          <Package className="mr-1 h-3.5 w-3.5" />
                          From Inventory
                        </Button>
                        <Button type="button" variant="default" size="sm" onClick={addMaterial}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add Material
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      {filteredMaterials.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center">
                          <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            {materialStage === "all" && "No materials added yet."}
                            {materialStage === "inventory" && "No inventory materials selected."}
                            {materialStage === "new-stock" && "No new stock materials added."}
                          </p>
                          <div className="mt-3 flex flex-wrap justify-center gap-2">
                            {materialStage === "inventory" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setInventoryOpen(true)}
                              >
                                <Package className="mr-1 h-4 w-4" />
                                Browse Inventory
                              </Button>
                            )}
                            {(materialStage === "all" || materialStage === "new-stock") && (
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={addMaterial}
                              >
                                <Plus className="mr-1 h-4 w-4" />
                                Add New Stock
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {filteredMaterials.map((material, index) => {
                        const actualIndex = project.materials.indexOf(material);
                        const isInventory = material.source === "inventory";

                        return (
                          <div
                            key={`${material.id}-${index}`}
                            className={cn(
                              "group rounded-lg border p-4 transition-colors",
                              isInventory
                                ? "border-blue-200/60 bg-blue-50/30 hover:bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20"
                                : "border-border/60 bg-muted/5 hover:bg-muted/10",
                            )}
                          >
                            {isInventory ? (
                              // Inventory Material Layout
                              <div className="grid gap-3 sm:grid-cols-[1fr_120px_90px_40px]">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] text-blue-600 dark:text-blue-400"
                                    >
                                      Inventory
                                    </Badge>
                                    <Label className="text-xs text-muted-foreground">
                                      Material
                                    </Label>
                                  </div>
                                  <p className="text-sm font-medium">
                                    {material.materialName ||
                                      material.type ||
                                      material.materialType}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {material.type || material.materialType} - {material.thickness}
                                    {material.stockId && (
                                      <span className="ml-2 text-[10px] text-muted-foreground/60">
                                        Stock: {material.stockId}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={material.sheets || material.quantity || 0}
                                    onChange={(e) => {
                                      const value = Number(e.target.value);
                                      updateMaterial(actualIndex, "sheets", value);
                                      updateMaterial(actualIndex, "quantity", value);
                                    }}
                                    className="bg-background"
                                  />
                                </div>
                                <div className="flex items-end pb-2 text-sm text-muted-foreground">
                                  {material.unit || "units"}
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                      onProjectChange((current) => ({
                                        ...current,
                                        materials: (current.materials ?? []).filter(
                                          (_, i) => i !== actualIndex,
                                        ),
                                      }));
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // New Stock Material Layout
                              <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr_100px_40px]">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">
                                    Material Type
                                  </Label>
                                  <Select
                                    value={materialTypeValue(material)}
                                    onValueChange={(value) => {
                                      if (value === "__custom__") {
                                        updateMaterial(
                                          actualIndex,
                                          "materialType",
                                          material.materialType || "",
                                        );
                                        return;
                                      }
                                      updateMaterial(actualIndex, "materialType", value);
                                      updateMaterial(actualIndex, "type", value);
                                    }}
                                  >
                                    <SelectTrigger className="bg-background">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {materialTypes.map((type, index) => (
                                        <SelectItem key={`${type.id}-${index}`} value={type.label}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="__custom__">Custom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {materialTypeValue(material) === "__custom__" && (
                                    <Input
                                      className="mt-2 bg-background"
                                      value={material.materialType || ""}
                                      onChange={(e) => {
                                        updateMaterial(actualIndex, "materialType", e.target.value);
                                        updateMaterial(actualIndex, "type", e.target.value);
                                      }}
                                      placeholder="Enter custom type"
                                    />
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Thickness</Label>
                                  <Select
                                    value={material.thickness ?? ""}
                                    onValueChange={(value) =>
                                      updateMaterial(actualIndex, "thickness", value)
                                    }
                                  >
                                    <SelectTrigger className="bg-background">
                                      <SelectValue placeholder="Select thickness" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {THICKNESS_OPTIONS.map((thickness) => (
                                        <SelectItem key={thickness} value={thickness}>
                                          {thickness}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Sheets</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={material.sheets || material.quantity || 0}
                                    onChange={(e) => {
                                      const value = Number(e.target.value);
                                      updateMaterial(actualIndex, "sheets", value);
                                      updateMaterial(actualIndex, "quantity", value);
                                    }}
                                    className="bg-background"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Unit</Label>
                                  <Input
                                    value={material.unit || ""}
                                    onChange={(e) =>
                                      updateMaterial(actualIndex, "unit", e.target.value)
                                    }
                                    placeholder="sheets"
                                    className="bg-background"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={
                                      newStockMaterials.length <= 1 && materialStage === "new-stock"
                                    }
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                      onProjectChange((current) => ({
                                        ...current,
                                        materials: (current.materials ?? []).filter(
                                          (_, i) => i !== actualIndex,
                                        ),
                                      }));
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {(project.materials ?? []).length > 0 && (
                        <div className="flex items-center justify-between border-t border-border/60 pt-3">
                          <p className="text-xs text-muted-foreground">
                            Total {project.materials.length} material entries
                            {inventoryMaterials.length > 0 && (
                              <span className="ml-2 text-blue-600 dark:text-blue-400">
                                ({inventoryMaterials.length} from inventory)
                              </span>
                            )}
                            {newStockMaterials.length > 0 && (
                              <span className="ml-2 text-muted-foreground">
                                ({newStockMaterials.length} new stock)
                              </span>
                            )}
                          </p>
                          <p className="text-sm font-medium">
                            Total:{" "}
                            <span className="text-primary">{totalSheets.toFixed(2)} units</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Services Tab */}
                <TabsContent value="services" className="space-y-6">
                  <div className="rounded-lg border border-border bg-background shadow-sm">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        Services Used
                        <Badge variant="secondary" className="ml-1">
                          {(project.services ?? []).length}
                        </Badge>
                      </h3>
                      <Button type="button" variant="default" size="sm" onClick={addService}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add Service
                      </Button>
                    </div>

                    <div className="space-y-4 p-4">
                      {/* Table Header - Desktop */}
                      <div className="hidden rounded-lg bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_40px]">
                        <div>Service</div>
                        <div>Price (₹)</div>
                        <div>Usage</div>
                        <div>Amount (₹)</div>
                        <div className="text-right">Action</div>
                      </div>

                      {/* Service Rows */}
                      {(project.services ?? []).map((service, index) => (
                        <div
                          key={`service-${index}-${service.id}`}
                          className="group rounded-lg border border-border/60 bg-background p-3 transition-all hover:border-primary/30 hover:shadow-sm sm:p-3"
                        >
                          <div className="grid gap-2 sm:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_40px] sm:gap-3">
                            {/* Service Select / Name */}
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground sm:hidden">
                                Service
                              </Label>
                              {service?.isNew ? (
                                <>
                                  <Select
                                    value={serviceValue(service)}
                                    onValueChange={(value) => updateServiceSelection(index, value)}
                                  >
                                    <SelectTrigger className="h-9 bg-background text-sm">
                                      <SelectValue placeholder="Select service" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {serviceOptions.map((option, index) => (
                                        <SelectItem
                                          key={`service-option-${index}-${option.id}`}
                                          value={option.id}
                                        >
                                          {option.name}
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {serviceValue(service) === "custom" && (
                                    <Input
                                      value={service.serviceName || service.name || ""}
                                      onChange={(e) =>
                                        updateService(index, "serviceName", e.target.value)
                                      }
                                      placeholder="Custom service name"
                                      className="h-9 bg-background text-sm"
                                    />
                                  )}
                                </>
                              ) : (
                                <>
                                  <Input
                                    value={service.serviceName || service.name || ""}
                                    // onChange={(e) => updateService(index, "serviceName", e.target.value)}
                                    placeholder="Custom service name"
                                    className="h-9 bg-background text-sm"
                                  />
                                </>
                              )}
                            </div>

                            {/* Price - Editable */}
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground sm:hidden">
                                Price (₹)
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={service.price ?? service.rate ?? 0}
                                onChange={(e) => {
                                  const rate = Number(e.target.value);
                                  updateService(index, "price", rate);
                                  updateService(index, "rate", rate);
                                  updateService(
                                    index,
                                    "total",
                                    rate * Number(service.quantity ?? 1),
                                  );
                                }}
                                className="h-9 bg-background text-sm hover:border-primary/50 focus:ring-1 focus:ring-primary"
                              />
                            </div>

                            {/* Usage - Editable */}
                            <div
                              onClick={() => openUsageModal(service, index)}
                              className="space-y-1"
                            >
                              <Label className="text-xs text-muted-foreground sm:hidden">
                                Usage
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                value={service.usage ?? 0}
                                className="h-9 bg-background text-sm hover:border-primary/50 focus:ring-1 focus:ring-primary"
                              />
                            </div>

                            {/* Amount - Auto Calculated */}
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground sm:hidden">
                                Amount (₹)
                              </Label>
                              <div className="flex h-9 items-center rounded-md bg-primary/5 px-3 text-sm font-semibold text-primary">
                                ₹
                                {(
                                  (service.usage ?? 1) * (service.price ?? service.rate ?? 0)
                                ).toLocaleString("en-IN")}
                              </div>
                            </div>

                            {/* Action - Delete */}
                            <div className="flex items-center justify-end gap-1 sm:justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                onClick={() => {
                                  onProjectChange((current) => ({
                                    ...current,
                                    services: (current.services ?? []).filter(
                                      (_, i) => i !== index,
                                    ),
                                  }));
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Mobile summary */}
                          <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 sm:hidden">
                            <span className="text-xs text-muted-foreground">
                              {service.serviceName || service.name || "Custom Service"}
                            </span>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">
                                {Number(service.quantity ?? 1)} × ₹
                                {(service.price ?? service.rate ?? 0).toLocaleString("en-IN")}
                              </span>
                              <span className="font-semibold text-primary">
                                ₹
                                {(
                                  (service.quantity ?? 1) * (service.price ?? service.rate ?? 0)
                                ).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Empty State */}
                      {(project.services ?? []).length === 0 && (
                        <div className="rounded-lg border-2 border-dashed border-border/60 py-12 text-center">
                          <Wrench className="mx-auto h-12 w-12 text-muted-foreground/30" />
                          <p className="mt-3 text-sm text-muted-foreground">
                            No services added yet
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            Add services to track costs and usage
                          </p>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="mt-4"
                            onClick={addService}
                          >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Add Service
                          </Button>
                        </div>
                      )}

                      {/* Summary Section */}
                      {(project.services ?? []).length > 0 && (
                        <div className="mt-2 rounded-lg border border-border/60 bg-muted/5 p-4">
                          <div className="space-y-2">
                            {/* Subtotal */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="font-medium">
                                ₹{serviceTotal.toLocaleString("en-IN")}
                              </span>
                            </div>

                            {/* Discount */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Discount</span>
                                <div className="flex items-center gap-1">
                                  <Select
                                    value={discountType || "percent"}
                                    onValueChange={(value) => update("discountType", value)}
                                  >
                                    <SelectTrigger className="h-7 w-14 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="percent">%</SelectItem>
                                      <SelectItem value="amount">₹</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={discountValue || 0}
                                    onChange={(e) =>
                                      update("discountValue", Number(e.target.value))
                                    }
                                    className="h-7 w-16 text-xs"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                              <span className="font-medium text-green-600">
                                -₹{discountAmount.toLocaleString("en-IN")}
                              </span>
                            </div>

                            {/* Tax */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Tax</span>
                                <div className="flex items-center gap-1">
                                  <Select
                                    value={taxType || "percent"}
                                    onValueChange={(value) => update("taxType", value)}
                                  >
                                    <SelectTrigger className="h-7 w-14 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="percent">%</SelectItem>
                                      <SelectItem value="amount">₹</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={taxValue || 0}
                                    onChange={(e) => update("taxValue", Number(e.target.value))}
                                    className="h-7 w-16 text-xs"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                              <span className="font-medium text-amber-600">
                                +₹{taxAmount.toLocaleString("en-IN")}
                              </span>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-border/60" />

                            {/* Total */}
                            <div className="flex items-center justify-between pt-1 text-base">
                              <span className="font-semibold">Total</span>
                              <span className="font-bold text-primary">
                                ₹{grandTotal.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Waste Tab */}
                <TabsContent value="waste" className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background shadow-sm">
                      <div className="border-b border-border px-4 py-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                          Create Waste
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Add waste generated from this project
                        </p>
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Waste Code</Label>
                          <Input value={nextWasteCode} readOnly className="bg-muted/30 font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Material</Label>
                          {wasteMaterialOptions.length > 0 ? (
                            <Select value={newWasteMaterial} onValueChange={setNewWasteMaterial}>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select from project materials" />
                              </SelectTrigger>
                              <SelectContent>
                                {wasteMaterialOptions.map((material, index) => (
                                  <SelectItem
                                    key={`material-${material}-${index}`}
                                    value={material}
                                  >
                                    {material}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={newWasteMaterial}
                              onChange={(e) => setNewWasteMaterial(e.target.value)}
                              placeholder="Enter waste material"
                              className="bg-background"
                            />
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Size</Label>
                          <Input
                            value={newWasteSize}
                            onChange={(e) => setNewWasteSize(e.target.value)}
                            placeholder="e.g. 18mm offcuts"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Note</Label>
                          <Input
                            value={newWasteNote}
                            onChange={(e) => setNewWasteNote(e.target.value)}
                            placeholder="Add note"
                            className="bg-background"
                          />
                        </div>
                        <Button type="button" onClick={createWasteForProject} className="w-full">
                          <Plus className="mr-1.5 h-4 w-4" />
                          Create Waste Item
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background shadow-sm">
                      <div className="border-b border-border px-4 py-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          Use Waste Item
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Link available waste stock to this project
                        </p>
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Available Waste</Label>
                          <Select value={selectedWasteToUse} onValueChange={setSelectedWasteToUse}>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select waste item" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select waste item</SelectItem>
                              {availableWaste.map((item, index) => (
                                <SelectItem
                                  key={`${index}-waste-${item.id}-${item.material}-${item.size}`}
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
                          className="w-full"
                        >
                          <Plus className="mr-1.5 h-4 w-4" />
                          Use Selected Waste
                        </Button>
                        {availableWaste.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground">
                            {wasteLoading ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading waste items...
                              </span>
                            ) : (
                              "No available waste items found."
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <WasteMaterialSection
                      emptyText={
                        wasteLoading
                          ? "Loading waste materials..."
                          : "No waste materials created from this project."
                      }
                      rows={createdWaste}
                      title="Created Waste"
                    />
                    <WasteMaterialSection
                      emptyText={
                        wasteLoading
                          ? "Loading waste materials..."
                          : "No waste materials used for this project."
                      }
                      rows={usedWaste}
                      title="Used Waste"
                      onRemove={unlinkWasteFromProject}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-background px-5 py-4 sm:px-6">
          <div className="flex w-full items-center justify-between gap-3">
            <Button variant="outline" onClick={onClose} className="sm:w-auto">
              Cancel
            </Button>
            {project && (
              <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Project
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>

        <Dialog
          open={usageModalOpen}
          onOpenChange={(open) => {
            setUsageModalOpen(open);
            if (!open) {
              setUsageTargetIndex(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Project Usage</DialogTitle>
            </DialogHeader>

            {usageTargetIndex !== null && project?.services?.[usageTargetIndex] ? (
              <div className="space-y-4 py-2">
                {(() => {
                  const service = project.services[usageTargetIndex];
                  const { stageName, isDirectUsageService } = getUsageStageContext(service);
                  const stage = findUsageStage(project, service);
                  const requiresMaterials = !isDirectUsageService;
                  const stageHasMaterials = requiresMaterials && Boolean(stage?.materials?.length);
                  const filteredStaff = staffOptions.filter((staff) => {
                    const serviceRole = String(service.employeeRole || "").toLowerCase();
                    if (!serviceRole) return true;
                    return String(staff.role || "").toLowerCase() === serviceRole;
                  });

                  return (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Left Column - Service Info */}
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold">{service.serviceName || service.name}</h4>
                            {service.employeeRole && (
                              <Badge variant="outline">{service.employeeRole}</Badge>
                            )}
                            {isDirectUsageService && <Badge variant="secondary">Direct add</Badge>}
                          </div>
                          {isDirectUsageService ? (
                            <div className="mt-3 space-y-1.5">
                              <Label>Direct usage</Label>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={usageDirectValue}
                                onChange={(event) =>
                                  setUsageDirectValue(Number(event.target.value))
                                }
                                placeholder="Enter usage amount"
                              />
                              <p className="text-xs text-muted-foreground">
                                This custom service does not require materials. Enter the usage
                                amount directly.
                              </p>
                            </div>
                          ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label>Team member</Label>
                            <Select value={usageStaffId} onValueChange={setUsageStaffId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select staff member" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredStaff.length > 0 ? (
                                  filteredStaff.map((staff, index) => (
                                    <SelectItem key={`staff-${staff.id}-${index}`} value={staff.id}>
                                      {staff.name} {staff.role ? `- ${staff.role}` : ""}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value={ADMIN_MANUAL_STAFF_ID}>
                                    {ADMIN_MANUAL_STAFF.name}
                                  </SelectItem>
                                )}
                                {filteredStaff.length > 0 && (
                                  <SelectItem value={ADMIN_MANUAL_STAFF_ID}>
                                    {ADMIN_MANUAL_STAFF.name}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            {usageStaffId === ADMIN_MANUAL_STAFF_ID && (
                              <p className="text-xs text-muted-foreground">
                                No staff available for this service. You can still add usage as
                                admin.
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label>Status</Label>
                            <Select value={usageStatus} onValueChange={setUsageStatus}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Not started">Not started</SelectItem>
                                <SelectItem value="In progress">In progress</SelectItem>
                                <SelectItem value="On hold">On hold</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {requiresMaterials && !stageHasMaterials ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                            No materials assigned to this workflow stage yet.
                          </p>
                          <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
                            You can assign materials here as an admin, then save usage after the
                            stage is set up.
                          </p>
                          <div className="mt-3 overflow-x-auto rounded-lg border border-amber-200 bg-background dark:border-amber-900/40">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                                  <th className="px-4 py-2 font-medium">Material</th>
                                  <th className="px-4 py-2 font-medium">Required</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stageAllocationRows.map((material, index) => (
                                  <tr
                                    key={`alloc-${material.projectMaterialId}-${index}`}
                                    className="border-b border-border/50 last:border-0"
                                  >
                                    <td className="px-4 py-2">
                                      <div className="font-medium">
                                        {material.materialName || material.materialType}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {material.thickness || "-"} {material.unit || "units"}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        value={material.requiredQuantity ?? ""}
                                        onChange={(event) => {
                                          const value = Number(event.target.value);
                                          setStageAllocationRows((current) =>
                                            current.map((item) =>
                                              item.projectMaterialId === material.projectMaterialId
                                                ? { ...item, requiredQuantity: value }
                                                : item,
                                            ),
                                          );
                                        }}
                                        placeholder="0"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : isDirectUsageService ? (
                        <div className="rounded-lg border border-border bg-muted/10 p-4">
                          <p className="text-sm font-medium text-foreground">Direct add mode</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Save the usage amount directly for this custom service. Materials are
                            not required.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border">
                          <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Material usage
                          </div>
                          <div className="px-4 py-2 text-xs text-muted-foreground">
                            Enter the desired total usage. Historical usage stays intact and only
                            today&apos;s record is adjusted.
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                                  <th className="px-4 py-2 font-medium">Material</th>
                                  <th className="px-4 py-2 font-medium">Required</th>
                                  <th className="px-4 py-2 font-medium">Current total usage</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(stage?.materials ?? []).map((material, index) => {
                                  const row = usageRows.find(
                                    (item) => item.projectMaterialId === material.projectMaterialId,
                                  );
                                  return (
                                    <tr
                                      key={`material-${material.projectMaterialId}-${index}`}
                                      className="border-b border-border/50 last:border-0"
                                    >
                                      <td className="px-4 py-2">
                                        <div className="font-medium">
                                          {material.materialName || material.materialType}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {material.thickness || "-"} {material.unit || "units"}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-muted-foreground">
                                        {Number(material.requiredQuantity ?? 0)}
                                      </td>
                                      <td className="px-4 py-2">
                                        <Input
                                          type="number"
                                          min={0}
                                          value={row?.quantityUsed ?? ""}
                                          onChange={(event) => {
                                            const value = Number(event.target.value);
                                            setUsageRows((current) =>
                                              current.map((item) =>
                                                item.projectMaterialId ===
                                                material.projectMaterialId
                                                  ? { ...item, quantityUsed: value }
                                                  : item,
                                              ),
                                            );
                                          }}
                                          placeholder="0"
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setUsageModalOpen(false)}>
                Cancel
              </Button>
              {usageTargetIndex !== null &&
              project?.services?.[usageTargetIndex] &&
              !getUsageStageContext(project.services[usageTargetIndex]).isDirectUsageService &&
              !findUsageStage(project, project.services[usageTargetIndex])?.materials?.length ? (
                <Button
                  onClick={() => void saveStageAllocationFromUsageModal()}
                  disabled={
                    !stageAllocationRows.some((row) => Number(row.requiredQuantity ?? 0) > 0)
                  }
                >
                  Assign materials
                </Button>
              ) : (
                <Button onClick={() => void saveDailyUsage()}>Save override</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Material Type Dialog */}
        <Dialog
          open={materialTypeDialog.open}
          onOpenChange={(open) => setMaterialTypeDialog({ open, value: "" })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Material Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label>Material Type</Label>
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
                onClick={() => setMaterialTypeDialog({ open: false, value: "" })}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void saveMaterialType()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Inventory Dialog */}
        <Dialog open={inventoryOpen} onOpenChange={setInventoryOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Material from Inventory</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Select a material to add to this project
              </p>
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
                  {inventoryStock.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No inventory items found.
                      </td>
                    </tr>
                  ) : (
                    inventoryStock.map((item, index) => {
                      const selected = (project?.materials ?? []).some(
                        (material) => material.stockId === item.id,
                      );
                      return (
                        <tr
                          key={`inventory-${item.id}-${index}`}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                        >
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
                              disabled={selected || item.quantity <= 0}
                              onClick={() => {
                                if (selected) {
                                  toast.error("Material already added");
                                  return;
                                }
                                if (item.quantity <= 0) {
                                  toast.error("Item out of stock");
                                  return;
                                }
                                addInventoryMaterial(item);
                              }}
                            >
                              {selected ? "Added" : item.quantity <= 0 ? "Out of Stock" : "Add"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInventoryOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

// Waste Material Section Component
function WasteMaterialSection({ emptyText, title, rows, onRemove }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border/80 bg-background">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <h4 className="text-sm font-semibold">{title}</h4>
          <Badge variant="secondary">0 items</Badge>
        </div>
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/80 bg-background">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge variant="secondary">{rows.length} items</Badge>
      </div>
      <div className="overflow-x-auto">
        <div className="space-y-2 p-3 md:hidden">
          {rows.map((row, index) => (
            <div
              key={`waste-${row.id}-${index}`}
              className="rounded-md border border-border/70 bg-muted/10 p-3"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.id}</span>
                {onRemove && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(row)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Material: {row.material}</p>
              <p className="mt-1 text-xs text-muted-foreground">Size: {row.size || "-"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Note: {row.note || "-"}</p>
            </div>
          ))}
        </div>

        <table className="hidden w-full text-sm md:table">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">ID</th>
              <th className="px-4 py-2 font-medium">Material</th>
              <th className="px-4 py-2 font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Note</th>
              {onRemove && <th className="px-4 py-2 text-right font-medium">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${index}-${row.backendId ?? row.id}`}
                className="border-b border-border/70 last:border-0 hover:bg-muted/10"
              >
                <td className="px-4 py-2 font-medium">{row.id}</td>
                <td className="px-4 py-2">{row.material}</td>
                <td className="px-4 py-2 text-muted-foreground">{row.size || "-"}</td>
                <td className="px-4 py-2 text-muted-foreground">{row.note || "-"}</td>
                {onRemove && (
                  <td className="px-4 py-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemove(row)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectEditDialog;
