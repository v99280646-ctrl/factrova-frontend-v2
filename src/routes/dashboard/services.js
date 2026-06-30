import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { PaginationControls } from "@/components/pagination-controls.js";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Edit, Plus, Search, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { canPageAction } from "@/lib/auth";
import { SERVICE_ROLE_OPTIONS } from "@/lib/employee-roles";
export const Route = createFileRoute("/dashboard/services")({
    head: () => ({ meta: [{ title: "Services — Factrova" }] }),
    component: Services,
});
const UNITS = ["sheet", "meter", "km", "hole", "piece", "kg", "hour"];
export function Services() {
    const canAdd = canPageAction("services", "add");
    const canEdit = canPageAction("services", "edit");
    const canDelete = canPageAction("services", "delete");
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [form, setForm] = useState({ name: "", price: "", unit: "sheet", employeeRole: "" });
  const [editingId, setEditingId] = useState("");
    const resetForm = () => {
        setForm({ name: "", price: "", unit: "sheet", employeeRole: "" });
        setEditingId("");
    };
    const openCreate = () => {
        resetForm();
        setOpen(true);
    };
    const openEdit = (service) => {
        setEditingId(service.id);
        setForm({
            name: service.name ?? "",
            price: String(service.price ?? 0),
            unit: service.unit ?? "sheet",
            employeeRole: service.employeeRole ?? "",
        });
        setOpen(true);
    };
    const load = async () => {
        setLoading(true);
        try {
    const data = await api.list("services", {
      page,
      limit: 20,
      search: q.trim() || undefined,
    });
    setList(Array.isArray(data) ? data : data?.items ?? []);
    setPagination(Array.isArray(data) ? { page, limit: 20, total: data.length, totalPages: 1, hasNext: false, hasPrev: false } : data?.pagination ?? { page, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      }
      catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load services");
      }
      setLoading(false);
    };
    useEffect(() => {
        const timer = setTimeout(() => {
            load();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, q, refreshToken]);
    const add = async () => {
        if (!form.name.trim())
            return toast.error("Service name is required");
        const payload = {
            name: form.name.trim(),
            price: Number(form.price) || 0,
            unit: form.unit,
            employeeRole: form.employeeRole || null,
        };
        try {
            if (editingId) {
                const data = await api.update("services", editingId, payload);
                setList(list.map((service) => service.id === editingId ? data : service));
                toast.success("Service updated");
            }
            else {
                const data = await api.create("services", payload);
                setList([data, ...list]);
                toast.success("Service added");
            }
              setOpen(false);
              resetForm();
              setRefreshToken((value) => value + 1);
            }
            catch (error) {
              toast.error(error instanceof Error ? error.message : "Unable to save service");
            }
    };
    const remove = async (id) => {
        try {
            await api.remove("services", id);
            setList(list.filter((service) => service.id !== id));
            toast.success("Removed");
            setRefreshToken((value) => value + 1);
        }
        catch {
            toast.error("Unable to remove service");
        }
    };
    return (_jsxs(DashboardLayout, { title: "Services", children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "relative w-full max-w-sm", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { value: q, onChange: (e) => { setPage(1); setQ(e.target.value); }, placeholder: "Search services…", className: "pl-9" })] }), canAdd ? _jsxs(Button, { onClick: openCreate, children: [_jsx(Plus, { className: "mr-1 h-4 w-4" }), " Add Service"] }) : null] }), _jsx(Card, { className: "border-border/60 shadow-[var(--shadow-card)]", children: _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground", children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Service" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Price" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Unit" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Team Role" }), _jsx("th", { className: "px-4 py-3 text-right font-medium", children: "Actions" })] }) }), _jsxs("tbody", { children: [loading && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-10 text-center text-muted-foreground", children: "Loading\u2026" }) })), !loading &&
                                            list.map((s) => (_jsxs("tr", { className: "border-b border-border/50 last:border-0 hover:bg-muted/30", children: [_jsx("td", { className: "px-4 py-3 font-medium", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-md bg-[image:var(--gradient-soft)] text-primary", children: _jsx(Wrench, { className: "h-4 w-4" }) }), s.name] }) }), _jsxs("td", { className: "px-4 py-3 font-semibold", children: ["\u20B9", Number(s.price.toFixed(2)).toLocaleString("en-IN")] }), _jsxs("td", { className: "px-4 py-3 text-muted-foreground", children: ["per ", s.unit] }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.employeeRole || "None" }), _jsxs("td", { className: "px-4 py-3 text-right", children: [canEdit ? _jsx(Button, { variant: "ghost", size: "icon", onClick: () => openEdit(s), children: _jsx(Edit, { className: "h-4 w-4 text-muted-foreground" }) }) : null, canDelete ? _jsx(Button, { variant: "ghost", size: "icon", onClick: () => remove(s.id), children: _jsx(Trash2, { className: "h-4 w-4 text-muted-foreground" }) }) : null] })] }, s.id))), !loading && list.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-10 text-center text-muted-foreground", children: "No services yet." }) }))] })] }) }) }) }), _jsxs("div", { className: "mt-4", children: [_jsx(PaginationControls, { page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, label: "services", loading: loading, onPrevious: () => setPage((current) => Math.max(1, current - 1)), onNext: () => setPage((current) => current + 1) }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: ["Search results for ", q || "all services"] })] }), _jsx(Dialog, { open: open, onOpenChange: (nextOpen) => { setOpen(nextOpen); if (!nextOpen) {
                resetForm();
            } }, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: editingId ? "Edit service" : "Add service" }) }), _jsxs("div", { className: "grid gap-3", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Service name" }), _jsx(Input, { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), placeholder: "e.g. Lamination Pressing" })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Price (\u20B9)" }), _jsx(Input, { type: "number", value: form.price, onChange: (e) => setForm({ ...form, price: e.target.value }), placeholder: "e.g. 55" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Unit" }), _jsxs(Select, { value: form.unit, onValueChange: (v) => setForm({ ...form, unit: v }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: UNITS.map((u) => (_jsxs(SelectItem, { value: u, children: ["per ", u] }, u))) })] })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Team member role" }), _jsxs(Select, { value: form.employeeRole || "__none__", onValueChange: (v) => setForm({ ...form, employeeRole: v === "__none__" ? "" : v }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "None" }) }), _jsx(SelectContent, { children: SERVICE_ROLE_OPTIONS.map((role) => (_jsx(SelectItem, { value: role.value, children: role.label }, role.value))) })] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Choose which team role should handle this service, or leave it as None." })] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Example: \u20B9", form.price || "55", " per ", form.unit] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => { setOpen(false); resetForm(); }, children: "Cancel" }), _jsx(Button, { onClick: add, children: editingId ? "Update Service" : "Add Service" })] })] }) })] }));
}
