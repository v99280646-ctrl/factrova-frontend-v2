import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { PaginationControls } from "@/components/pagination-controls.js";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MoreVertical, PackageCheck, PackagePlus, Pencil, Search, Trash2 } from "lucide-react";
import { stock as initial } from "@/lib/data";
import { toast } from "sonner";
import { api, apiRequest } from "@/lib/api";
import { canPageAction } from "@/lib/auth";
import { DEFAULT_MATERIAL_TYPES } from "@/lib/material-types";
import { findWasteAssignment, removeWasteAssignment, saveWasteAssignment as saveStoredWasteAssignment, } from "@/lib/waste-assignment-store";
export const Route = createFileRoute("/dashboard/stock")({
    head: () => ({ meta: [{ title: "Stock Management — Factrova" }] }),
    component: Stock,
});
const thicknessOptions = Array.from({ length: 40 }, (_, index) => `${index + 1}mm`);
const units = ["sheets", "pieces", "rolls", "kg", "meters", "boxes"];
function normalizeThickness(value) {
    const compact = value.trim().replace(/\s+/g, "").toLowerCase();
    const millimeters = compact.match(/^(\d+(?:\.\d+)?)(?:mm)?$/);
    return millimeters ? `${Number(millimeters[1])}mm` : compact;
}
function mapWasteMaterial(row) {
    const stored = findWasteAssignment({ backendId: row.id, code: row.code });
    return {
        id: row.code,
        backendId: row.id,
        material: row.material,
        projectId: row.projectId ?? row.project_id ?? stored?.projectId ?? null,
        projectName: row.projectName || row.project_name || stored?.projectName || "",
        usedForProjectId: row.usedForProjectId ?? row.used_for_project_id ?? stored?.usedForProjectId ?? null,
        usedForProjectName: row.usedForProjectName || row.used_for_project_name || stored?.usedForProjectName || "",
        size: row.size ?? "",
        note: row.note ?? "",
    };
}
export function Stock() {
    const canAdd = canPageAction("stock", "add");
    const canDelete = canPageAction("stock", "delete");
    const canUpdate = canPageAction("stock", "update");
    const [list, setList] = useState(initial);
    const [wasteList, setWasteList] = useState([]);
    const [stockSearch, setStockSearch] = useState("");
    const [stockPage, setStockPage] = useState(1);
    const [stockPagination, setStockPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
    const [wastePage, setWastePage] = useState(1);
    const [wastePagination, setWastePagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
    const [open, setOpen] = useState(false);
    const [category, setCategory] = useState("materials");
    const [materialTypes, setMaterialTypes] = useState(DEFAULT_MATERIAL_TYPES.map((label) => ({
        id: `default:${label.toLowerCase()}`,
        label,
        source: "default",
    })));
    const [customTypeName, setCustomTypeName] = useState("");
    const [form, setForm] = useState({
        id: "",
        material: "",
        type: "",
        thickness: "1mm",
        quantity: 0,
        unit: "sheets",
    });
    const [editingStock, setEditingStock] = useState(null);
    const [editQuantity, setEditQuantity] = useState("");
    const [assigningWaste, setAssigningWaste] = useState(null);
    const [assignCreatedFromId, setAssignCreatedFromId] = useState("none");
    const [assignUsedForId, setAssignUsedForId] = useState("none");
    const [wasteId, setWasteId] = useState("");
    const [wasteProjectId, setWasteProjectId] = useState("none");
    const [wasteSize, setWasteSize] = useState("");
    const [wasteNote, setWasteNote] = useState("");
    const [wasteSearch, setWasteSearch] = useState("");
    const [wasteStockFilter, setWasteStockFilter] = useState("all");
    const [projects, setProjects] = useState([]);
    const [refreshToken, setRefreshToken] = useState(0);
    // Delete confirmation dialogs
    const [deleteStockItem, setDeleteStockItem] = useState(null);
    const [deleteWasteItem, setDeleteWasteItem] = useState(null);
    const loadNextWasteCode = async () => {
        try {
            const next = await apiRequest("/waste/next-code");
            setWasteId(next.code);
        }
        catch (error) {
            console.error("Failed to load next waste code:", error);
            const highest = wasteList.reduce((max, item) => {
                const value = Number(item.id.replace(/\D/g, ""));
                return Number.isFinite(value) ? Math.max(max, value) : max;
            }, 0);
            setWasteId(`W${String(highest + 1).padStart(3, "0")}`);
        }
    };
    const load = async () => {
        try {
            const [stockRows, wasteRows, projectRows, materialTypeRows] = await Promise.all([
                api.list("stock", {
                    page: stockPage,
                    limit: 20,
                    search: stockSearch.trim() || undefined,
                }),
                api.list("waste", {
                    page: wastePage,
                    limit: 20,
                    search: wasteSearch.trim() || undefined,
                    status: wasteStockFilter !== "all" ? wasteStockFilter : undefined,
                }),
                api.list("projects"),
                apiRequest("stock/material-types"),
            ]);
            const stockItems = Array.isArray(stockRows) ? stockRows : stockRows?.items ?? [];
            const wasteItems = Array.isArray(wasteRows) ? wasteRows : wasteRows?.items ?? [];
            setList(stockItems.map((row) => ({
                id: row.id,
                material: row.material,
                type: row.type,
                thickness: row.thickness ?? "",
                quantity: Number(row.quantity),
                unit: row.unit,
            })));
            setStockPagination(Array.isArray(stockRows)
                ? { page: stockPage, limit: 20, total: stockItems.length, totalPages: 1, hasNext: false, hasPrev: false }
                : stockRows?.pagination ?? { page: stockPage, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
            setWasteList(wasteItems.map(mapWasteMaterial));
            setWastePagination(Array.isArray(wasteRows)
                ? { page: wastePage, limit: 20, total: wasteItems.length, totalPages: 1, hasNext: false, hasPrev: false }
                : wasteRows?.pagination ?? { page: wastePage, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
            setProjects(projectRows ?? []);
            const catalog = materialTypeRows ?? { defaults: [], custom: [] };
            setMaterialTypes([...(catalog.defaults ?? []), ...(catalog.custom ?? [])]);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to load stock", {
                duration: 4000,
                position: "top-right",
            });
        }
    };
    useEffect(() => {
        const timer = setTimeout(() => {
            void load();
        }, 300);
        return () => clearTimeout(timer);
    }, [stockPage, stockSearch, wastePage, wasteSearch, wasteStockFilter, refreshToken]);
    const addMaterialType = async () => {
        const nextType = customTypeName.trim();
        if (!nextType) {
            toast.error("Material type is required");
            return;
        }
        try {
            const created = await apiRequest("stock/material-types", {
                method: "POST",
                body: { label: nextType },
            });
            setMaterialTypes((current) => [...current, created]);
            setForm((current) => ({ ...current, type: created.label }));
            setCustomTypeName("");
            toast.success("Material type added");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to add material type");
        }
    };
    useEffect(() => {
        if (open && category === "waste-materials") {
            loadNextWasteCode();
        }
    }, [open, category, wasteList.length]);
    const add = async () => {
        // Validation
        if (!form.type.trim()) {
            toast.warning("Please select a stock type", {
                description: "Stock type is required to add inventory",
                duration: 3000,
            });
            return;
        }
        if (category === "materials" && !form.thickness?.trim()) {
            toast.warning("Thickness is required", {
                description: "Please enter the material thickness",
                duration: 3000,
            });
            return;
        }
        if (category === "materials" &&
            list.some((stock) => stock.type.trim().toLowerCase() === form.type.trim().toLowerCase() &&
                normalizeThickness(stock.thickness ?? "") === normalizeThickness(form.thickness ?? ""))) {
            toast.error("Duplicate stock item", {
                description: `${form.type} ${form.thickness} already exists in stock`,
                duration: 4000,
            });
            return;
        }
        const item = {
            ...form,
            material: form.type,
        };
        if (category === "waste-materials") {
            const selectedProject = projects.find((project) => project.id === wasteProjectId);
            const row = {
                code: wasteId.trim(),
                material: form.type,
                projectId: selectedProject?.id ?? null,
                projectName: selectedProject ? `${selectedProject.code} - ${selectedProject.name}` : "",
                size: wasteSize.trim() || null,
                note: wasteNote.trim() || null,
            };
            let saved;
            try {
                saved = await api.create("waste", row);
                setWasteList((l) => [...l, mapWasteMaterial(saved)]);
                setRefreshToken((value) => value + 1);
                toast.success("Waste material added successfully", {
                    description: `${form.type} has been added to waste inventory`,
                    duration: 3000,
                });
            }
            catch (error) {
                toast.error("Failed to add waste material", {
                    description: error instanceof Error ? error.message : "Please try again later",
                    duration: 5000,
                });
                return;
            }
        }
        else {
            try {
                const data = await api.create("stock", {
                    material: item.material,
                    type: item.type,
                    thickness: item.thickness?.trim(),
                    quantity: item.quantity,
                    unit: item.unit,
                });
                setList((l) => [
                    {
                        id: data.id,
                        material: data.material,
                        type: data.type,
                        thickness: data.thickness ?? "",
                        quantity: Number(data.quantity),
                        unit: data.unit,
                    },
                    ...l,
                ]);
                setRefreshToken((value) => value + 1);
                toast.success("Stock added successfully", {
                    description: `${item.type} ${item.thickness} added with quantity ${item.quantity} ${item.unit}`,
                    duration: 3000,
                });
            }
            catch (error) {
                toast.error("Failed to add stock", {
                    description: error instanceof Error ? error.message : "Please try again later",
                    duration: 5000,
                });
                return;
            }
        }
        setOpen(false);
        setCategory("materials");
        setForm({ id: "", material: "", type: "", thickness: "1mm", quantity: 0, unit: "sheets" });
        setWasteId("");
        setWasteProjectId("none");
        setWasteSize("");
        setWasteNote("");
    };
    const openEditStock = (item) => {
        setEditingStock(item);
        setEditQuantity(String(item.quantity));
    };
    const openAssignWaste = (item) => {
        setAssigningWaste(item);
        setAssignCreatedFromId(item.projectId || "none");
        setAssignUsedForId(item.usedForProjectId || "none");
    };
    const closeAssignWaste = () => {
        setAssigningWaste(null);
        setAssignCreatedFromId("none");
        setAssignUsedForId("none");
    };
    const saveWasteAssignment = async () => {
        if (!assigningWaste)
            return;
        const createdFrom = projects.find((project) => project.id === assignCreatedFromId);
        const usedFor = projects.find((project) => project.id === assignUsedForId);
        const update = {
            projectId: createdFrom?.id ?? null,
            projectName: createdFrom ? `${createdFrom.code} - ${createdFrom.name}` : "",
            usedForProjectId: usedFor?.id ?? null,
            usedForProjectName: usedFor ? `${usedFor.code} - ${usedFor.name}` : "",
        };
        const persistedUpdate = {
            ...update,
            project_id: update.projectId,
            project_name: update.projectName,
            used_for_project_id: update.usedForProjectId,
            used_for_project_name: update.usedForProjectName,
        };
        if (assigningWaste.backendId) {
            try {
                try {
                    await api.update("waste", assigningWaste.backendId, persistedUpdate);
                }
                catch {
                    await api.update("waste", assigningWaste.backendId, update);
                }
                toast.success("Waste material assigned", {
                    description: `${assigningWaste.material} has been updated`,
                    duration: 3000,
                });
                setRefreshToken((value) => value + 1);
            }
            catch (error) {
                toast.error("Failed to assign waste material", {
                    description: error instanceof Error ? error.message : "Please try again",
                    duration: 5000,
                });
                return;
            }
        }
        saveStoredWasteAssignment({
            backendId: assigningWaste.backendId,
            code: assigningWaste.id,
            ...update,
        });
        setWasteList((items) => items.map((item) => item.id === assigningWaste.id
            ? {
                ...item,
                projectId: update.projectId,
                projectName: update.projectName,
                usedForProjectId: update.usedForProjectId,
                usedForProjectName: update.usedForProjectName,
            }
            : item));
        closeAssignWaste();
    };
    const confirmDeleteWaste = (item) => {
        setDeleteWasteItem(item);
    };
    const confirmDeleteStock = (item) => {
        setDeleteStockItem(item);
    };
    const deleteWaste = async () => {
        if (!deleteWasteItem)
            return;
        try {
            if (deleteWasteItem.backendId) {
                await api.remove("waste", deleteWasteItem.backendId);
            }
            removeWasteAssignment({ backendId: deleteWasteItem.backendId, code: deleteWasteItem.id });
            setWasteList((items) => items.filter((waste) => waste.id !== deleteWasteItem.id));
            setRefreshToken((value) => value + 1);
            toast.success("Waste material deleted", {
                description: `${deleteWasteItem.material} (${deleteWasteItem.id}) has been removed`,
                duration: 3000,
            });
        }
        catch (error) {
            toast.error("Failed to delete waste material", {
                description: error instanceof Error ? error.message : "Please try again later",
                duration: 5000,
            });
        }
        finally {
            setDeleteWasteItem(null);
        }
    };
    const deleteStock = async () => {
        if (!deleteStockItem)
            return;
        try {
            await api.remove("stock", deleteStockItem.id);
            setList((prev) => prev.filter((s) => s.id !== deleteStockItem.id));
            setRefreshToken((value) => value + 1);
            toast.success("Stock item deleted", {
                description: `${deleteStockItem.type} ${deleteStockItem.thickness || ''} has been removed`,
                duration: 3000,
            });
        }
        catch (error) {
            toast.error("Failed to delete stock item", {
                description: error instanceof Error ? error.message : "Please try again later",
                duration: 5000,
            });
        }
        finally {
            setDeleteStockItem(null);
        }
    };
    const updateStockQuantity = async () => {
        if (!editingStock)
            return;
        const quantity = Math.max(0, Number(editQuantity) || 0);
        if (isNaN(quantity)) {
            toast.warning("Invalid quantity", {
                description: "Please enter a valid number",
                duration: 3000,
            });
            return;
        }
        try {
            await apiRequest(`/stock/${editingStock.id}/quantity`, {
                method: "PATCH",
                body: { quantity },
            });
            setList((l) => l.map((s) => (s.id === editingStock.id ? { ...s, quantity } : s)));
            setRefreshToken((value) => value + 1);
            toast.success("Stock updated", {
                description: `Quantity changed to ${quantity} ${editingStock.unit}`,
                duration: 3000,
            });
        }
        catch (error) {
            toast.error("Failed to update stock", {
                description: error instanceof Error ? error.message : "Please try again",
                duration: 5000,
            });
            return;
        }
        setEditingStock(null);
        setEditQuantity("");
    };
    const filteredWasteList = wasteList.filter((item) => {
        const isUsed = Boolean(item.usedForProjectId || item.usedForProjectName);
        const matchesFilter = wasteStockFilter === "all" ||
            (wasteStockFilter === "available" && !isUsed) ||
            (wasteStockFilter === "used" && isUsed);
        const query = wasteSearch.trim().toLowerCase();
        const matchesSearch = !query ||
            [item.id, item.material, item.projectName, item.usedForProjectName, item.size, item.note]
                .join(" ")
                .toLowerCase()
                .includes(query);
        return matchesFilter && matchesSearch;
    });
    return (
        <DashboardLayout title="Stock Management">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Dialog open={open} onOpenChange={setOpen}>
                    {canAdd ? (
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto">
                                <PackagePlus className="mr-1 h-4 w-4" />
                                Add Stock
                            </Button>
                        </DialogTrigger>
                    ) : null}

                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add stock item</DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-3 py-2 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>Stock Category</Label>
                                <RadioGroup
                                    value={category}
                                    onValueChange={(value) => setCategory(value)}
                                    className="grid grid-cols-2 gap-2"
                                >
                                    <CategoryOption value="materials" label="Materials" current={category} />
                                    <CategoryOption value="waste-materials" label="Waste Materials" current={category} />
                                </RadioGroup>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Type</Label>
                                <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                                    <SelectTrigger>
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

                                <div className="mt-2 flex gap-2">
                                    <Input
                                        value={customTypeName}
                                        onChange={(event) => setCustomTypeName(event.target.value)}
                                        placeholder="Add custom type"
                                    />
                                    <Button type="button" variant="outline" onClick={addMaterialType}>
                                        Add
                                    </Button>
                                </div>
                            </div>

                            {category === "waste-materials" ? (
                                <>
                                    <div className="space-y-1.5">
                                        <Label>ID</Label>
                                        <Input value={wasteId} readOnly placeholder="Auto generated" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Size</Label>
                                        <Input
                                            value={wasteSize}
                                            onChange={(e) => setWasteSize(e.target.value)}
                                            placeholder="e.g. 18mm offcuts"
                                        />
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label>Project</Label>
                                        <Select value={wasteProjectId} onValueChange={setWasteProjectId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select project (optional)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No project</SelectItem>
                                                {projects.map((project) => (
                                                    <SelectItem key={project.id} value={project.id}>
                                                        {project.code} - {project.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label>Note</Label>
                                        <Input
                                            value={wasteNote}
                                            onChange={(e) => setWasteNote(e.target.value)}
                                            placeholder="Add note"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <Label>Thickness</Label>
                                        <Select
                                            value={form.thickness ?? "1mm"}
                                            onValueChange={(value) => setForm({ ...form, thickness: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select thickness" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {thicknessOptions.map((thickness) => (
                                                    <SelectItem key={thickness} value={thickness}>
                                                        {thickness}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Quantity</Label>
                                        <Input
                                            type="number"
                                            value={form.quantity || ""}
                                            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                                        />
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label>Unit</Label>
                                        <Select value={form.unit} onValueChange={(value) => setForm({ ...form, unit: value })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {units.map((unit) => (
                                                    <SelectItem key={unit} value={unit}>
                                                        {unit}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={add}>Add stock</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="materials">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 sm:inline-flex sm:w-auto">
                    <TabsTrigger value="materials" className="w-full">
                        Materials
                    </TabsTrigger>
                    <TabsTrigger value="waste-materials" className="w-full">
                        Waste Materials
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="materials" className="mt-4">
                    <Card className="border-border/60 shadow-[var(--shadow-card)]">
                        <CardContent className="p-0">
                            <div className="border-b border-border p-4">
                                <div className="relative w-full sm:max-w-sm">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={stockSearch}
                                        onChange={(e) => {
                                            setStockPage(1);
                                            setStockSearch(e.target.value);
                                        }}
                                        placeholder="Search type or thickness"
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 p-4 md:hidden">
                                {list.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-foreground">{item.type}</p>
                                                <p className="mt-1 text-sm text-muted-foreground">{item.thickness || "-"}</p>
                                            </div>
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${item.quantity < 50
                                                    ? "border-warning/30 bg-warning/15 text-warning-foreground"
                                                    : "border-success/20 bg-success/10 text-success"}`}
                                            >
                                                {item.quantity < 50 ? "Low" : "In stock"}
                                            </span>
                                        </div>

                                        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                                            <MobileInfoTile label="Quantity" value={Number(item.quantity.toFixed(2))} />
                                            <MobileInfoTile label="Unit" value={item.unit} />
                                            <div className="flex items-center justify-end gap-1 sm:justify-start">
                                                {canUpdate || canDelete ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                <MoreVertical className="mr-1 h-4 w-4" />
                                                                Actions
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-36">
                                                            {canUpdate ? (
                                                                <DropdownMenuItem onClick={() => openEditStock(item)}>
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                            ) : null}
                                                            {canDelete ? (
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => confirmDeleteStock(item)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            ) : null}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {list.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                                        No stock items found.
                                    </div>
                                ) : null}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                            <th className="px-4 py-3 font-medium">Type</th>
                                            <th className="px-4 py-3 font-medium">Thickness</th>
                                            <th className="px-4 py-3 text-right font-medium">Quantity</th>
                                            <th className="px-4 py-3 font-medium">Unit</th>
                                            <th className="px-4 py-3 font-medium">Status</th>
                                            <th className="px-4 py-3 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((item) => (
                                            <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium">{item.type}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{item.thickness || "-"}</td>
                                                <td className="px-4 py-3 text-right font-semibold">{Number(item.quantity.toFixed(2))}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${item.quantity < 50
                                                            ? "border-warning/30 bg-warning/15 text-warning-foreground"
                                                            : "border-success/20 bg-success/10 text-success"}`}
                                                    >
                                                        {item.quantity < 50 ? "Low" : "In stock"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {canUpdate || canDelete ? (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" aria-label={`Stock actions for ${item.type}`}>
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-36">
                                                                {canUpdate ? (
                                                                    <DropdownMenuItem onClick={() => openEditStock(item)}>
                                                                        <Pencil className="mr-2 h-4 w-4" />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                ) : null}
                                                                {canDelete ? (
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => confirmDeleteStock(item)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                ) : null}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))}

                                        {list.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                                    No stock items found.
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-4 pb-4 pt-2">
                                <PaginationControls
                                    page={stockPagination.page}
                                    totalPages={stockPagination.totalPages}
                                    total={stockPagination.total}
                                    label="stock items"
                                    loading={false}
                                    onPrevious={() => setStockPage((current) => Math.max(1, current - 1))}
                                    onNext={() => setStockPage((current) => Math.min(stockPagination.totalPages || 1, current + 1))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="waste-materials" className="mt-4">
                    <Card className="border-border/60 shadow-[var(--shadow-card)]">
                        <CardContent className="p-0">
                            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
                                <div className="relative min-w-[220px] flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={wasteSearch}
                                        onChange={(e) => {
                                            setWastePage(1);
                                            setWasteSearch(e.target.value);
                                        }}
                                        placeholder="Search ID, material, order, size, note"
                                        className="pl-9"
                                    />
                                </div>

                                <Select
                                    value={wasteStockFilter}
                                    onValueChange={(value) => {
                                        setWastePage(1);
                                        setWasteStockFilter(value);
                                    }}
                                >
                                    <SelectTrigger className="w-full sm:w-44">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All stock</SelectItem>
                                        <SelectItem value="available">Available stock</SelectItem>
                                        <SelectItem value="used">Used stock</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3 p-4 md:hidden">
                                {filteredWasteList.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-foreground">{item.id}</p>
                                                <p className="mt-1 text-sm text-muted-foreground">{item.material}</p>
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                {canUpdate || canDelete ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                <MoreVertical className="mr-1 h-4 w-4" />
                                                                Actions
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-36">
                                                            {canUpdate ? (
                                                                <DropdownMenuItem onClick={() => openAssignWaste(item)}>
                                                                    <PackageCheck className="mr-2 h-4 w-4" />
                                                                    Assign
                                                                </DropdownMenuItem>
                                                            ) : null}
                                                            {canDelete ? (
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => confirmDeleteWaste(item)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            ) : null}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm">
                                            <MobileInfoTile label="Created From" value={item.projectName || "-"} />
                                            <MobileInfoTile label="Used For" value={item.usedForProjectName || "-"} />
                                            <MobileInfoTile label="Size" value={item.size || "-"} />
                                            <MobileInfoTile label="Note" value={item.note || "-"} />
                                        </div>
                                    </div>
                                ))}

                                {filteredWasteList.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                                        {wasteList.length === 0 ? "No waste materials found." : "No waste materials match."}
                                    </div>
                                ) : null}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                            <th className="px-4 py-3 font-medium">ID</th>
                                            <th className="px-4 py-3 font-medium">Material</th>
                                            <th className="px-4 py-3 font-medium">Created From</th>
                                            <th className="px-4 py-3 font-medium">Used For</th>
                                            <th className="px-4 py-3 font-medium">Size</th>
                                            <th className="px-4 py-3 font-medium">Note</th>
                                            <th className="px-4 py-3 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredWasteList.map((item) => (
                                            <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium">{item.id}</td>
                                                <td className="px-4 py-3 font-medium">{item.material}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{item.projectName || "-"}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{item.usedForProjectName || "-"}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{item.size}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{item.note || "-"}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {canUpdate || canDelete ? (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" aria-label={`Waste material actions for ${item.id}`}>
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-36">
                                                                {canUpdate ? (
                                                                    <DropdownMenuItem onClick={() => openAssignWaste(item)}>
                                                                        <PackageCheck className="mr-2 h-4 w-4" />
                                                                        Assign
                                                                    </DropdownMenuItem>
                                                                ) : null}
                                                                {canDelete ? (
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => confirmDeleteWaste(item)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                ) : null}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))}

                                        {filteredWasteList.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                                    {wasteList.length === 0 ? "No waste materials found." : "No waste materials match."}
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-4 pb-4 pt-2">
                                <PaginationControls
                                    page={wastePagination.page}
                                    totalPages={wastePagination.totalPages}
                                    total={wastePagination.total}
                                    label="waste materials"
                                    loading={false}
                                    onPrevious={() => setWastePage((current) => Math.max(1, current - 1))}
                                    onNext={() => setWastePage((current) => Math.min(wastePagination.totalPages || 1, current + 1))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog
                open={!!editingStock}
                onOpenChange={(next) => {
                    if (!next) {
                        setEditingStock(null);
                        setEditQuantity("");
                    }
                }}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Update stock value</DialogTitle>
                        {editingStock ? (
                            <p className="text-sm font-medium text-muted-foreground">
                                {editingStock.type} {editingStock.thickness || editingStock.material}
                            </p>
                        ) : null}
                    </DialogHeader>

                    <div className="space-y-1.5">
                        <Label>Quantity</Label>
                        <Input
                            type="number"
                            min={0}
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingStock(null);
                                setEditQuantity("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={updateStockQuantity}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!assigningWaste}
                onOpenChange={(next) => {
                    if (!next) closeAssignWaste();
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign waste material</DialogTitle>
                        {assigningWaste ? (
                            <p className="text-sm font-medium text-muted-foreground">
                                {assigningWaste.id} - {assigningWaste.material}
                            </p>
                        ) : null}
                    </DialogHeader>

                    <div className="grid gap-3 py-2">
                        <div className="space-y-1.5">
                            <Label>Created from</Label>
                            <Select value={assignCreatedFromId} onValueChange={setAssignCreatedFromId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select order" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No order</SelectItem>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.code} - {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Used for</Label>
                            <Select value={assignUsedForId} onValueChange={setAssignUsedForId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select order" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No order</SelectItem>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.code} - {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeAssignWaste}>
                            Cancel
                        </Button>
                        <Button onClick={saveWasteAssignment}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteStockItem} onOpenChange={() => setDeleteStockItem(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Stock Item</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-foreground">
                                {deleteStockItem?.type} {deleteStockItem?.thickness}
                            </span>
                            ? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteStockItem(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={deleteStock}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteWasteItem} onOpenChange={() => setDeleteWasteItem(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Waste Material</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-foreground">
                                {deleteWasteItem?.material} ({deleteWasteItem?.id})
                            </span>
                            ? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteWasteItem(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={deleteWaste}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
function CategoryOption({ value, label, current, }) {
    return (
        <label
            className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm font-medium ${current === value
                ? "border-primary bg-[image:var(--gradient-soft)]"
                : "border-border bg-card"}`}
        >
            <RadioGroupItem value={value} />
            {label}
        </label>
    );
}
function MobileInfoTile({ label, value }) {
    return (
        <div className="rounded-lg bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="break-words text-foreground">{value}</p>
        </div>
    );
}
