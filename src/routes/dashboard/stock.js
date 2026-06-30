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
    return (_jsxs(DashboardLayout, { title: "Stock Management", children: [_jsx("div", { className: "mb-4 flex justify-end", children: _jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [canAdd ? (_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { children: [_jsx(PackagePlus, { className: "mr-1 h-4 w-4" }), " Add Stock"] }) })) : null, _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Add stock item" }) }), _jsxs("div", { className: "grid gap-3 py-2 sm:grid-cols-2", children: [_jsxs("div", { className: "space-y-1.5 sm:col-span-2", children: [_jsx(Label, { children: "Stock Category" }), _jsxs(RadioGroup, { value: category, onValueChange: (value) => setCategory(value), className: "grid grid-cols-2 gap-2", children: [_jsx(CategoryOption, { value: "materials", label: "Materials", current: category }), _jsx(CategoryOption, { value: "waste-materials", label: "Waste Materials", current: category })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Type" }), _jsxs(Select, { value: form.type, onValueChange: (value) => setForm({ ...form, type: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select type" }) }), _jsx(SelectContent, { children: materialTypes.map((type) => (_jsx(SelectItem, { value: type.label, children: type.label }, type.id))) })] }), _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx(Input, { value: customTypeName, onChange: (event) => setCustomTypeName(event.target.value), placeholder: "Add custom type" }), _jsx(Button, { type: "button", variant: "outline", onClick: addMaterialType, children: "Add" })] })] }), category === "waste-materials" ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "ID" }), _jsx(Input, { value: wasteId, readOnly: true, placeholder: "Auto generated" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Size" }), _jsx(Input, { value: wasteSize, onChange: (e) => setWasteSize(e.target.value), placeholder: "e.g. 18mm offcuts" })] }), _jsxs("div", { className: "space-y-1.5 sm:col-span-2", children: [_jsx(Label, { children: "Project" }), _jsxs(Select, { value: wasteProjectId, onValueChange: setWasteProjectId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select project (optional)" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "none", children: "No project" }), projects.map((project) => (_jsxs(SelectItem, { value: project.id, children: [project.code, " - ", project.name] }, project.id)))] })] })] }), _jsxs("div", { className: "space-y-1.5 sm:col-span-2", children: [_jsx(Label, { children: "Note" }), _jsx(Input, { value: wasteNote, onChange: (e) => setWasteNote(e.target.value), placeholder: "Add note" })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Thickness" }), _jsxs(Select, { value: form.thickness ?? "1mm", onValueChange: (value) => setForm({ ...form, thickness: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select thickness" }) }), _jsx(SelectContent, { children: thicknessOptions.map((thickness) => (_jsx(SelectItem, { value: thickness, children: thickness }, thickness))) })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Quantity" }), _jsx(Input, { type: "number", value: form.quantity || "", onChange: (e) => setForm({ ...form, quantity: Number(e.target.value) }) })] }), _jsxs("div", { className: "space-y-1.5 sm:col-span-2", children: [_jsx(Label, { children: "Unit" }), _jsxs(Select, { value: form.unit, onValueChange: (value) => setForm({ ...form, unit: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: units.map((unit) => (_jsx(SelectItem, { value: unit, children: unit }, unit))) })] })] })] }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancel" }), _jsx(Button, { onClick: add, children: "Add stock" })] })] })] }) }), _jsxs(Tabs, { defaultValue: "materials", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "materials", children: "Materials" }), _jsx(TabsTrigger, { value: "waste-materials", children: "Waste Materials" })] }), _jsx(TabsContent, { value: "materials", className: "mt-4", children: _jsx(Card, { className: "border-border/60 shadow-[var(--shadow-card)]", children: _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground", children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Type" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Thickness" }), _jsx("th", { className: "px-4 py-3 text-right font-medium", children: "Quantity" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Unit" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-right font-medium", children: "Actions" })] }) }), _jsxs("tbody", { children: [list.map((s) => (_jsxs("tr", { className: "border-b border-border/50 last:border-0 hover:bg-muted/30", children: [_jsx("td", { className: "px-4 py-3 font-medium", children: s.type }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.thickness || "-" }), _jsx("td", { className: "px-4 py-3 text-right font-semibold", children: Number(s.quantity.toFixed(2)) }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.unit }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.quantity < 50
                                                                        ? "border-warning/30 bg-warning/15 text-warning-foreground"
                                                                        : "border-success/20 bg-success/10 text-success"}`, children: s.quantity < 50 ? "Low" : "In stock" }) }), _jsx("td", { className: "px-4 py-3 text-right", children: canUpdate || canDelete ? (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", "aria-label": `Stock actions for ${s.type}`, children: _jsx(MoreVertical, { className: "h-4 w-4" }) }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-36", children: [canUpdate ? (_jsxs(DropdownMenuItem, { onClick: () => openEditStock(s), children: [_jsx(Pencil, { className: "mr-2 h-4 w-4" }), "Edit"] })) : null, canDelete ? (_jsxs(DropdownMenuItem, { className: "text-destructive focus:text-destructive", onClick: () => confirmDeleteStock(s), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete"] })) : null] })] })) : null })] }, s.id))), list.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-10 text-center text-sm text-muted-foreground", children: "No stock items found." }) }))] })] }) }) }) }) }), _jsx(TabsContent, { value: "waste-materials", className: "mt-4", children: _jsx(Card, { className: "border-border/60 shadow-[var(--shadow-card)]", children: _jsxs(CardContent, { className: "p-0", children: [_jsxs("div", { className: "flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center", children: [_jsxs("div", { className: "relative min-w-[220px] flex-1", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { value: wasteSearch, onChange: (e) => setWasteSearch(e.target.value), placeholder: "Search ID, material, order, size, note", className: "pl-9" })] }), _jsxs(Select, { value: wasteStockFilter, onValueChange: (value) => setWasteStockFilter(value), children: [_jsx(SelectTrigger, { className: "w-full sm:w-44", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All stock" }), _jsx(SelectItem, { value: "available", children: "Available stock" }), _jsx(SelectItem, { value: "used", children: "Used stock" })] })] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground", children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "ID" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Material" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Created From" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Used For" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Size" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Note" }), _jsx("th", { className: "px-4 py-3 text-right font-medium", children: "Actions" })] }) }), _jsxs("tbody", { children: [filteredWasteList.map((s) => (_jsxs("tr", { className: "border-b border-border/50 last:border-0 hover:bg-muted/30", children: [_jsx("td", { className: "px-4 py-3 font-medium", children: s.id }), _jsx("td", { className: "px-4 py-3 font-medium", children: s.material }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.projectName || "-" }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.usedForProjectName || "-" }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.size }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.note || "-" }), _jsx("td", { className: "px-4 py-3 text-right", children: canUpdate || canDelete ? (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", "aria-label": `Waste material actions for ${s.id}`, children: _jsx(MoreVertical, { className: "h-4 w-4" }) }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-36", children: [canUpdate ? (_jsxs(DropdownMenuItem, { onClick: () => openAssignWaste(s), children: [_jsx(PackageCheck, { className: "mr-2 h-4 w-4" }), "Assign"] })) : null, canDelete ? (_jsxs(DropdownMenuItem, { className: "text-destructive focus:text-destructive", onClick: () => confirmDeleteWaste(s), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete"] })) : null] })] })) : null })] }, s.id))), filteredWasteList.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-4 py-10 text-center text-sm text-muted-foreground", children: wasteList.length === 0
                                                                    ? "No waste materials found."
                                                                    : "No waste materials match." }) }))] })] }) })] }) }) })] }), _jsx(Dialog, { open: !!editingStock, onOpenChange: (next) => {
                    if (!next) {
                        setEditingStock(null);
                        setEditQuantity("");
                    }
                }, children: _jsxs(DialogContent, { className: "max-w-sm", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Update stock value" }), editingStock && (_jsxs("p", { className: "text-sm font-medium text-muted-foreground", children: [editingStock.type, " ", editingStock.thickness || editingStock.material] }))] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Quantity" }), _jsx(Input, { type: "number", min: 0, value: editQuantity, onChange: (e) => setEditQuantity(e.target.value), autoFocus: true })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => {
                                        setEditingStock(null);
                                        setEditQuantity("");
                                    }, children: "Cancel" }), _jsx(Button, { onClick: updateStockQuantity, children: "Save" })] })] }) }), _jsx(Dialog, { open: !!assigningWaste, onOpenChange: (next) => {
                    if (!next)
                        closeAssignWaste();
                }, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Assign waste material" }), assigningWaste && (_jsxs("p", { className: "text-sm font-medium text-muted-foreground", children: [assigningWaste.id, " - ", assigningWaste.material] }))] }), _jsxs("div", { className: "grid gap-3 py-2", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Created from" }), _jsxs(Select, { value: assignCreatedFromId, onValueChange: setAssignCreatedFromId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select order" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "none", children: "No order" }), projects.map((project) => (_jsxs(SelectItem, { value: project.id, children: [project.code, " - ", project.name] }, project.id)))] })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Used for" }), _jsxs(Select, { value: assignUsedForId, onValueChange: setAssignUsedForId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select order" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "none", children: "No order" }), projects.map((project) => (_jsxs(SelectItem, { value: project.id, children: [project.code, " - ", project.name] }, project.id)))] })] })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: closeAssignWaste, children: "Cancel" }), _jsx(Button, { onClick: saveWasteAssignment, children: "Save" })] })] }) }), _jsx(Dialog, { open: !!deleteStockItem, onOpenChange: () => setDeleteStockItem(null), children: _jsxs(DialogContent, { className: "max-w-sm", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Delete Stock Item" }) }), _jsx("div", { className: "py-4", children: _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Are you sure you want to delete", " ", _jsxs("span", { className: "font-semibold text-foreground", children: [deleteStockItem?.type, " ", deleteStockItem?.thickness] }), "? This action cannot be undone."] }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setDeleteStockItem(null), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: deleteStock, children: "Delete" })] })] }) }), _jsx(Dialog, { open: !!deleteWasteItem, onOpenChange: () => setDeleteWasteItem(null), children: _jsxs(DialogContent, { className: "max-w-sm", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Delete Waste Material" }) }), _jsx("div", { className: "py-4", children: _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Are you sure you want to delete", " ", _jsxs("span", { className: "font-semibold text-foreground", children: [deleteWasteItem?.material, " (", deleteWasteItem?.id, ")"] }), "? This action cannot be undone."] }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setDeleteWasteItem(null), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: deleteWaste, children: "Delete" })] })] }) })] }));
}
function CategoryOption({ value, label, current, }) {
    return (_jsxs("label", { className: `flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm font-medium ${current === value
            ? "border-primary bg-[image:var(--gradient-soft)]"
            : "border-border bg-card"}`, children: [_jsx(RadioGroupItem, { value: value }), label] }));
}
