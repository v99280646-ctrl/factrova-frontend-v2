import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { MoreVertical, Plus, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_EMPLOYEE_ROLE, EMPLOYEE_ROLES } from "@/lib/employee-roles";
import { api, apiRequest } from "@/lib/api";
import { formatDateTimeCompact } from "@/lib/date-format";
import { canPageAction, type PagePermissions } from "@/lib/auth";
import { StaffPermissionsGrid } from "@/components/staff/StaffPermissionsGrid";

export const Route = createFileRoute("/dashboard/staff")({
  head: () => ({ meta: [{ title: "Staff Access & Performance - Factrova" }] }),
  component: Staff,
});

type StaffRow = {
  id: string;
  _id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  pagePermissions: PagePermissions;
  active: boolean;
};
type ApiStaff = StaffRow;

const ROLES = EMPLOYEE_ROLES;
function formatPerformanceDate(date: Date) {
  return formatDateTimeCompact(date);
}

type StaffActivityResponse = {
  staff: StaffRow;
  month: string | null;
  search: string;
  summary: {
    totalRecords: number;
    totalUsageEntries: number;
    totalConfiguredStages: number;
    totalAssignedProjects: number;
    totalMaterialsUsed: number;
    totalLastMonthMaterialsUsed: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  records: Array<{
    id: string;
    type: "usage";
    date: string;
    projectId: string;
    projectCode: string;
    projectName: string;
    stageName?: string;
    role?: string;
    note?: string;
    materialCount?: number;
    materials?: Array<{
      projectMaterialId?: string;
      materialName: string;
      materialType?: string;
      thickness?: string;
      quantityUsed?: number;
      requiredQuantity?: number;
      completedQuantity?: number;
      unit?: string;
    }>;
  }>;
};

function Staff() {
  const canAdd = canPageAction("staff", "add");
  const canEdit = canPageAction("staff", "edit");
  const canDelete = canPageAction("staff", "delete");
  const canUpdate = canPageAction("staff", "update");
  const [list, setList] = useState<StaffRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activitySearch, setActivitySearch] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<StaffActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: DEFAULT_EMPLOYEE_ROLE,
    pagePermissions: {} as PagePermissions,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.list<ApiStaff>("staff");
      setList(data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load staff");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedStaff?.id) {
      setSelectedActivity(null);
      return;
    }

    let active = true;
    const loadActivity = async () => {
      setActivityLoading(true);
      try {
        const data = await apiRequest<StaffActivityResponse>(
          `/staff/${selectedStaff.id}/activity`,
          {
            query: {
              month: selectedMonth,
              search: activitySearch || undefined,
              page: activityPage,
              limit: 10,
            },
          },
        );
        if (!active) return;
        setSelectedActivity(data);
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Unable to load staff records");
      } finally {
        if (active) setActivityLoading(false);
      }
    };

    loadActivity();
    return () => {
      active = false;
    };
  }, [activityPage, activitySearch, selectedMonth, selectedStaff?.id]);

  useEffect(() => {
    setActivityPage(1);
  }, [activitySearch, selectedMonth, selectedStaff?.id]);

  const add = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.email.trim()) return toast.error("Email is required for staff login");
    if (Object.keys(form.pagePermissions).length === 0)
      return toast.error("At least one page permission is required");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role,
      pagePermissions: form.pagePermissions,
    };

    try {
      const data = await api.create<ApiStaff>("staff", payload);
      await load();
      toast.success(`${data.name} added and can now sign in with Google`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save staff");
    }
    setOpen(false);
    setForm({
      name: "",
      email: "",
      phone: "",
      role: DEFAULT_EMPLOYEE_ROLE,
      pagePermissions: {},
    });
  };

  const toggle = async (s: StaffRow) => {
    try {
      await apiRequest<ApiStaff>(`/staff/${s.id}/status`, {
        method: "PATCH",
        body: { active: !s.active },
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update staff");
    }
  };

  const remove = async (id: string) => {
    try {
      await api.remove("staff", id);
      await load();
      toast.success("Removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove staff");
    }
  };

  const editStaff = (s: StaffRow) => {
    setEditingStaff(s);
    setForm({
      name: s.name,
      email: s.email || "",
      phone: s.phone || "",
      role: s.role,
      pagePermissions: s.pagePermissions || {},
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!editingStaff?.id) return toast.error("No staff selected");
    if (Object.keys(form.pagePermissions).length === 0)
      return toast.error("At least one permission is required");

    try {
      await api.update<ApiStaff>("staff", editingStaff.id, {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role,
        pagePermissions: form.pagePermissions,
      });
      await load();
      toast.success("Staff updated");
      setEditOpen(false);
      setEditingStaff(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update staff");
    }
  };

  const assignments = list.map((staff) => {
    const activity = selectedStaff?.id === staff.id ? selectedActivity : null;
    return {
      staff,
      currentEstimated: activity?.summary.totalMaterialsUsed ?? 0,
      currentCompleted: activity?.summary.totalUsageEntries ?? 0,
      lastEstimated: activity?.summary.totalConfiguredStages ?? 0,
      lastCompleted: activity?.summary.totalAssignedProjects ?? 0,
      lastUpdate: activity?.records[0]?.date ?? "",
    };
  });

  return (
    <DashboardLayout title="Staff Access & Performance">
      <div className="space-y-6">
        <Tabs defaultValue="performance" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="performance" className="flex-1 sm:flex-initial">
                Performance
              </TabsTrigger>
              <TabsTrigger value="manage-access" className="flex-1 sm:flex-initial">
                Manage Access
              </TabsTrigger>
            </TabsList>
            {canAdd ? (
              <Button
                onClick={() => {
                  setForm({
                    name: "",
                    email: "",
                    phone: "",
                    role: DEFAULT_EMPLOYEE_ROLE,
                    pagePermissions: {},
                  });
                  setOpen(true);
                }}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-1 h-4 w-4" /> Add Staff
              </Button>
            ) : null}
          </div>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/60 shadow-[var(--shadow-card)]">
              <CardContent className="p-0">
                {/* Mobile view: Staff Cards */}
                <div className="md:hidden divide-y divide-border/50">
                  {list.map((staff) => (
                    <div
                      key={staff.id}
                      className="p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setSelectedStaff(staff)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[image:var(--gradient-soft)] text-primary">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{staff.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{staff.role}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground">Usage</p>
                          <p className="font-semibold">
                            {selectedStaff?.id === staff.id && selectedActivity 
                              ? Number(selectedActivity.summary.totalMaterialsUsed.toFixed(2)) 
                              : "Select to view"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Projects</p>
                          <p className="font-semibold">
                            {selectedStaff?.id === staff.id && selectedActivity 
                              ? selectedActivity.summary.totalAssignedProjects 
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop view: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <div className="min-w-[800px] lg:min-w-full">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-3 font-medium w-[200px]">Staff</th>
                          <th className="px-4 py-3 font-medium w-[120px]">Role</th>
                          <th className="px-4 py-3 text-right font-medium w-[150px]">
                            Materials / Usage
                          </th>
                          <th className="px-4 py-3 text-right font-medium w-[140px]">
                            Projects / Logs
                          </th>
                          <th className="px-4 py-3 text-right font-medium w-[160px]">
                            Last Update Date
                          </th>
                          <th className="px-4 py-3 text-right font-medium w-[80px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-10 text-center text-muted-foreground"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                Loading...
                              </div>
                            </td>
                          </tr>
                        )}
                        {!loading &&
                          list.map((staff) => (
                            <tr
                              key={staff.id}
                              className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                              onClick={() => setSelectedStaff(staff)}
                            >
                              <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[image:var(--gradient-soft)] text-primary">
                                    <ShieldCheck className="h-4 w-4" />
                                  </div>
                                  <span className="truncate">{staff.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground truncate">
                                {staff.role}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {selectedStaff?.id === staff.id && selectedActivity ? (
                                  <div className="flex flex-col">
                                    <span className="font-semibold">
                                      {Number(selectedActivity.summary.totalMaterialsUsed.toFixed(2))}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">units</span>
                                    <span className="text-muted-foreground">
                                      {" "}
                                      / {selectedActivity.summary.totalUsageEntries}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Open records</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {selectedStaff?.id === staff.id && selectedActivity ? (
                                  <div className="flex flex-col">
                                    <span className="font-semibold">
                                      {selectedActivity.summary.totalAssignedProjects}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">projects</span>
                                    <span className="text-muted-foreground">
                                      {" "}
                                      / {selectedActivity.summary.totalRecords}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Open records</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                                {selectedStaff?.id === staff.id &&
                                selectedActivity?.records[0]?.date
                                  ? formatDateTimeCompact(selectedActivity.records[0].date)
                                  : "-"}
                              </td>
                              <td
                                className="px-4 py-3 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {canDelete ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Open actions for ${staff.name}`}
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36">
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => remove(staff.id)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        {!loading && list.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-10 text-center text-muted-foreground"
                            >
                              No staff assigned yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Access Tab */}
          <TabsContent value="manage-access" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/60 shadow-[var(--shadow-card)]">
              <CardContent className="p-0">
                {/* Mobile View: Access Cards */}
                <div className="md:hidden divide-y divide-border/50">
                  {list.map((s) => (
                    <div key={s.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[image:var(--gradient-soft)] text-primary">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{s.name}</span>
                        </div>
                        <Switch
                          checked={s.active}
                          disabled={!canUpdate}
                          onCheckedChange={() => toggle(s)}
                        />
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="text-muted-foreground truncate">{s.email || "No email"}</p>
                        <p className="font-medium">{s.role}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(s.pagePermissions || {})
                            .filter(([_, actions]) => actions.length > 0)
                            .slice(0, 3)
                            .map(([page]) => (
                              <Badge key={page} variant="secondary" className="capitalize text-[10px]">
                                {page}
                              </Badge>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <Button variant="ghost" size="sm" className="h-8" onClick={() => editStaff(s)}>Edit</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <div className="min-w-[800px] lg:min-w-full">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-3 font-medium w-[180px]">Name</th>
                          <th className="px-4 py-3 font-medium w-[200px]">Email</th>
                          <th className="px-4 py-3 font-medium w-[120px]">Phone</th>
                          <th className="px-4 py-3 font-medium w-[120px]">Role</th>
                          <th className="px-4 py-3 font-medium w-[250px]">Access</th>
                          <th className="px-4 py-3 font-medium w-[80px]">Active</th>
                          <th className="px-4 py-3 text-right font-medium w-[80px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading && (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-10 text-center text-muted-foreground"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                Loading...
                              </div>
                            </td>
                          </tr>
                        )}
                        {!loading &&
                          list.map((s) => (
                            <tr
                              key={s.id}
                              className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[image:var(--gradient-soft)] text-primary">
                                    <ShieldCheck className="h-4 w-4" />
                                  </div>
                                  <span className="truncate">{s.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground truncate">
                                {s.email ?? "-"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{s.phone ?? "-"}</td>
                              <td className="px-4 py-3 truncate">{s.role}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                  {Object.entries(s.pagePermissions || {})
                                    .filter(([_, actions]) => actions.length > 0)
                                    .slice(0, 3)
                                    .map(([page]) => (
                                      <Badge key={page} variant="secondary" className="capitalize">
                                        {page}
                                      </Badge>
                                    ))}
                                  {Object.entries(s.pagePermissions || {}).filter(
                                    ([_, actions]) => actions.length > 0,
                                  ).length > 3 && (
                                    <Badge variant="outline" className="capitalize">
                                      +{Object.entries(s.pagePermissions || {}).length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Switch
                                  checked={s.active}
                                  disabled={!canUpdate}
                                  onCheckedChange={() => toggle(s)}
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                {canEdit || canDelete ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Open actions for ${s.name}`}
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36">
                                      {canEdit ? (
                                        <DropdownMenuItem onClick={() => editStaff(s)}>
                                          Edit
                                        </DropdownMenuItem>
                                      ) : null}
                                      {canDelete ? (
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() => remove(s.id)}
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
                        {!loading && list.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-10 text-center text-muted-foreground"
                            >
                              No staff yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Staff Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add staff member</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Full name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email ID *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Page Access & Permissions *</Label>
                <StaffPermissionsGrid
                  value={form.pagePermissions}
                  onChange={(pagePermissions) => setForm({ ...form, pagePermissions })}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={add}>Add Staff</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit staff member</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Full name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email ID</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Page Access & Permissions *</Label>
                <StaffPermissionsGrid
                  value={form.pagePermissions}
                  onChange={(pagePermissions) => setForm({ ...form, pagePermissions })}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditOpen(false);
                  setEditingStaff(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Performance Sheet */}
        <Sheet
          open={!!selectedStaff}
          onOpenChange={(next) => {
            if (!next) {
              setSelectedStaff(null);
              setActivitySearch("");
              setActivityPage(1);
            }
          }}
        >
          <SheetContent
            side="right"
            className="w-full overflow-y-auto p-0 sm:max-w-2xl lg:max-w-3xl"
          >
            {selectedStaff && (
              <>
                <SheetHeader className="border-b border-border bg-[image:var(--gradient-soft)] px-6 py-5 text-left sticky top-0 z-10">
                  <SheetTitle>Staff Performance</SheetTitle>
                  <p className="text-sm font-medium text-muted-foreground">
                    {selectedStaff.name} - {selectedStaff.role}
                  </p>
                </SheetHeader>

                <div className="space-y-5 px-6 py-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Current month
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {Number((selectedActivity?.summary.totalMaterialsUsed ?? 0).toFixed(2))}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">Total processed units</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Last month
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {Number((selectedActivity?.summary.totalLastMonthMaterialsUsed ?? 0).toFixed(2))}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">Prev. month performance</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Last update
                      </p>
                      <p className="mt-1 text-base font-semibold break-words">
                        {selectedActivity?.records[0]?.date
                          ? formatPerformanceDate(new Date(selectedActivity.records[0].date))
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="max-w-xs space-y-1.5">
                    <Label htmlFor="performance-month">Month Selection</Label>
                    <Input
                      id="performance-month"
                      type="month"
                      value={selectedMonth}
                      onChange={(e) =>
                        setSelectedMonth(e.target.value || new Date().toISOString().slice(0, 7))
                      }
                    />
                  </div>

                  <div className="max-w-md space-y-1.5">
                    <Label htmlFor="staff-log-search">Search Logs</Label>
                    <Input
                      id="staff-log-search"
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      placeholder="Search project, stage, note, or material"
                    />
                  </div>

                  <Card className="border-border/60 shadow-[var(--shadow-card)]">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <div className="min-w-[500px]">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-4 py-3 font-medium w-[180px]">Date</th>
                                {/* <th className="px-4 py-3 font-medium w-[160px]">Record Type</th> */}
                                <th className="px-4 py-3 text-right font-medium w-[180px]">
                                  Count Of Completed Meterial
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {activityLoading && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                                  >
                                    Loading staff records...
                                  </td>
                                </tr>
                              )}
                              {!activityLoading &&
                                (selectedActivity?.records.length ?? 0) === 0 && (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                                    >
                                      No records found for this staff in the selected month.
                                    </td>
                                  </tr>
                                )}
                              {!activityLoading &&
                                (selectedActivity?.records ?? []).map((row) => {
                                  const materialCount = (row.materials ?? []).reduce(
                                    (sum, material) => sum + Number(material.quantityUsed ?? 0),
                                    0,
                                  );

                                  return (
                                    <tr
                                      key={row.id}
                                      className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                                    >
                                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                                        {formatDateTimeCompact(row.date)}
                                      </td>
                                      {/* <td className="px-4 py-3">
                                        <div className="space-y-1">
                                          <p className="font-medium">
                                            {row.projectCode} - {row.projectName}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {row.stageName || row.role || "-"}
                                            {row.note ? ` - ${row.note}` : ""}
                                          </p>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <Badge variant="secondary">Usage</Badge>
                                      </td> */}
                                      <td className="px-4 py-3 text-right font-semibold">
                                      {Number(materialCount.toFixed(2))}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {selectedActivity?.records.length ?? 0} of{" "}
                      {selectedActivity?.pagination.total ?? 0} logs
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!selectedActivity?.pagination.hasPrev || activityLoading}
                        onClick={() => setActivityPage((page) => Math.max(1, page - 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {selectedActivity?.pagination.page ?? 1}
                        {selectedActivity?.pagination.totalPages
                          ? ` of ${selectedActivity.pagination.totalPages}`
                          : ""}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!selectedActivity?.pagination.hasNext || activityLoading}
                        onClick={() => setActivityPage((page) => page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
