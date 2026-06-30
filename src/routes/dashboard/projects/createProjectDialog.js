"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Mail,
  MapPin,
  Package,
  Phone,
  UserRound,
  UsersRound,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  Copy,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/status/status-badge.js";
import { projects as initialProjects, stock as initialStock } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { loadStoredServices, mergeServices } from "@/lib/project-services";
import { loadStoredCustomers, mergeCustomers, saveStoredCustomers } from "@/lib/customer-store";
import { api, apiRequest } from "@/lib/api";
import { canPageAction, getActiveFactoryId } from "@/lib/auth";
import { formatDateTimeCompact } from "@/lib/date-format";
import { findWasteAssignment } from "@/lib/waste-assignment-store";
import { DEFAULT_MATERIAL_TYPES } from "@/lib/material-types";

// Constants
const STEPS = ["Basic info", "Materials", "Services", "Summary"];
const THICKNESS_OPTIONS = Array.from({ length: 40 }, (_, i) => `${i + 1}mm`);
const PROJECT_STATUSES = ["ongoing", "completed", "hold"];

// Utility Functions
function makeProjectCode() {
  return `P${Date.now().toString().slice(-6)}`;
}

function newMaterial() {
  return {
    id: crypto.randomUUID(),
    type: "MDF",
    thickness: "1mm",
    sheets: 0,
    quantity: 0,
    source: "new-stock",
    unit: "sheets",
  };
}

