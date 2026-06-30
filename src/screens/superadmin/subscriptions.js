"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { 
  Plus, RefreshCw, Save, History, Building2, PencilLine, 
  RotateCw, Trash2, ChevronDown, ChevronRight, Check,
  X, Copy, Calendar, DollarSign, Clock, Users, Settings,
  Layers, AlertCircle, Edit, MoreVertical, Filter,
  Search, ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { SuperadminAccess } from "@/components/superadmin/access.js";
import { SuperadminShell } from "@/components/superadmin/shell.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/pagination-controls.js";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function createEmptyFeature() {
  return {
    key: "",
    label: "",
    enabled: true,
    mode: "enabled",
    limit: "",
    unit: "",
    description: "",
  };
}

function createEmptyPlan() {
  return {
    id: "",
    key: "",
    name: "",
    description: "",
    isActive: true,
    isDefault: false,
    price: 0,
    currency: "INR",
    durationValue: 3,
    durationUnit: "days",
    sortOrder: 0,
    features: [createEmptyFeature()],
  };
}

function getPlanById(plans, planId) {
  return plans.find((plan) => plan.id === planId);
}

export function SuperAdminSubscriptions() {
  const [plans, setPlans] = useState([]);
  const [factorySubscriptions, setFactorySubscriptions] = useState([]);
  const [subscriptionMeta, setSubscriptionMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [subscriptionSummary, setSubscriptionSummary] = useState({
    totalFactories: 0,
    activeFactories: 0,
    expiredFactories: 0,
  });
  const [factories, setFactories] = useState([]);
  const [factoryOptions, setFactoryOptions] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyMeta, setHistoryMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [factoryOptionsLoading, setFactoryOptionsLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [selectedFactoryId, setSelectedFactoryId] = useState("");
  const [planForm, setPlanForm] = useState(createEmptyPlan());
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState({ factoryId: "", factoryName: "" });
  const [renewTarget, setRenewTarget] = useState({
    factoryId: "",
    factoryName: "",
    planName: "",
    currentPeriodEnd: null,
    billingCycle: "",
  });
  const [cancelNote, setCancelNote] = useState("");
  const [cancellingFactoryId, setCancellingFactoryId] = useState("");
  const [renewingFactoryId, setRenewingFactoryId] = useState("");
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [expandedFeatures, setExpandedFeatures] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriptionSearchTerm, setSubscriptionSearchTerm] = useState("");
  const [factorySearchTerm, setFactorySearchTerm] = useState("");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("all");
  const factorySearchRequestIdRef = useRef(0);
  const subscriptionRequestIdRef = useRef(0);
  const historyRequestIdRef = useRef(0);
  const subscriptionQueryInitializedRef = useRef(false);
  const [assignmentForm, setAssignmentForm] = useState({
    factoryId: "",
    planId: "",
    status: "active",
    periodValue: 3,
    periodUnit: "days",
    notes: "",
  });

  const applyPlanDefaults = (planId) => {
    const plan = getPlanById(plans, planId);
    if (!plan) {
      return;
    }

    setAssignmentForm((current) => ({
      ...current,
      planId,
      periodValue: plan.durationValue ?? current.periodValue,
      periodUnit: plan.durationUnit ?? current.periodUnit,
    }));
  };

  const loadSubscriptionsList = async (search = "", status = "all", page = 1) => {
    const requestId = ++subscriptionRequestIdRef.current;
    setLoading(true);
    try {
      const payload = await apiRootRequest(API_PATHS.admin.subscriptions.factories, {
        query: {
          search: search.trim() || undefined,
          status,
          page,
          limit: 10,
        },
      });

      if (requestId !== subscriptionRequestIdRef.current) {
        return;
      }

      setFactorySubscriptions(payload?.items ?? []);
      setSubscriptionMeta({
        page: payload?.page ?? page,
        limit: payload?.limit ?? 10,
        total: payload?.total ?? 0,
        totalPages: payload?.totalPages ?? 1,
      });
      setSubscriptionSummary(payload?.summary ?? {
        totalFactories: 0,
        activeFactories: 0,
        expiredFactories: 0,
      });
    } catch (error) {
      if (requestId !== subscriptionRequestIdRef.current) {
        return;
      }
      toast.error(error instanceof Error ? error.message : "Unable to load subscriptions");
    } finally {
      if (requestId === subscriptionRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [planRows, factoryRows] = await Promise.all([
        apiRootRequest(API_PATHS.admin.subscriptions.plans),
        apiRootRequest(API_PATHS.admin.factories),
      ]);
      setPlans(planRows ?? []);
      setFactories(factoryRows ?? []);
      setFactoryOptions(factoryRows ?? []);
      const firstFactory = (factoryRows ?? [])[0]?.id ?? "";
      setAssignmentForm((current) => ({
        ...current,
        factoryId: current.factoryId || firstFactory,
        planId: current.planId || (planRows ?? [])[0]?.id || "",
      }));
      await loadSubscriptionsList(subscriptionSearchTerm, filterStatus, subscriptionPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const loadFactoryOptions = async (search = "") => {
    const requestId = ++factorySearchRequestIdRef.current;
    setFactoryOptionsLoading(true);
    try {
      const rows = await apiRootRequest(API_PATHS.admin.factories, {
        query: {
          search: search.trim() || undefined,
          limit: 50,
        },
      });
      if (requestId !== factorySearchRequestIdRef.current) {
        return;
      }
      setFactoryOptions(rows ?? []);
    } catch (error) {
      if (requestId !== factorySearchRequestIdRef.current) {
        return;
      }
      toast.error(error instanceof Error ? error.message : "Unable to search factories");
    } finally {
      if (requestId === factorySearchRequestIdRef.current) {
        setFactoryOptionsLoading(false);
      }
    }
  };

  const loadFactoryHistory = async (factoryId) => {
    try {
      const rows = factoryId
        ? await apiRootRequest(API_PATHS.admin.subscriptions.history(factoryId))
        : await apiRootRequest(API_PATHS.admin.subscriptions.historyAll);
      setHistory(rows ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load subscription history");
    }
  };

  const loadHistoryList = async (search = "", page = 1) => {
    const requestId = ++historyRequestIdRef.current;
    setHistoryLoading(true);
    try {
      const payload = await apiRootRequest(API_PATHS.admin.subscriptions.historyAll, {
        query: {
          search: search.trim() || undefined,
          page,
          limit: 10,
        },
      });

      if (requestId !== historyRequestIdRef.current) {
        return;
      }

      setHistoryRows(payload?.items ?? []);
      setHistoryMeta({
        page: payload?.page ?? page,
        limit: payload?.limit ?? 10,
        total: payload?.total ?? 0,
        totalPages: payload?.totalPages ?? 1,
      });
    } catch (error) {
      if (requestId !== historyRequestIdRef.current) {
        return;
      }
      toast.error(error instanceof Error ? error.message : "Unable to load subscription history");
    } finally {
      if (requestId === historyRequestIdRef.current) {
        setHistoryLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!assignmentForm.planId && plans[0]?.id) {
      const firstPlan = plans[0];
      setAssignmentForm((current) => ({
        ...current,
        planId: firstPlan.id,
        periodValue: firstPlan.durationValue ?? current.periodValue,
        periodUnit: firstPlan.durationUnit ?? current.periodUnit,
      }));
    }
  }, [plans, assignmentForm.planId]);

  useEffect(() => {
    if (!subscriptionQueryInitializedRef.current) {
      subscriptionQueryInitializedRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      void loadSubscriptionsList(subscriptionSearchTerm, filterStatus, subscriptionPage);
    }, subscriptionSearchTerm.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [subscriptionSearchTerm, filterStatus, subscriptionPage]);

  useEffect(() => {
    if (!isAssignmentModalOpen) {
      return;
    }
    if (!factorySearchTerm.trim()) {
      setFactoryOptions(factories);
      setFactoryOptionsLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      void loadFactoryOptions(factorySearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [factorySearchTerm, isAssignmentModalOpen, factories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadHistoryList(historySearchTerm, historyPage);
    }, historySearchTerm.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [historySearchTerm, historyPage]);

  const summary = useMemo(() => {
    return {
      totalPlans: plans.length,
      activeFactories: subscriptionSummary.activeFactories,
      expiredFactories: subscriptionSummary.expiredFactories,
      totalFactories: subscriptionSummary.totalFactories || factories.length,
    };
  }, [factories.length, plans.length, subscriptionSummary.activeFactories, subscriptionSummary.expiredFactories, subscriptionSummary.totalFactories]);

  const filteredFactories = useMemo(() => {
    return factoryOptions;
  }, [factoryOptions]);

  const selectedPlan = useMemo(() => {
    return getPlanById(plans, assignmentForm.planId);
  }, [plans, assignmentForm.planId]);

  const resetPlanForm = () => {
    setPlanForm(createEmptyPlan());
    setEditingPlanId(null);
  };

  const openCreatePlanModal = () => {
    resetPlanForm();
    setIsPlanModalOpen(true);
  };

  const openAssignmentModal = () => {
    setFactorySearchTerm("");
    setIsAssignmentModalOpen(true);
  };

  const openEditPlanModal = (plan) => {
    setPlanForm({
      id: plan.id,
      key: plan.key ?? "",
      name: plan.name ?? "",
      description: plan.description ?? "",
      isActive: plan.isActive ?? true,
      isDefault: plan.isDefault ?? false,
      price: plan.price ?? 0,
      currency: plan.currency ?? "INR",
      durationValue: plan.durationValue ?? 3,
      durationUnit: plan.durationUnit ?? "days",
      sortOrder: plan.sortOrder ?? 0,
      features: (plan.features ?? []).length ? plan.features : [createEmptyFeature()],
    });
    setEditingPlanId(plan.id);
    setIsPlanModalOpen(true);
  };

  const closePlanModal = () => {
    setIsPlanModalOpen(false);
    resetPlanForm();
  };

  const savePlan = async () => {
    if (!planForm.key || !planForm.name) {
      toast.error("Plan key and name are required");
      return;
    }

    setSavingPlan(true);
    try {
      const payload = {
        key: planForm.key,
        name: planForm.name,
        description: planForm.description,
        isActive: planForm.isActive,
        isDefault: planForm.isDefault,
        price: Number(planForm.price || 0),
        currency: planForm.currency,
        durationValue: Number(planForm.durationValue || 3),
        durationUnit: planForm.durationUnit,
        sortOrder: Number(planForm.sortOrder || 0),
        features: planForm.features.map((feature) => ({
          ...feature,
          limit: feature.limit === "" || feature.limit === null || feature.limit === undefined
            ? null
            : Number(feature.limit),
        })),
      };

      if (planForm.id) {
        await apiRootRequest(API_PATHS.admin.subscriptions.plans + `/${planForm.id}`, {
          method: "PATCH",
          body: payload,
        });
        toast.success("Subscription plan updated");
      } else {
        await apiRootRequest(API_PATHS.admin.subscriptions.plans, {
          method: "POST",
          body: payload,
        });
        toast.success("Subscription plan created");
      }

      closePlanModal();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save subscription plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const saveAssignment = async () => {
    if (!assignmentForm.factoryId || !assignmentForm.planId) {
      toast.error("Choose a factory and a plan");
      return;
    }

    setSavingAssignment(true);
    try {
      await apiRootRequest(API_PATHS.admin.subscriptions.assign(assignmentForm.factoryId), {
        method: "POST",
        body: {
          planId: assignmentForm.planId,
          status: assignmentForm.status,
          periodValue: Number(assignmentForm.periodValue || 3),
          periodUnit: assignmentForm.periodUnit,
          notes: assignmentForm.notes,
        },
      });
      toast.success("Subscription assigned to factory");
      await loadAll();
      setSelectedFactoryId(assignmentForm.factoryId);
      await loadFactoryHistory(assignmentForm.factoryId);
      setIsAssignmentModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign subscription");
    } finally {
      setSavingAssignment(false);
    }
  };

  const openRenewModal = (item) => {
    setRenewTarget({
      factoryId: item.factoryId?.id || item.factoryId,
      factoryName: item.factoryId?.name || "this factory",
      planName: item.plan?.name || "current plan",
      currentPeriodEnd: item.currentPeriodEnd || null,
      billingCycle: item.billingCycle || "",
    });
  };

  const renewFactory = async () => {
    if (!renewTarget.factoryId) {
      toast.error("Choose a factory subscription to renew");
      return;
    }

    setRenewingFactoryId(renewTarget.factoryId);
    try {
      await apiRootRequest(API_PATHS.admin.subscriptions.renew(renewTarget.factoryId), { method: "POST" });
      toast.success("Subscription renewed");
      await loadAll();
      await loadFactoryHistory(renewTarget.factoryId);
      setRenewTarget({
        factoryId: "",
        factoryName: "",
        planName: "",
        currentPeriodEnd: null,
        billingCycle: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to renew subscription");
    } finally {
      setRenewingFactoryId("");
    }
  };

  const openCancelModal = (factoryId, factoryName = "this factory") => {
    setCancelTarget({ factoryId, factoryName });
    setCancelNote("");
    setIsCancelModalOpen(true);
  };

  const cancelFactory = async () => {
    if (!cancelTarget.factoryId) {
      toast.error("Choose a factory subscription to cancel");
      return;
    }

    setCancellingFactoryId(cancelTarget.factoryId);
    try {
      await apiRootRequest(API_PATHS.admin.subscriptions.cancel(cancelTarget.factoryId), {
        method: "POST",
        body: { note: cancelNote.trim() || "Cancelled from superadmin console" },
      });
      toast.success("Subscription cancelled");
      setIsCancelModalOpen(false);
      await loadAll();
      await loadFactoryHistory(cancelTarget.factoryId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel subscription");
    } finally {
      setCancellingFactoryId("");
    }
  };

  const removeFeatureRow = (index) => {
    setPlanForm((current) => ({
      ...current,
      features: current.features.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const updateFeatureRow = (index, field, value) => {
    setPlanForm((current) => ({
      ...current,
      features: current.features.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: field === "enabled" ? Boolean(value) : value,
            }
          : row
      ),
    }));
  };

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      trial: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      past_due: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      superseded: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
    };
    return colors[status] || colors.active;
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: <Check className="h-3 w-3" />,
      trial: <Clock className="h-3 w-3" />,
      past_due: <AlertCircle className="h-3 w-3" />,
      expired: <X className="h-3 w-3" />,
      cancelled: <X className="h-3 w-3" />,
      superseded: <X className="h-3 w-3" />,
    };
    return icons[status] || null;
  };

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           plan.key.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || 
                           (filterStatus === "active" && plan.isActive) ||
                           (filterStatus === "inactive" && !plan.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [plans, searchTerm, filterStatus]);

  return (
    <SuperadminAccess>
      <SuperadminShell title="Subscription Management">
        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Layers className="inline mr-1 h-3 w-3" /> Plans
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{summary.totalPlans}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Building2 className="inline mr-1 h-3 w-3" /> Total Factories
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{summary.totalFactories}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Check className="inline mr-1 h-3 w-3" /> Active / Trial
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{summary.activeFactories}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <AlertCircle className="inline mr-1 h-3 w-3" /> Expired / Past Due
              </p>
              <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{summary.expiredFactories}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-1 gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search plans..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <Button onClick={openCreatePlanModal} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlans.map((plan) => (
                <Card key={plan.id} className="hover:shadow-lg transition-all duration-200 group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {plan.name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {plan.key}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                          {plan.description}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditPlanModal(plan)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const copy = { ...plan, id: "", key: plan.key + "-copy" };
                            openEditPlanModal(copy);
                          }}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        {plan.currency} {plan.price}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {plan.durationValue} {plan.durationUnit}
                      </span>
                      <span className="flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        {plan.features?.length || 0}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {plan.isDefault && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Default
                        </Badge>
                      )}
                      <Badge 
                        variant={plan.isActive ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {plan.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredPlans.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Layers className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-500 dark:text-slate-400">
                    {searchTerm ? "No plans match your search" : "No plans created yet"}
                  </p>
                  <Button onClick={openCreatePlanModal} variant="outline" className="mt-3">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first plan
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-3 w-full sm:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setSubscriptionPage(1);
                    setFilterStatus(e.target.value);
                  }}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="past_due">Past Due</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <Button onClick={openAssignmentModal} className="bg-green-600 hover:bg-green-700">
                <Building2 className="mr-2 h-4 w-4" />
                Assign Plan
              </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={subscriptionSearchTerm}
                  onChange={(event) => {
                    setSubscriptionPage(1);
                    setSubscriptionSearchTerm(event.target.value);
                  }}
                  placeholder="Search factory, code, plan, or status..."
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>{subscriptionMeta.total} subscriptions</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubscriptionSearchTerm("");
                    setFilterStatus("all");
                    setSubscriptionPage(1);
                    void loadSubscriptionsList("", "all", 1);
                  }}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Reset
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {factorySubscriptions.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {item.factoryId?.name || "Unknown Factory"}
                          </p>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status}</span>
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {item.plan?.name}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => openRenewModal(item)}
                          className="h-8 px-2"
                          title="Renew subscription"
                        >
                          <RotateCw className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFactoryId(item.factoryId?.id || item.factoryId);
                            void loadFactoryHistory(item.factoryId?.id || item.factoryId);
                            setIsHistoryModalOpen(true);
                          }}
                          className="h-8 px-2"
                          title="View history"
                        >
                          <History className="h-3 w-3" />
                        </Button>
                        {(item.status === "active" || item.status === "trial" || item.status === "past_due") && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openCancelModal(item.factoryId?.id || item.factoryId, item.factoryId?.name)}
                            className="h-8 px-2 text-red-600 hover:text-red-700"
                            title="Cancel subscription"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      Expires: {item.currentPeriodEnd ? new Date(item.currentPeriodEnd).toLocaleDateString() : "-"}
                      <span className="mx-2">·</span>
                      {item.billingCycle}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!loading && factorySubscriptions.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No subscriptions found
                  </p>
                  <Button onClick={openAssignmentModal} variant="outline" className="mt-3">
                    <Building2 className="mr-2 h-4 w-4" />
                    Assign first subscription
                  </Button>
                </CardContent>
              </Card>
            )}

            <PaginationControls
              page={subscriptionMeta.page}
              totalPages={subscriptionMeta.totalPages}
              total={subscriptionMeta.total}
              label="total results"
              loading={loading}
              onPrevious={() => setSubscriptionPage((current) => Math.max(1, current - 1))}
              onNext={() => setSubscriptionPage((current) => Math.min(subscriptionMeta.totalPages, current + 1))}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex w-full flex-col gap-2 sm:max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={historySearchTerm}
                    onChange={(event) => {
                      setHistoryPage(1);
                      setHistorySearchTerm(event.target.value);
                    }}
                    placeholder="Search factory name, code, action, or note..."
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing all factories by default. Search to narrow results.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHistorySearchTerm("");
                  setHistoryPage(1);
                  void loadHistoryList("", 1);
                }}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Reset
              </Button>
            </div>

            <div className="space-y-3">
              {historyLoading && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <RefreshCw className="mx-auto mb-3 h-12 w-12 animate-spin text-slate-400" />
                    <p className="text-slate-500 dark:text-slate-400">
                      Loading history...
                    </p>
                  </CardContent>
                </Card>
              )}

              {!historyLoading && historyRows.map((item) => (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {item.action}
                          </span>
                          {item.factoryId?.name && (
                            <Badge variant="outline" className="text-xs">
                              {item.factoryId.name}
                            </Badge>
                          )}
                          {item.toStatus && (
                            <Badge variant="outline" className="text-xs">
                              → {item.toStatus}
                            </Badge>
                          )}
                          {item.fromStatus && (
                            <Badge variant="outline" className="text-xs">
                              ← {item.fromStatus}
                            </Badge>
                          )}
                        </div>
                        {item.note && (
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {item.note}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!historyLoading && historyRows.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <History className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-slate-500 dark:text-slate-400">
                      {historySearchTerm ? "No history records matched your search" : "No history records found for all factories"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <PaginationControls
              page={historyMeta.page}
              totalPages={historyMeta.totalPages}
              total={historyMeta.total}
              label="total records"
              loading={historyLoading}
              onPrevious={() => setHistoryPage((current) => Math.max(1, current - 1))}
              onNext={() => setHistoryPage((current) => Math.min(historyMeta.totalPages, current + 1))}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <X className="h-5 w-5 text-red-500" />
                Cancel Subscription
              </DialogTitle>
              <DialogDescription>
                This will cancel the current subscription for {cancelTarget.factoryName || "this factory"}.
                The factory will lose access to active subscription features.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-lg border bg-slate-50 p-3 text-sm dark:bg-slate-900/40">
                <p className="font-medium text-slate-900 dark:text-white">
                  {cancelTarget.factoryName || "Selected Factory"}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Factory ID: {cancelTarget.factoryId || "-"}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Note
                </label>
                <Textarea
                  value={cancelNote}
                  onChange={(event) => setCancelNote(event.target.value)}
                  placeholder="Optional cancellation note"
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={Boolean(cancellingFactoryId)}
              >
                Keep Subscription
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void cancelFactory()}
                disabled={Boolean(cancellingFactoryId)}
              >
                {cancellingFactoryId ? "Cancelling..." : "Cancel Subscription"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(renewTarget.factoryId)}
          onOpenChange={(open) => {
            if (!open) {
              setRenewTarget({
                factoryId: "",
                factoryName: "",
                planName: "",
                currentPeriodEnd: null,
                billingCycle: "",
              });
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCw className="h-5 w-5 text-blue-500" />
                Renew Subscription
              </DialogTitle>
              <DialogDescription>
                Confirm the renewal for {renewTarget.factoryName || "this factory"}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-lg border bg-slate-50 p-3 text-sm dark:bg-slate-900/40">
                <p className="font-medium text-slate-900 dark:text-white">
                  {renewTarget.factoryName || "Selected Factory"}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Plan: {renewTarget.planName || "-"}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Current expiry: {renewTarget.currentPeriodEnd ? new Date(renewTarget.currentPeriodEnd).toLocaleDateString() : "-"}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Billing cycle: {renewTarget.billingCycle || "-"}
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
                <p className="font-medium">What renewal will do</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Create a new active subscription entry for this factory</li>
                  <li>• Keep the old subscription in history</li>
                  <li>• Mark the previous current subscription as superseded</li>
                  <li>• Carry over the current plan and feature overrides</li>
                  <li>• Start the new billing period from today</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenewTarget({
                  factoryId: "",
                  factoryName: "",
                  planName: "",
                  currentPeriodEnd: null,
                  billingCycle: "",
                })}
                disabled={Boolean(renewingFactoryId)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void renewFactory()}
                disabled={Boolean(renewingFactoryId)}
              >
                {renewingFactoryId ? "Renewing..." : "Confirm Renewal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Plan Modal */}
        <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PencilLine className="h-5 w-5 text-blue-500" />
                {editingPlanId ? "Edit Plan" : "Create New Plan"}
              </DialogTitle>
              <DialogDescription>
                {editingPlanId ? "Update the plan details below" : "Define a new subscription plan with features"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Plan Key <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={planForm.key}
                    onChange={(event) => setPlanForm((current) => ({ ...current, key: event.target.value }))}
                    placeholder="e.g., premium"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={planForm.name}
                    onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g., Premium Plan"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Description
                </label>
                <Textarea
                  value={planForm.description}
                  onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Describe what this plan offers"
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Pricing & Duration */}
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Price
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={planForm.price}
                    onChange={(event) => setPlanForm((current) => ({ ...current, price: event.target.value }))}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Currency
                  </label>
                  <Input
                    value={planForm.currency}
                    onChange={(event) => setPlanForm((current) => ({ ...current, currency: event.target.value }))}
                    placeholder="INR"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Duration
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={planForm.durationValue}
                    onChange={(event) => setPlanForm((current) => ({ ...current, durationValue: event.target.value }))}
                    placeholder="3"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Unit
                  </label>
                  <select
                    value={planForm.durationUnit}
                    onChange={(event) => setPlanForm((current) => ({ ...current, durationUnit: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(event) => setPlanForm((current) => ({ ...current, isActive: event.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-slate-600 dark:text-slate-300">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isDefault}
                    onChange={(event) => setPlanForm((current) => ({ ...current, isDefault: event.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-slate-600 dark:text-slate-300">Set as Default</span>
                </label>
              </div>

              {/* Features */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setExpandedFeatures(!expandedFeatures)}
                    className="flex items-center gap-2 text-sm font-medium hover:text-blue-600"
                  >
                    {expandedFeatures ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Features ({planForm.features.length})
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPlanForm((current) => ({ 
                      ...current, 
                      features: [...current.features, createEmptyFeature()] 
                    }))}
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Add Feature
                  </Button>
                </div>

                {expandedFeatures && (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {planForm.features.map((feature, index) => (
                      <div 
                        key={`${feature.key || "feature"}-${index}`} 
                        className="grid gap-2 rounded-lg border border-slate-200 p-3 dark:border-white/10 md:grid-cols-6"
                      >
                        <Input
                          value={feature.key}
                          onChange={(event) => updateFeatureRow(index, "key", event.target.value)}
                          placeholder="Key"
                          className="col-span-1"
                        />
                        <Input
                          value={feature.label}
                          onChange={(event) => updateFeatureRow(index, "label", event.target.value)}
                          placeholder="Label"
                          className="col-span-1"
                        />
                        <select
                          value={feature.mode}
                          onChange={(event) => updateFeatureRow(index, "mode", event.target.value)}
                          className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        >
                          <option value="enabled">Enabled</option>
                          <option value="limited">Limited</option>
                          <option value="unlimited">Unlimited</option>
                          <option value="disabled">Disabled</option>
                        </select>
                        <Input
                          type="number"
                          min="0"
                          value={feature.limit}
                          onChange={(event) => updateFeatureRow(index, "limit", event.target.value)}
                          placeholder="Limit"
                          disabled={feature.mode === "enabled" || feature.mode === "unlimited"}
                          className={feature.mode === "enabled" || feature.mode === "unlimited" ? "opacity-50" : ""}
                        />
                        <Input
                          value={feature.unit}
                          onChange={(event) => updateFeatureRow(index, "unit", event.target.value)}
                          placeholder="Unit"
                        />
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={feature.enabled}
                              onChange={(event) => updateFeatureRow(index, "enabled", event.target.checked)}
                              className="w-3 h-3 rounded border-slate-300"
                            />
                            Enabled
                          </label>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeFeatureRow(index)}
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closePlanModal}>
                Cancel
              </Button>
              <Button 
                onClick={savePlan} 
                disabled={savingPlan}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="mr-2 h-4 w-4" />
                {savingPlan ? "Saving..." : editingPlanId ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assignment Modal */}
        <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-500" />
                Assign Plan to Factory
              </DialogTitle>
              <DialogDescription>
                Link a subscription plan to a factory
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Select Factory <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 space-y-2">
                  <Input
                    value={factorySearchTerm}
                    onChange={(event) => setFactorySearchTerm(event.target.value)}
                    placeholder="Search factory by name, code, or status"
                  />
                  <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                    {factoryOptionsLoading ? (
                      <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Searching factories...
                      </div>
                    ) : filteredFactories.length > 0 ? (
                      filteredFactories.map((factory) => {
                        const isSelected = assignmentForm.factoryId === factory.id;
                        return (
                          <button
                            key={factory.id}
                            type="button"
                            onClick={() => setAssignmentForm((current) => ({ ...current, factoryId: factory.id }))}
                            className={`flex w-full items-start justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 dark:hover:bg-white/5 ${
                              isSelected ? "bg-blue-50 dark:bg-blue-950/30" : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white">
                                {factory.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {factory.code || "No code"} · {factory.status || "unknown"}
                              </p>
                            </div>
                            {isSelected && <Check className="mt-0.5 h-4 w-4 text-blue-600" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        No factories match your search.
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selected: {assignmentForm.factoryId ? [...factoryOptions, ...factories].find((factory) => factory.id === assignmentForm.factoryId)?.name || "Factory selected" : "None"}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Select Plan <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignmentForm.planId}
                  onChange={(event) => applyPlanDefaults(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="">Choose a plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} (₹{plan.price})
                    </option>
                  ))}
                </select>
                {selectedPlan && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Default period from plan: {selectedPlan.durationValue}{" "}
                    {selectedPlan.durationUnit} · You can customize it below.
                  </p>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Period
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={assignmentForm.periodValue}
                    onChange={(event) => setAssignmentForm((current) => ({ ...current, periodValue: event.target.value }))}
                    placeholder="3"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Unit
                  </label>
                  <select
                    value={assignmentForm.periodUnit}
                    onChange={(event) => setAssignmentForm((current) => ({ ...current, periodUnit: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    value={assignmentForm.status}
                    onChange={(event) => setAssignmentForm((current) => ({ ...current, status: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Notes
                </label>
                <Textarea
                  value={assignmentForm.notes}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional notes about this assignment"
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignmentModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={saveAssignment} 
                disabled={savingAssignment}
                className="bg-green-600 hover:bg-green-700"
              >
                <Building2 className="mr-2 h-4 w-4" />
                {savingAssignment ? "Assigning..." : "Assign Subscription"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Modal */}
        <Dialog
          open={isHistoryModalOpen}
          onOpenChange={(open) => {
            setIsHistoryModalOpen(open);
            if (!open) {
              setSelectedFactoryId("");
              setHistory([]);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-orange-500" />
                Subscription History
              </DialogTitle>
              <DialogDescription>
                {selectedFactoryId
                  ? `History for ${factories.find((f) => f.id === selectedFactoryId)?.name || "selected factory"}`
                  : "History for all factories"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 overflow-y-auto max-h-[60vh] py-4">
              {history.map((item) => (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {item.action}
                          </span>
                          {item.factoryId?.name && (
                            <Badge variant="outline" className="text-xs">
                              {item.factoryId.name}
                            </Badge>
                          )}
                          {item.toStatus && (
                            <Badge variant="outline" className="text-xs">
                              → {item.toStatus}
                            </Badge>
                          )}
                        </div>
                        {item.note && (
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {item.note}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {history.length === 0 && (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No history records found
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SuperadminShell>
    </SuperadminAccess>
  );
}
