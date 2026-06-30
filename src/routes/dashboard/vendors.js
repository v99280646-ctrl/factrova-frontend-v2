import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { PaginationControls } from "@/components/pagination-controls.js";
import { PhoneNumberField } from "@/components/phone-number-field.js";
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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { vendors as initial } from "@/lib/data";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { canPageAction } from "@/lib/auth";

const blankVendor = {
  id: "",
  name: "",
  contact: "",
  countryCode: "+91",
  alternativeContact: "",
  alternativeCountryCode: "+91",
  email: "",
  gst: "",
  address: "",
  materials: "",
};

export const Route = createFileRoute("/dashboard/vendors")({
  head: () => ({ meta: [{ title: "Vendors — Factrova" }] }),
  component: Vendors,
});

export function Vendors() {
  const canAdd = canPageAction("vendors", "add");
  const canEdit = canPageAction("vendors", "edit");
  const canDelete = canPageAction("vendors", "delete");

  const [list, setList] = useState(initial);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankVendor);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.list("vendors", { page, limit: 20, search: q.trim() || undefined });
        setList(data?.items ?? []);
        setPagination(data?.pagination ?? { page, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load vendors");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [page, q, refreshToken]);

  const resetForm = () => {
    setEditing(null);
    setForm(blankVendor);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Vendor name required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      countryCode: form.countryCode.trim() || null,
      contact: form.contact.trim() || null,
      alternativeCountryCode: form.alternativeCountryCode.trim() || null,
      alternativeContact: form.alternativeContact.trim() || null,
      email: form.email.trim() || null,
      gst: form.gst.trim() || null,
      address: form.address.trim() || null,
      materials: form.materials.trim() || null,
    };

    try {
      if (editing) {
        const data = await api.update("vendors", editing.id, payload);
        setList((current) => current.map((item) => (item.id === editing.id ? mapVendor(data) : item)));
        toast.success("Vendor updated");
      } else {
        const data = await api.create("vendors", payload);
        setList((current) => [mapVendor(data), ...current]);
        toast.success("Vendor added");
      }

      setOpen(false);
      resetForm();
      setPage(1);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save vendor");
    }
  };

  return (
    <DashboardLayout title="Vendors">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search vendors…"
            className="pl-9"
          />
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
          {canAdd ? (
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Vendor
              </Button>
            </DialogTrigger>
          ) : null}

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit vendor" : "New vendor"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 py-2 sm:grid-cols-2">
              <FormField
                label="Vendor Name"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                className="sm:col-span-2"
              />
              <PhoneNumberField
                label="Contact Number"
                countryCode={form.countryCode}
                phone={form.contact}
                onCountryCodeChange={(value) => setForm({ ...form, countryCode: value })}
                onPhoneChange={(value) => setForm({ ...form, contact: value })}
                className="sm:col-span-2"
              />
              <PhoneNumberField
                label="Alternative Contact"
                countryCode={form.alternativeCountryCode}
                phone={form.alternativeContact}
                onCountryCodeChange={(value) => setForm({ ...form, alternativeCountryCode: value })}
                onPhoneChange={(value) => setForm({ ...form, alternativeContact: value })}
                className="sm:col-span-2"
              />
              <FormField
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
              />
              <FormField label="GST" value={form.gst} onChange={(value) => setForm({ ...form, gst: value })} />
              <FormField
                label="Materials Supplied"
                value={form.materials}
                onChange={(value) => setForm({ ...form, materials: value })}
                className="sm:col-span-2"
              />
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
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              {(editing ? canEdit : canAdd) ? (
                <Button onClick={save}>{editing ? "Save changes" : "Add vendor"}</Button>
              ) : null}
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
                {list.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{vendor.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{formatPhoneDisplay(vendor.countryCode, vendor.contact)}</div>
                      {vendor.alternativeContact ? (
                        <div className="text-xs">
                          Alt: {formatPhoneDisplay(vendor.alternativeCountryCode, vendor.alternativeContact)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{vendor.email || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{vendor.gst || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{vendor.materials || "-"}</td>
                    <td className="max-w-64 px-4 py-3 text-muted-foreground">
                      <p className="line-clamp-2">{vendor.address || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canEdit ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(vendor);
                              setForm({ ...blankVendor, ...vendor });
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await api.remove("vendors", vendor.id);
                                toast.success("Vendor removed");
                                setRefreshToken((value) => value + 1);
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Unable to remove vendor");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}

                {list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {loading ? "Loading vendors..." : "No vendors found."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              label="vendors"
              loading={loading}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => Math.min(pagination.totalPages || 1, current + 1))}
            />
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function FormField({ label, value, onChange, type = "text", className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function mapVendor(row) {
  return {
    id: row.id,
    name: row.name,
    countryCode: row.countryCode ?? "",
    contact: row.contact ?? "",
    alternativeCountryCode: row.alternativeCountryCode ?? "",
    alternativeContact: row.alternativeContact ?? "",
    email: row.email ?? "",
    gst: row.gst ?? "",
    address: row.address ?? "",
    materials: row.materials ?? "",
  };
}

function formatPhoneDisplay(countryCode, phone) {
  const code = countryCode?.trim();
  const number = phone?.trim();
  if (code && number) return `${code} ${number}`;
  return number || code || "-";
}