function blankNewCustomer() {
  return {
    company: "",
    contact: "",
    countryCode: "+91",
    phone: "",
    email: "",
    address: "",
    state: "",
    district: "",
    pincode: "",
    gstin: "",
  };
}
function Row({ k, v }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

const CreateProjectDialog = ({ open, onOpenChange, onCreate })=> {
  const [step, setStep] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [inventoryStock, setInventoryStock] = useState([]);
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [advancedCustomerOpen, setAdvancedCustomerOpen] = useState(false);
  const [materialStage, setMaterialStage] = useState("new-stock");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [materialTypes, setMaterialTypes] = useState(
    DEFAULT_MATERIAL_TYPES.map((label) => ({
      id: `default:${label.toLowerCase()}`,
      label,
      source: "default",
    })),
  );
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [materialTypeDialog, setMaterialTypeDialog] = useState({
    open: false,
    rowId: null,
    value: "",
  });

  const [newCust, setNewCust] = useState(blankNewCustomer());
  const customersRef = useRef([]);
  const selectedCustomerIdRef = useRef("");

  const [data, setData] = useState({
    workType: "own",
    customerId: "",
    customerName: "",
    name: "",
    delivery: "",
    notes: "",
    materials: [newMaterial()],
    selectedServiceIds: [],
    serviceQuantities: {},
  });

  const loadLookups = useCallback(async () => {
    const localServices = loadStoredServices();
    const activeFactoryId = getActiveFactoryId();
    try {
      const [cs, ss, stockRows, materialTypeRows] = await Promise.all([
        api.list("customers", { limit: 50 }),
        api.list("services"),
        api.list("stock"),
        apiRequest("stock/material-types"),
      ]);
      const nextCustomers = mergeCustomers(cs ?? [], loadStoredCustomers(activeFactoryId));
      customersRef.current = nextCustomers;
      setCustomers(nextCustomers);
      setMaterialTypes([
        ...(materialTypeRows?.defaults ?? []),
        ...(materialTypeRows?.custom ?? []),
      ]);
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
        (ss ?? []).map((service) => ({
          id: service.id,
          name: service.name,
          price: service.price ?? 0,
          unit: service.unit ?? "sheet",
          employeeRole: service.employeeRole ?? "",
        })),
        localServices,
      );
      setServices(
        mergedServices.map(({ id, name, price, unit, employeeRole }) => ({
          id,
          name,
          price,
          unit,
          employeeRole,
          serviceName: name,
          rate: price,
          quantity: 0,
          total: price,
        })),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Using locally stored lookups");
      const fallbackCustomers = mergeCustomers(loadStoredCustomers(activeFactoryId));
      customersRef.current = fallbackCustomers;
      setCustomers(fallbackCustomers);
      setMaterialTypes(
        DEFAULT_MATERIAL_TYPES.map((label) => ({
          id: `default:${label.toLowerCase()}`,
          label,
          source: "default",
        })),
      );
      setInventoryStock(initialStock);
      setServices(
        localServices.map(({ id, name, price, unit, employeeRole }) => ({
          id,
          name,
          price,
          unit,
          employeeRole,
          serviceName: name,
          rate: price,
          quantity: 1,
          total: price,
        })),
      );
    }
  }, []);

  const loadCustomers = useCallback(async (search = "") => {
    const activeFactoryId = getActiveFactoryId();
    setCustomerLookupLoading(true);
    try {
      const rows = await api.list("customers", {
        search: search.trim() || undefined,
        limit: 50,
      });
      const merged = mergeCustomers(rows ?? [], loadStoredCustomers(activeFactoryId));
      const selectedCustomer = customersRef.current.find(
        (customer) => customer.id === selectedCustomerIdRef.current,
      );
      const nextCustomers = selectedCustomer ? mergeCustomers([selectedCustomer], merged) : merged;
      customersRef.current = nextCustomers;
      setCustomers(nextCustomers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load customers");
      const stored = mergeCustomers(loadStoredCustomers(activeFactoryId));
      const selectedCustomer = customersRef.current.find(
        (customer) => customer.id === selectedCustomerIdRef.current,
      );
      const nextCustomers = selectedCustomer ? mergeCustomers([selectedCustomer], stored) : stored;
      customersRef.current = nextCustomers;
      setCustomers(nextCustomers);
    } finally {
      setCustomerLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadLookups();
    }
  }, [open, loadLookups]);

  useEffect(() => {
    if (!open) return;
    if (!customerSearchTerm.trim()) return undefined;
    const timer = setTimeout(() => {
      void loadCustomers(customerSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchTerm, loadCustomers, open]);

  const reset = () => {
    setStep(0);
    setCreating(false);
    setMaterialStage("new-stock");
    setData({
      workType: "own",
      customerId: "",
      customerName: "",
      name: "",
      delivery: "",
      notes: "",
      materials: [newMaterial()],
      selectedServiceIds: [],
      serviceQuantities: {},
    });
    setCustomerSearchTerm("");
    selectedCustomerIdRef.current = "";
  };

  const totalSheets = data.materials.reduce((s, m) => s + (Number(m.sheets) || 0), 0);
  const validMaterials = data.materials.filter((material) => Number(material.sheets) > 0);
  const materialTypeOptions = materialTypes.map((item) => item.label);

  const selectedServices = services.filter((service) =>
    data.selectedServiceIds.includes(service.id),
  );
  const serviceTotal = selectedServices.reduce((sum, service) => {
    return sum + Number(service.price ?? 0);
  }, 0);
  const filteredCustomers = customers.filter((customer) =>
    [customer.company, customer.contact, customer.phone, customer.email, customer.countryCode]
      .join(" ")
      .toLowerCase()
      .includes(customerSearchTerm.toLowerCase()),
  );

  const addCustomer = async () => {
    if (!newCust.company?.trim()) {
      toast.error("Company name required");
      return;
    }

    const localCustomer = {
      id: crypto.randomUUID(),
      factoryId: getActiveFactoryId(),
      company: newCust.company.trim(),
      contact: newCust.contact?.trim() || "",
      countryCode: newCust.countryCode?.trim() || "",
      phone: newCust.phone?.trim() || "",
      email: newCust.email?.trim() || "",
      address: newCust.address?.trim() || "",
      state: newCust.state?.trim() || "",
      district: newCust.district?.trim() || "",
      pincode: newCust.pincode?.trim() || "",
      gstin: newCust.gstin?.trim() || "",
    };

    const nextCustomers = mergeCustomers([...customers, localCustomer]);
    setCustomers(nextCustomers);
    customersRef.current = nextCustomers;
    saveStoredCustomers(nextCustomers, getActiveFactoryId());

    try {
      const row = await api.create("customers", localCustomer);
      const syncedCustomers = mergeCustomers(nextCustomers, [row]);
      setCustomers(syncedCustomers);
      customersRef.current = syncedCustomers;
      saveStoredCustomers(syncedCustomers, getActiveFactoryId());
      setData((d) => ({
        ...d,
        customerId: row.id,
        customerName: row.company,
      }));
      selectedCustomerIdRef.current = row.id;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Customer saved locally only");
    }

    toast.success("Customer added");
    setNewCust(blankNewCustomer());
    setAdvancedCustomerOpen(false);
    setAddCustOpen(false);
  };

  const selectMaterialType = (rowId, value) => {
    setData((d) => ({
      ...d,
      materials: d.materials.map((x) => (x.id === rowId ? { ...x, type: value } : x)),
    }));
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
      setMaterialTypeDialog({ open: false, rowId: null, value: "" });
      await loadLookups();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add material type");
    }
  };

  const toggleServiceSelection = (service, checked) => {
    setData((current) => {
      const nextSelected = checked
        ? Array.from(new Set([...current.selectedServiceIds, service.id]))
        : current.selectedServiceIds.filter((id) => id !== service.id);
      const nextQuantities = { ...current.serviceQuantities };
      if (checked && nextQuantities[service.id] === undefined) {
        nextQuantities[service.id] = 1;
      }
      if (!checked) {
        delete nextQuantities[service.id];
      }
      return {
        ...current,
        selectedServiceIds: nextSelected,
        serviceQuantities: nextQuantities,
      };
    });
  };

  const validateCurrentStep = () => {
    if (step === 0) {
      if (!data.customerId.trim()) return "Select a customer";
    }
    if (step === 1) {
      if (!validMaterials.length) return "Add at least one material quantity";
    }
    return "";
  };

  const create = async () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setCreating(true);
    try {
      const project = {
        id: makeProjectCode(),
        name: data.name || data?.customerName || "Untitled project",
        customer: data.customerName || "-",
        status: "ongoing",
        progress: 5,
        delivery: data.delivery || "TBD",
        amount: serviceTotal,
      };

      const selectedCustomer = customersRef.current.find(
        (customer) => customer.id === data.customerId,
      );
      const customerId = /^[0-9a-f]{24}$/i.test(selectedCustomer?.id ?? "")
        ? selectedCustomer?.id
        : null;

      const projectRow = await api.create("projects", {
        name: project.name,
        customerId,
        customerName: project.customer,
        workType: data.workType,
        status: project.status,
        progress: project.progress,
        delivery: data.delivery || null,
        amount: serviceTotal,
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
          .map((service) => {
            const rate = Number(service.price ?? 0);
            return {
              serviceId: /^[0-9a-f]{24}$/i.test(service.id) ? service.id : null,
              serviceName: service.name,
              employeeRole: service.employeeRole || "",
              unit: service.unit ?? "sheet",
              quantity: 0,
              rate,
              total: rate,
            };
          }),
      });

      const savedProject = {
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
            {/* Steps */}
            <ol className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <li key={s} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      i < step && "border-primary bg-primary text-primary-foreground",
                      i === step &&
                        "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]",
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

            {/* Content */}
            <div className="mt-4 min-h-[280px] pb-1">
              {step === 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Work Type</Label>
                    <RadioGroup
                      value={data.workType}
                      onValueChange={(v) => setData({ ...data, workType: v })}
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
                    <Input
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      placeholder="Search customers"
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select
                          value={data.customerId}
                          onValueChange={(customerId) => {
                            selectedCustomerIdRef.current = customerId;
                            const selectedCustomer = customersRef.current.find(
                              (customer) => customer.id === customerId,
                            );
                            setData((current) => ({
                              ...current,
                              customerId,
                              customerName: selectedCustomer?.company ?? "",
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                customerLookupLoading ? "Loading customers..." : "Select customer"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCustomers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.company}
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
                      placeholder="Additional details..."
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <Tabs value={materialStage} onValueChange={(value) => setMaterialStage(value)}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <TabsList>
                        <TabsTrigger value="inventory">Use Inventory</TabsTrigger>
                        <TabsTrigger value="new-stock">New Stock</TabsTrigger>
                      </TabsList>
                      {materialStage === "inventory" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setInventoryOpen(true)}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add Material
                        </Button>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setMaterialTypeDialog({ open: true, rowId: "", value: "" })
                            }
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            New Material
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setData((d) => ({ ...d, materials: [...d.materials, newMaterial()] }))
                            }
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Add Material
                          </Button>
                        </div>
                      )}
                    </div>

                    <TabsContent value="inventory" className="mt-3 space-y-2">
                      {data.materials.filter((m) => m.source === "inventory").length === 0 && (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                          No inventory materials selected.
                        </div>
                      )}
                      {data.materials
                        .filter((m) => m.source === "inventory")
                        .map((m) => (
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
                                {m.type} - Available {m.thickness}
                                {inventoryStock.find((item) => item.id === m.stockId)?.quantity ??
                                  0}{" "}
                                {m.unit ?? "units"}
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
                              aria-label={`Remove inventory material`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="new-stock" className="mt-3 space-y-2">
                      {data.materials
                        .filter((m) => m.source === "new-stock")
                        .map((m) => (
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
                              disabled={
                                data.materials.filter((x) => x.source === "new-stock").length === 1
                              }
                              onClick={() =>
                                setData((d) => ({
                                  ...d,
                                  materials: d.materials.filter((x) => x.id !== m.id),
                                }))
                              }
                              aria-label={`Remove material`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                    </TabsContent>
                  </Tabs>

                  <p className="text-right text-sm text-muted-foreground">
                    Total sheets:{" "}
                    <span className="font-semibold text-foreground">
                      {Number(totalSheets.toFixed(2))}
                    </span>
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Select services required for this project. The linked team role and price will be used automatically.
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
                          "grid cursor-pointer gap-3 rounded-lg border bg-card p-3 transition-colors sm:grid-cols-[auto_1fr_140px]",
                          checked
                            ? "border-primary bg-[image:var(--gradient-soft)]"
                            : "border-border",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => toggleServiceSelection(sv, Boolean(c))}
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            <span>{sv.name}</span>
                            {sv.employeeRole ? (
                              <Badge variant="outline" className="text-[10px]">
                                {sv.employeeRole}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ₹{Number(sv.price || 0).toLocaleString("en-IN")} per {sv.unit || "unit"}
                          </div>
                        </div>
                        <div className="flex items-center justify-end text-sm font-medium">
                          ₹{Number(sv.price || 0).toLocaleString("en-IN")}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                    <Row k="Work type" v={data.workType === "own" ? "Own Work" : "Job Work"} />
                    <Row k="Customer" v={data.customerName || "—"} />
                    <Row k="Project" v={data.name || "—"} />
                    <Row
                      k="Delivery"
                      v={data.delivery ? formatDateTimeCompact(data.delivery) : "—"}
                    />
                    <Row k="Material quantity" v={String(Number(totalSheets.toFixed(2)))} />
                    <Row
                      k="Service amount"
                      v={`₹${Number(serviceTotal.toFixed(2)).toLocaleString("en-IN")}`}
                    />
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
                      {validMaterials.length === 0 && (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          No materials added
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card">
                    <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Selected services
                    </div>
                    <div className="divide-y divide-border">
                      {selectedServices.map((sv) => {
                        const total = Number(sv.price ?? 0);
                        return (
                          <div
                            key={sv.id}
                            className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2 font-medium">
                                <span>{sv.name}</span>
                                {sv.employeeRole ? (
                                  <Badge variant="outline" className="text-[10px]">
                                    {sv.employeeRole}
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ₹{Number(sv.price ?? 0).toLocaleString("en-IN")} per {sv.unit || "unit"}
                              </div>
                            </div>
                            <div className="font-medium">
                              ₹{Number(total.toFixed(2)).toLocaleString("en-IN")}
                            </div>
                          </div>
                        );
                      })}
                      {selectedServices.length === 0 && (
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
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => {
                  const validationError = validateCurrentStep();
                  if (validationError) {
                    toast.error(validationError);
                    return;
                  }
                  setStep(step + 1);
                }}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={create} disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {creating ? "Creating..." : "Create Order"}
              </Button>
            )}
          </DialogFooter>

          {/* Add Customer Dialog */}
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
                    value={newCust.company || ""}
                    onChange={(e) => setNewCust({ ...newCust, company: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Contact name</Label>
                    <Input
                      value={newCust.contact || ""}
                      onChange={(e) => setNewCust({ ...newCust, contact: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country code</Label>
                    <Input
                      value={newCust.countryCode || ""}
                      onChange={(e) => setNewCust({ ...newCust, countryCode: e.target.value })}
                      placeholder="+91"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      value={newCust.phone || ""}
                      onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newCust.email || ""}
                      onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    />
                  </div>
                </div>
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
                {advancedCustomerOpen && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={newCust.address || ""}
                        onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>State</Label>
                      <Input
                        value={newCust.state || ""}
                        onChange={(e) => setNewCust({ ...newCust, state: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>District</Label>
                      <Input
                        value={newCust.district || ""}
                        onChange={(e) => setNewCust({ ...newCust, district: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pincode</Label>
                      <Input
                        value={newCust.pincode || ""}
                        onChange={(e) => setNewCust({ ...newCust, pincode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>GSTIN</Label>
                      <Input
                        value={newCust.gstin || ""}
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
          {/* Material Type Dialog */}
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
                <Button
                  type="button"
                  onClick={() => void saveMaterialType()}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Inventory Dialog */}
          <Dialog open={inventoryOpen} onOpenChange={setInventoryOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add material from inventory</DialogTitle>
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
                      const selected = data.materials.some(
                        (material) => material.stockId === item.id,
                      );
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
                              onClick={() => {
                                const alreadyAdded = data.materials.some(
                                  (material) => material.stockId === item.id,
                                );
                                if (alreadyAdded) {
                                  toast.error("Material already added");
                                  return;
                                }
                                setData((d) => ({
                                  ...d,
                                  materials: [
                                    ...d.materials,
                                    {
                                      id: crypto.randomUUID(),
                                      type: item.type,
                                      thickness: item.thickness || item.material,
                                      sheets: 1,
                                      quantity: 1,
                                      source: "inventory",
                                      stockId: item.id,
                                      materialName: item.type,
                                      unit: item.unit,
                                    },
                                  ],
                                }));
                                toast.success("Material added");
                              }}
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
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CreateProjectDialog;
