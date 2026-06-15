import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
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
import { Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { type StoredService } from "@/lib/project-services";
import { canPageAction } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/services")({
  head: () => ({ meta: [{ title: "Services — Factrova" }] }),
  component: Services,
});

type Service = StoredService;

const UNITS = ["sheet", "meter", "km", "hole", "piece", "kg", "hour"];

function Services() {
  const canAdd = canPageAction("services", "add");
  const canDelete = canPageAction("services", "delete");
  const [list, setList] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", price: "", unit: "sheet" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.list<Service>("services");
      setList((data ?? []) as Service[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load services");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!form.name.trim()) return toast.error("Service name is required");
    const service: Service = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      price: Number(form.price) || 0,
      unit: form.unit,
    };
    try {
      const data = await api.create<Service>("services", {
        name: service.name,
        price: service.price,
        unit: service.unit,
      });
      setList([data as Service, ...list]);
      toast.success("Service added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save service");
    }
    setOpen(false);
    setForm({ name: "", price: "", unit: "sheet" });
  };

  const remove = async (id: string) => {
    try {
      await api.remove("services", id);
      setList(list.filter((service) => service.id !== id));
      toast.success("Removed");
    } catch {
      toast.error("Unable to remove service");
    }
  };

  return (
    <DashboardLayout title="Services">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Services your factory provides, with pricing per unit.
        </p>
        {canAdd ? <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Service
        </Button> : null}
      </div>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  list.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[image:var(--gradient-soft)] text-primary">
                            <Wrench className="h-4 w-4" />
                          </div>
                          {s.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ₹{Number(s.price.toFixed(2)).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">per {s.unit}</td>
                      <td className="px-4 py-3 text-right">
                        {canDelete ? <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button> : null}
                      </td>
                    </tr>
                  ))}
                {!loading && list.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      No services yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add service</DialogTitle>
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
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        per {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Example: ₹{form.price || "55"} per {form.unit}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={add}>Add Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
