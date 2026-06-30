import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { PaginationControls } from "@/components/pagination-controls.js";
import { PhoneNumberField } from "@/components/phone-number-field.js";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { canPageAction } from "@/lib/auth";

const blankCustomer = {
  id: "",
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

export const Route = createFileRoute("/dashboard/customers")({
  head: () => ({ meta: [{ title: "Customers — Factrova" }] }),
  component: Customers,
});

export function Customers() {
  const canAdd = canPageAction("customers", "add");
  const canEdit = canPageAction("customers", "edit");
  const canDelete = canPageAction("customers", "delete");

  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankCustomer);
  const pageLimit = 20;

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.list("customers", {
          page,
          limit: pageLimit,
          search: q.trim() || undefined,
        });
        setList(response?.items ?? []);
        setPagination(response?.pagination ?? { page, limit: pageLimit, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load customers");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [page, q, refreshToken]);

  const resetForm = () => {
    setEditing(null);
    setForm(blankCustomer);
    setAdvancedOpen(false);
  };

  const save = async () => {
    if (!form.company.trim()) {
      toast.error("Company name required");
      return;
    }

    const payload = {
      company: form.company.trim(),
      contact: form.contact.trim() || null,
      countryCode: form.countryCode.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      state: form.state?.trim() || null,
      district: form.district?.trim() || null,
      pincode: form.pincode?.trim() || null,
      gstin: form.gstin?.trim() || null,
    };

    try {
      if (editing) {
        await api.update("customers", editing.id, payload);
        toast.success("Customer updated");
      } else {
        await api.create("customers", payload);
        toast.success("Customer added");
      }

      setOpen(false);
      resetForm();
      setPage(1);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save customer");
    }
  };

  return (
    <DashboardLayout title="Customers">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search customers…"
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
                Add Customer
              </Button>
            </DialogTrigger>
          ) : null}

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 py-2 sm:grid-cols-2">
              <Field label="Company Name" value={form.company} onChange={(value) => setForm({ ...form, company: value })} />
              <Field label="Contact Person" value={form.contact} onChange={(value) => setForm({ ...form, contact: value })} />
              <PhoneNumberField
                label="Phone Number"
                countryCode={form.countryCode}
                phone={form.phone}
                onCountryCodeChange={(value) => setForm({ ...form, countryCode: value })}
                onPhoneChange={(value) => setForm({ ...form, phone: value })}
                className="sm:col-span-2"
              />
              <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />

              <div className="sm:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-0 text-sm font-medium text-foreground hover:bg-transparent"
                  onClick={() => setAdvancedOpen((value) => !value)}
                >
                  Advanced
                  <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
                </Button>
              </div>

              {advancedOpen ? (
                <>
                  <div className="sm:col-span-2">
                    <Field label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
                  </div>
                  <Field label="State" value={form.state ?? ""} onChange={(value) => setForm({ ...form, state: value })} />
                  <Field label="District" value={form.district ?? ""} onChange={(value) => setForm({ ...form, district: value })} />
                  <Field label="Pincode" value={form.pincode ?? ""} onChange={(value) => setForm({ ...form, pincode: value })} />
                  <Field label="GSTIN" value={form.gstin ?? ""} onChange={(value) => setForm({ ...form, gstin: value })} />
                </>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              {(editing ? canEdit : canAdd) ? (
                <Button onClick={save}>{editing ? "Save changes" : "Add customer"}</Button>
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
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{customer.company}</td>
                    <td className="px-4 py-3">{customer.contact || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatPhoneDisplay(customer.countryCode, customer.phone)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.email || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.address || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canEdit ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(customer);
                              setForm({ ...blankCustomer, ...customer });
                              setAdvancedOpen(false);
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
                                await api.remove("customers", customer.id);
                                toast.success("Customer removed");
                                setRefreshToken((value) => value + 1);
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Unable to remove customer");
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
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {loading ? "Loading customers..." : "No customers found."}
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
              label="customers"
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

function Field({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function formatPhoneDisplay(countryCode, phone) {
  const code = countryCode?.trim();
  const number = phone?.trim();
  if (code && number) return `${code} ${number}`;
  return number || code || "-";
}
