import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { vendors as initial, type Vendor } from "@/lib/data";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { canPageAction } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/vendors")({
  head: () => ({ meta: [{ title: "Vendors — Factrova" }] }),
  component: Vendors,
});

function Vendors() {
  const canAdd = canPageAction("vendors", "add");
  const canEdit = canPageAction("vendors", "edit");
  const canDelete = canPageAction("vendors", "delete");
  const [list, setList] = useState<Vendor[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const blank: Vendor = {
    id: "",
    name: "",
    contact: "",
    alternativeContact: "",
    email: "",
    gst: "",
    address: "",
    materials: "",
  };
  const [form, setForm] = useState<Vendor>(blank);

  const mapVendor = (row: Partial<Vendor> & { id: string; name: string }): Vendor => ({
    id: row.id,
    name: row.name,
    contact: row.contact ?? "",
    alternativeContact: row.alternativeContact ?? "",
    email: row.email ?? "",
    gst: row.gst ?? "",
    address: row.address ?? "",
    materials: row.materials ?? "",
  });

  const load = async () => {
    try {
      const data = await api.list<Vendor>("vendors");
      setList((data ?? []).map(mapVendor));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load vendors");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Vendor name required");
    const payload = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      alternativeContact: form.alternativeContact.trim(),
      email: form.email.trim(),
      gst: form.gst.trim(),
      address: form.address.trim(),
      materials: form.materials.trim(),
    };

    if (editing) {
      try {
        const data = await api.update<Vendor>("vendors", editing.id, payload);
        setList((l) => l.map((v) => (v.id === editing.id ? mapVendor(data) : v)));
      } catch (error) {
        return toast.error(error instanceof Error ? error.message : "Unable to update vendor");
      }
      toast.success("Vendor updated");
    } else {
      try {
        const data = await api.create<Vendor>("vendors", payload);
        setList((l) => [mapVendor(data), ...l]);
      } catch (error) {
        return toast.error(error instanceof Error ? error.message : "Unable to add vendor");
      }
      toast.success("Vendor added");
    }
    setOpen(false); setEditing(null); setForm(blank);
  };

  return (
    <DashboardLayout title="Vendors">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(blank); } }}>
          {canAdd ? <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm(blank); }}>
              <Plus className="mr-1 h-4 w-4" /> Add Vendor
            </Button>
          </DialogTrigger> : null}
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit vendor" : "New vendor"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2 sm:grid-cols-2">
              <FormField label="Vendor Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} className="sm:col-span-2" />
              <FormField label="Contact" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} />
              <FormField label="Alternative Contact" value={form.alternativeContact} onChange={(v) => setForm({ ...form, alternativeContact: v })} />
              <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <FormField label="GST" value={form.gst} onChange={(v) => setForm({ ...form, gst: v })} />
              <FormField label="Materials Supplied" value={form.materials} onChange={(v) => setForm({ ...form, materials: v })} className="sm:col-span-2" />
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Full Address</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Enter complete vendor address"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              {(editing ? canEdit : canAdd) ? <Button onClick={save}>{editing ? "Save changes" : "Add vendor"}</Button> : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">GST</th>
                  <th className="px-4 py-3 font-medium">Materials</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((v) => (
                  <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{v.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{v.contact || "-"}</div>
                      {v.alternativeContact && (
                        <div className="text-xs">Alt: {v.alternativeContact}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.email || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.gst || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.materials}</td>
                    <td className="max-w-64 px-4 py-3 text-muted-foreground">
                      <p className="line-clamp-2">{v.address || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canEdit ? <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setForm(v); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button> : null}
                        {canDelete ? <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await api.remove("vendors", v.id);
                              setList((l) => l.filter((x) => x.id !== v.id));
                              toast.success("Vendor removed");
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Unable to remove vendor");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
