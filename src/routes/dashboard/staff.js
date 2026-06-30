import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { PaginationControls } from "@/components/pagination-controls.js";
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
import { MoreVertical, Plus, Search, Trash2, ShieldCheck, Calendar, Filter } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_EMPLOYEE_ROLE, EMPLOYEE_ROLES } from "@/lib/employee-roles";
import { api, apiRequest } from "@/lib/api";
import { formatDateTimeCompact } from "@/lib/date-format";
import { canPageAction } from "@/lib/auth";
import { StaffPermissionsGrid } from "@/components/staff/StaffPermissionsGrid";

const ROLES = EMPLOYEE_ROLES;

function formatPerformanceDate(date) {
  return formatDateTimeCompact(date);
}

export function Staff() {
  const canAdd = canPageAction("staff", "add");
  const canEdit = canPageAction("staff", "edit");
  const canDelete = canPageAction("staff", "delete");
  const canUpdate = canPageAction("staff", "update");

  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activitySearch, setActivitySearch] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: DEFAULT_EMPLOYEE_ROLE,
    pagePermissions: {},
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.list("staff", {
        page,
        limit: 20,
        search: q.trim() || undefined,
      });
      setList(Array.isArray(data) ? data : (data?.items ?? []));
      setPagination(
        Array.isArray(data)
          ? {
              page,
              limit: 20,
              total: (data ?? []).length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            }
          : (data?.pagination ?? {
              page,
              limit: 20,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load staff");
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, q, refreshToken]);

  useEffect(() => {
    if (!selectedStaff?.id) {
      setSelectedActivity(null);
      return;
    }

    let active = true;
    const loadActivity = async () => {
      setActivityLoading(true);
      try {
        const data = await apiRequest(`/staff/${selectedStaff.id}/activity`, {
          query: {
            month: selectedMonth,
            search: activitySearch || undefined,
            page: activityPage,
            limit: 10,
          },
        });
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
      const data = await api.create("staff", payload);
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

  const toggle = async (s) => {
    try {
      await apiRequest(`/staff/${s.id}/status`, {
        method: "PATCH",
        body: { active: !s.active },
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update staff");
    }
  };

  const remove = async (id) => {
    try {
      await api.remove("staff", id);
      await load();
      toast.success("Removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove staff");
    }
  };

  const editStaff = (s) => {
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
      await api.update("staff", editingStaff.id, {
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

  return (
    <DashboardLayout title="Staff Access & Performance">
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          {canAdd && (
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
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          )}
        </div>

        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="manage-access" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Manage Access
            </TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-6 focus-visible:outline-none">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-0">
                {/* Mobile View */}
                <div className="md:hidden divide-y divide-border/50">
                  {list.map((staff) => (
                    <div
                      key={staff.id}
                      className="p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setSelectedStaff(staff)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-xs text-muted-foreground">{staff.role}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {staff.role}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="rounded-lg bg-muted/30 p-3">
                          <p className="text-muted-foreground">Processed Units</p>
                          <p className="text-base font-semibold">
                            {selectedStaff?.id === staff.id && selectedActivity
                              ? Number(selectedActivity.summary.totalProcessedUnits.toFixed(2))
                              : "Select to view"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3 text-right">
                          <p className="text-muted-foreground">Projects</p>
                          <p className="text-base font-semibold">
                            {selectedStaff?.id === staff.id && selectedActivity
                              ? selectedActivity.summary.totalAssignedProjects
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!loading && list.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No staff assigned yet.
                    </div>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Staff</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3 text-right">Processed Units / Entries</th>
                        <th className="px-4 py-3 text-right">Projects / Logs</th>
                        <th className="px-4 py-3 text-right">Last Update</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              <span className="text-muted-foreground">Loading staff...</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        list.map((staff) => (
                          <tr
                            key={staff.id}
                            className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                            onClick={() => setSelectedStaff(staff)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <ShieldCheck className="h-4 w-4" />
                                </div>
                                <span className="font-medium">{staff.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-normal">
                                {staff.role}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {selectedStaff?.id === staff.id && selectedActivity ? (
                                <div>
                                  <span className="font-semibold">
                                    {Number(selectedActivity.summary.totalProcessedUnits.toFixed(2))}
                                  </span>
                                  <span className="ml-1 text-xs text-muted-foreground">units</span>
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    / {selectedActivity.summary.totalUsageEntries} entries
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {selectedStaff?.id === staff.id && selectedActivity ? (
                                <div>
                                  <span className="font-semibold">
                                    {selectedActivity.summary.totalAssignedProjects}
                                  </span>
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    projects
                                  </span>
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    / {selectedActivity.summary.totalRecords} logs
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {selectedStaff?.id === staff.id && selectedActivity?.records[0]?.date
                                ? formatDateTimeCompact(selectedActivity.records[0].date)
                                : "—"}
                            </td>
                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {canDelete && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
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
                              )}
                            </td>
                          </tr>
                        ))}
                      {!loading && list.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                            No staff assigned yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="border-t border-border px-4 py-3">
                    <PaginationControls
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      hasNext={pagination.hasNext}
                      hasPrev={pagination.hasPrev}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Access Tab */}
          <TabsContent value="manage-access" className="mt-6 focus-visible:outline-none">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-0">
                {/* Mobile View */}
                <div className="md:hidden divide-y divide-border/50">
                  {list.map((s) => (
                    <div key={s.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email || "No email"}</p>
                          </div>
                        </div>
                        <Switch
                          checked={s.active}
                          disabled={!canUpdate}
                          onCheckedChange={() => toggle(s)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{s.role}</Badge>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => editStaff(s)}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(s.pagePermissions || {})
                          .filter(([_, actions]) => actions.length > 0)
                          .slice(0, 3)
                          .map(([page]) => (
                            <Badge key={page} variant="outline" className="text-[10px] capitalize">
                              {page}
                            </Badge>
                          ))}
                        {Object.entries(s.pagePermissions || {}).filter(
                          ([_, actions]) => actions.length > 0,
                        ).length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{Object.entries(s.pagePermissions || {}).length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {!loading && list.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">No staff yet.</div>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Access</th>
                        <th className="px-4 py-3 text-center">Active</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              <span className="text-muted-foreground">Loading staff...</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        list.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <ShieldCheck className="h-4 w-4" />
                                </div>
                                <span className="font-medium">{s.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{s.email ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{s.phone ?? "—"}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-normal">
                                {s.role}
                              </Badge>
                            </td>
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
                            <td className="px-4 py-3 text-center">
                              <Switch
                                checked={s.active}
                                disabled={!canUpdate}
                                onCheckedChange={() => toggle(s)}
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              {(canEdit || canDelete) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      aria-label={`Open actions for ${s.name}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36">
                                    {canEdit && (
                                      <DropdownMenuItem onClick={() => editStaff(s)}>
                                        Edit
                                      </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => remove(s.id)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          </tr>
                        ))}
                      {!loading && list.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                            No staff yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Staff Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Add Staff Member</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Add a new staff member and configure their access permissions.
              </p>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-medium">Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter full name"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email ID *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Staff will use this email to sign in with Google.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Phone number"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Role *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select role" />
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
              <div className="space-y-2">
                <Label className="text-sm font-medium">Page Access & Permissions *</Label>
                <p className="text-xs text-muted-foreground">
                  Select which pages this staff member can access and their permissions.
                </p>
                <StaffPermissionsGrid
                  value={form.pagePermissions}
                  onChange={(pagePermissions) => setForm({ ...form, pagePermissions })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={add} className="min-w-24">
                Add Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit Staff Member</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Update staff details and access permissions.
              </p>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-medium">Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email ID</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Role *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select role" />
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
              <div className="space-y-2">
                <Label className="text-sm font-medium">Page Access & Permissions *</Label>
                <p className="text-xs text-muted-foreground">
                  Select which pages this staff member can access and their permissions.
                </p>
                <StaffPermissionsGrid
                  value={form.pagePermissions}
                  onChange={(pagePermissions) => setForm({ ...form, pagePermissions })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditOpen(false);
                  setEditingStaff(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveEdit} className="min-w-24">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Staff Performance Sheet */}
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
                <SheetHeader className="border-b border-border bg-gradient-to-br from-primary/5 to-transparent px-6 py-6 text-left sticky top-0 z-10 bg-background">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <SheetTitle className="text-xl">{selectedStaff.name}</SheetTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedStaff.role} • {selectedStaff.email || "No email"}
                      </p>
                    </div>
                  </div>
                </SheetHeader>
                <div className="space-y-6 px-6 py-6">
                  {/* Stats Grid */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Current Month
                      </p>
                      <p className="mt-2 text-2xl font-bold">
                        {Number((selectedActivity?.summary?.totalProcessedUnits ?? 0).toFixed(2))}
                      </p>
                      <p className="text-xs text-muted-foreground">Total processed units</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Last Month
                      </p>
                      <p className="mt-2 text-2xl font-bold">
                        {Number(
                          (selectedActivity?.summary.totalLastMonthProcessedUnits ?? 0).toFixed(2),
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Previous month performance</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Last Update
                      </p>
                      <p className="mt-2 text-base font-semibold break-words">
                        {selectedActivity?.records[0]?.date
                          ? formatPerformanceDate(new Date(selectedActivity.records[0].date))
                          : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Most recent activity</p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="staff-log-search" className="text-sm font-medium">
                        Search Logs
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="staff-log-search"
                          value={activitySearch}
                          className="pl-9 bg-background"
                          onChange={(e) => setActivitySearch(e.target.value)}
                          placeholder="Search by project, stage, or material..."
                        />
                      </div>
                    </div>
                    <div className="w-full sm:w-56 space-y-1.5">
                      <Label htmlFor="performance-month" className="text-sm font-medium">
                        Month
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="performance-month"
                          type="month"
                          value={selectedMonth}
                          className="pl-9 bg-background"
                          onChange={(e) =>
                            setSelectedMonth(e.target.value || new Date().toISOString().slice(0, 7))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Activity Table */}
                  <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Project</th>
                              <th className="px-4 py-3 text-right">Materials Used</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activityLoading && (
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center">
                                  <div className="flex items-center justify-center gap-3">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    <span className="text-muted-foreground">
                                      Loading records...
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {!activityLoading && (selectedActivity?.records.length ?? 0) === 0 && (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="px-4 py-8 text-center text-muted-foreground"
                                >
                                  No records found for this period.
                                </td>
                              </tr>
                            )}
                            {!activityLoading &&
                              (selectedActivity?.records ?? []).map((row) => {
                                const materialCount =
                                  Number(row.totalQuantityUsed ?? 0) + Number(row.directUsage ?? 0) ||
                                  (row.materials ?? []).reduce(
                                    (sum, material) => sum + Number(material.quantityUsed ?? 0),
                                    0,
                                  );
                                return (
                                  <tr
                                    key={row.id}
                                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                                  >
                                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                                      {formatDateTimeCompact(row.date)}
                                    </td>
                                    <td className="px-4 py-3">{row?.projectName || "—"}</td>
                                    <td className="px-4 py-3 text-right font-semibold">
                                      {Number(materialCount.toFixed(2))}
                                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                                        units
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pagination */}
                  {selectedActivity?.pagination.totalPages > 1 && (
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
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
