import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { PaginationControls } from "@/components/pagination-controls.js";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      setPagination(
        Array.isArray(data)
          ? { page, limit: 20, total: data.length, totalPages: 1, hasNext: false, hasPrev: false }
          : data?.pagination ?? { page, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, q, refreshToken]);

  const add = async () => {
    if (!form.name.trim()) {
      toast.error("Service name is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      price: Number(form.price) || 0,
      unit: form.unit,
      employeeRole: form.employeeRole || null,
    };

    try {
      if (editingId) {
        const data = await api.update("services", editingId, payload);
        setList((current) => current.map((service) => (service.id === editingId ? data : service)));
        toast.success("Service updated");
      } else {
        const data = await api.create("services", payload);
        setList((current) => [data, ...current]);
        toast.success("Service added");
      }

      setOpen(false);
      resetForm();
      setRefreshToken((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save service");
    }
  };

  const remove = async (id) => {
    try {
      await api.remove("services", id);
      setList((current) => current.filter((service) => service.id !== id));
      toast.success("Removed");
      setRefreshToken((value) => value + 1);
    } catch {
      toast.error("Unable to remove service");
    }
  };

  return (
    <DashboardLayout title="Services">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search services…"
            className="pl-9"
          />
        </div>
        {canAdd ? (
          <Button className="w-full sm:w-auto" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Add Service
          </Button>
        ) : null}
      </div>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {loading ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : null}

            {!loading
              ? list.map((service) => (
                  <div key={service.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[image:var(--gradient-soft)] text-primary">
                            <Wrench className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{service.name}</p>
                            <p className="text-sm text-muted-foreground">{service.employeeRole || "No team role"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        {canEdit ? (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="ghost" size="icon" onClick={() => remove(service.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <MobileInfoRow label="Price" value={`₹${Number((service.price ?? 0).toFixed(2)).toLocaleString("en-IN")}`} />
                      <MobileInfoRow label="Unit" value={`per ${service.unit || "-"}`} />
                    </div>
                  </div>
                ))
              : null}

            {!loading && list.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No services yet.
              </div>
            ) : null}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Team Role</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? list.map((service) => (
                      <tr key={service.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[image:var(--gradient-soft)] text-primary">
                              <Wrench className="h-4 w-4" />
                            </div>
                            {service.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          ₹{Number((service.price ?? 0).toFixed(2)).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">per {service.unit}</td>
                        <td className="px-4 py-3 text-muted-foreground">{service.employeeRole || "None"}</td>
                        <td className="px-4 py-3 text-right">
                          {canEdit ? (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button variant="ghost" size="icon" onClick={() => remove(service.id)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  : null}

                {!loading && list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No services yet.
                    </td>
                  </tr>
                ) : null}
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
          label="services"
          loading={loading}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => current + 1)}
        />
        <p className="mt-2 text-sm text-muted-foreground">Search results for {q || "all services"}</p>
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit service" : "Add service"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Service name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Lamination Pressing"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 55"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(value) => setForm({ ...form, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        per {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Team member role</Label>
              <Select
                value={form.employeeRole || "__none__"}
                onValueChange={(value) => setForm({ ...form, employeeRole: value === "__none__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {SERVICE_ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose which team role should handle this service, or leave it as None.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Example: ₹{form.price || "55"} per {form.unit}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={add}>{editingId ? "Update Service" : "Add Service"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function MobileInfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/30 px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  );
}
