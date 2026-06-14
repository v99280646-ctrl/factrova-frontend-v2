import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDown, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { type Customer } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { canPageAction } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/customers")({
  head: () => ({ meta: [{ title: "Customers — Factrova" }] }),
  component: Customers,
});

function Customers() {
  const canAdd = canPageAction("customers", "add");
  const canEdit = canPageAction("customers", "edit");
  const canDelete = canPageAction("customers", "delete");
  const [list, setList] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const blank: Customer = {
    id: "",
    company: "",
    contact: "",
    phone: "",
    email: "",
    address: "",
    state: "",
    district: "",
    pincode: "",
    gstin: "",
  };
  const [form, setForm] = useState<Customer>(blank);

  const filtered = list.filter((c) =>
    [c.company, c.contact, c.phone, c.email].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  const load = async () => {
    try {
      const data = await api.list<Customer>("customers");
      setList(data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load customers");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.company.trim()) return toast.error("Company name required");
    const payload = {
      company: form.company.trim(),
      contact: form.contact.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      state: form.state?.trim() || null,
      district: form.district?.trim() || null,
      pincode: form.pincode?.trim() || null,
      gstin: form.gstin?.trim() || null,
    };

    if (editing) {
      const nextList = list.map((c) => (c.id === editing.id ? { ...form, id: editing.id } : c));
      try {
        await api.update<Customer>("customers", editing.id, payload);
        setList(nextList);
        toast.success("Customer updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save customer");
      }
    } else {
      try {
        const data = await api.create<Customer>("customers", payload);
        const nextList = [data, ...list];
        setList(nextList);
        toast.success("Customer added");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save customer");
      }
    }
    setOpen(false);
    setEditing(null);
    setForm(blank);
    setAdvancedOpen(false);
  };

  return (
    <DashboardLayout title="Customers">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers…" className="pl-9" />
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(blank); setAdvancedOpen(false); } }}>
          {canAdd ? <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm(blank); setAdvancedOpen(false); }}>
              <Plus className="mr-1 h-4 w-4" /> Add Customer
            </Button>
          </DialogTrigger> : null}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2 sm:grid-cols-2">
              <Field label="Company Name" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
              <Field label="Contact Person" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-0 text-sm font-medium text-foreground hover:bg-transparent"
                  onClick={() => setAdvancedOpen((v) => !v)}
                >
                  Advanced
                  <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
                </Button>
              </div>
              {advancedOpen && (
                <>
                  <div className="sm:col-span-2">
                    <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                  </div>
                  <Field label="State" value={form.state ?? ""} onChange={(v) => setForm({ ...form, state: v })} />
                  <Field label="District" value={form.district ?? ""} onChange={(v) => setForm({ ...form, district: v })} />
                  <Field label="Pincode" value={form.pincode ?? ""} onChange={(v) => setForm({ ...form, pincode: v })} />
                  <Field label="GSTIN" value={form.gstin ?? ""} onChange={(v) => setForm({ ...form, gstin: v })} />
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              {(editing ? canEdit : canAdd) ? <Button onClick={save}>{editing ? "Save changes" : "Add customer"}</Button> : null}
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
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.company}</td>
                    <td className="px-4 py-3">{c.contact}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.address}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canEdit ? <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setForm({ ...blank, ...c }); setAdvancedOpen(false); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button> : null}
                        {canDelete ? <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await api.remove("customers", c.id);
                              setList(list.filter((x) => x.id !== c.id));
                              toast.success("Customer removed");
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Unable to remove customer");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No customers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
