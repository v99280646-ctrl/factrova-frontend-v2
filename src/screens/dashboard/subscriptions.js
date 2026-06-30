"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  CreditCard, RefreshCw, History, Activity, CalendarDays, 
  ShieldCheck, ListChecks, CheckCircle2, XCircle, Clock,
  DollarSign, Calendar, Users, Package, Zap, AlertCircle,
  TrendingUp, ArrowRight, Crown, Sparkles, Gem, Layers,
  LayoutDashboard, BarChart3, Settings, Bell, FileText,
  Star, Award, Target, Rocket, Check, X, Minus,
  Infinity, Play, Briefcase, Users2, FolderTree, HardDrive,
  MessageSquare, PieChart, Smartphone, Cloud, Database,
  Gauge, Timer, BarChart, PieChart as PieChartIcon,
  Circle, CircleOff, ChevronDown, ChevronUp, Percent,
  Loader2, Info,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { getActiveFactoryId, getActiveMembership, getAuthSession } from "@/lib/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function PaginationControls({ label, page, totalPages, total, onPrev, onNext }) {
  return totalPages > 1 && (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
      <p>
        {label} {typeof total === "number" ? `(${total})` : ""}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onPrev} disabled={page <= 1}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Prev
        </Button>
        <span className="min-w-24 text-center">
          Page {page} of {totalPages || 1}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages}>
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function statusTone(status) {
  switch (status) {
    case "active": return "success";
    case "trial": return "warning";
    case "past_due": return "destructive";
    case "expired": return "destructive";
    case "cancelled": return "secondary";
    default: return "secondary";
  }
}

function getStatusIcon(status) {
  switch (status) {
    case "active": return <CheckCircle2 className="h-4 w-4" />;
    case "trial": return <Clock className="h-4 w-4" />;
    case "past_due": return <AlertCircle className="h-4 w-4" />;
    case "expired": return <XCircle className="h-4 w-4" />;
    case "cancelled": return <XCircle className="h-4 w-4" />;
    default: return <AlertCircle className="h-4 w-4" />;
  }
}

function getPlanIcon(planKey) {
  const icons = {
    trial: <Play className="h-5 w-5" />,
    starter: <Package className="h-5 w-5" />,
    growth: <TrendingUp className="h-5 w-5" />,
    enterprise: <Crown className="h-5 w-5" />,
    premium: <Gem className="h-5 w-5" />,
    pro: <Rocket className="h-5 w-5" />,
    basic: <Star className="h-5 w-5" />,
  };
  return icons[planKey?.toLowerCase()] || <Zap className="h-5 w-5" />;
}

function getPlanColor(planKey) {
  const colors = {
    trial: "from-blue-500 to-blue-600",
    starter: "from-emerald-500 to-emerald-600",
    growth: "from-purple-500 to-purple-600",
    enterprise: "from-amber-500 to-amber-600",
    premium: "from-rose-500 to-rose-600",
    pro: "from-indigo-500 to-indigo-600",
    basic: "from-slate-500 to-slate-600",
  };
  return colors[planKey?.toLowerCase()] || "from-slate-500 to-slate-600";
}

function getPlanBadgeColor(planKey) {
  const colors = {
    trial: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    starter: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    growth: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    premium: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    pro: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    basic: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  };
  return colors[planKey?.toLowerCase()] || "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
}

function getFeatureIcon(featureKey) {
  const icons = {
    projects: <FolderTree className="h-4 w-4" />,
    customers: <Users2 className="h-4 w-4" />,
    vendors: <Briefcase className="h-4 w-4" />,
    services: <Package className="h-4 w-4" />,
    staff: <Users className="h-4 w-4" />,
    stock: <HardDrive className="h-4 w-4" />,
    finance: <PieChartIcon className="h-4 w-4" />,
    notifications: <Bell className="h-4 w-4" />,
    integrations: <Cloud className="h-4 w-4" />,
    messages: <MessageSquare className="h-4 w-4" />,
    mobile: <Smartphone className="h-4 w-4" />,
    database: <Database className="h-4 w-4" />,
    reports: <BarChart className="h-4 w-4" />,
    analytics: <TrendingUp className="h-4 w-4" />,
    support: <Users className="h-4 w-4" />,
  };
  return icons[featureKey?.toLowerCase()] || <Circle className="h-4 w-4" />;
}

function getDaysRemaining(endDate) {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function getFeatureDisplay(feature) {
  if (feature.enabled === false) {
    return { icon: <XCircle className="h-4 w-4 text-slate-300" />, label: "Not Available", color: "text-slate-400", status: "disabled" };
  }
  
  switch (feature.mode) {
    case 'unlimited':
      return { icon: <Infinity className="h-4 w-4 text-emerald-500" />, label: "Unlimited", color: "text-emerald-600", status: "unlimited" };
    case 'enabled':
      return { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, label: "Enabled", color: "text-green-600", status: "enabled" };
    case 'limited':
      const limit = feature.limit || 0;
      const unit = feature.unit || '';
      return { 
        icon: <Gauge className="h-4 w-4 text-blue-500" />, 
        label: `${limit} ${unit}`.trim(),
        color: "text-blue-600",
        status: "limited",
        value: limit,
        unit: unit
      };
    default:
      return { icon: <Circle className="h-4 w-4 text-slate-300" />, label: "Not Set", color: "text-slate-400", status: "notset" };
  }
}

export function Subscriptions() {
  const session = useMemo(() => getAuthSession(), []);
  const activeMembership = useMemo(() => getActiveMembership(session), [session]);
  const factoryId = getActiveFactoryId() ?? activeMembership?.factory?.id ?? session?.profile?.factoryId ?? "";
  const isFactoryAdmin = session?.primaryRole === "admin" || activeMembership?.role === "admin";
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedPlans, setExpandedPlans] = useState([]);
  const [plansPage, setPlansPage] = useState(1);
  const [usagePage, setUsagePage] = useState(1);
  const [plansPagination, setPlansPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 8 });
  const [usagePagination, setUsagePagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 8 });

  const loadOverview = async ({ nextPlansPage = plansPage, nextUsagePage = usagePage } = {}) => {
    if (!factoryId) {
      setLoading(false);
      setError("No factory is assigned to this account.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await apiRootRequest(API_PATHS.factories.subscription(factoryId), {
        query: {
          plansPage: nextPlansPage,
          plansLimit: plansPagination.limit,
          usagePage: nextUsagePage,
          usageLimit: usagePagination.limit,
        },
      });
      setOverview(data);
      if (data?.plansPagination) setPlansPagination(data.plansPagination);
      if (data?.usagePagination) setUsagePagination(data.usagePagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load subscription overview";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlansPage(1);
    setUsagePage(1);
  }, [factoryId]);

  useEffect(() => {
    void loadOverview({ nextPlansPage: plansPage, nextUsagePage: usagePage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factoryId, plansPage, usagePage]);

  const currentSubscription = overview?.subscription ?? null;
  const currentPlan = overview?.plan ?? null;
  const plans = overview?.plans ?? [];
  const subscriptionHistory = overview?.subscriptionHistory ?? [];
  const usageHistory = overview?.usageHistory ?? [];
  const usageSummary = overview?.usageSummary ?? { totalRecords: 0, totalQuantityUsed: 0, projectsCount: 0 };
  const latestSubscriptionEvent = subscriptionHistory[0] ?? null;
  
  const daysRemaining = getDaysRemaining(currentSubscription?.currentPeriodEnd);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  const togglePlanExpand = (planId) => {
    setExpandedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const allFeatures = useMemo(() => {
    const featureSet = new Set();
    plans.forEach(plan => {
      (plan.features || []).forEach(f => featureSet.add(f.key));
    });
    return Array.from(featureSet);
  }, [plans]);

  const featureUsage = overview?.featureUsage ?? {};
  const overviewScopeLabel = "Factory-wide subscription data";

  return (
    <DashboardLayout title="Subscription Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-blue-500" />
              Subscription Overview
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your factory's subscription plan, track usage, and view available plans
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {overviewScopeLabel}
              {" · "}
              {isFactoryAdmin ? "Admin access" : "Staff access"}
            </p>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => void loadOverview()}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="overview" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="plans" className="gap-2">
                <Layers className="h-4 w-4" />
                Plans
              </TabsTrigger>
              <TabsTrigger value="features" className="gap-2">
                <ListChecks className="h-4 w-4" />
                Features
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab - Enhanced with detailed subscription info */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-10 -mt-10"></div>
                  <CardContent className="p-4 relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Current Plan</p>
                        <p className="text-lg font-bold">{currentPlan?.name || "No Active Plan"}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant={statusTone(currentSubscription?.status)} className="gap-1 text-xs">
                            {getStatusIcon(currentSubscription?.status)}
                            {currentSubscription?.status || "inactive"}
                          </Badge>
                          {isExpiringSoon && !isExpired && (
                            <Badge variant="warning" className="gap-1 text-xs animate-pulse">
                              <AlertCircle className="h-3 w-3" />
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -mr-10 -mt-10"></div>
                  <CardContent className="p-4 relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Valid Until</p>
                        <p className="text-lg font-bold">{formatDate(currentSubscription?.currentPeriodEnd)}</p>
                        {daysRemaining !== null && daysRemaining >= 0 && (
                          <div className="flex items-center gap-2">
                            <Progress value={(daysRemaining / 30) * 100} className="h-1.5 w-20" />
                            <span className="text-xs font-medium">{daysRemaining} days</span>
                          </div>
                        )}
                        {daysRemaining !== null && daysRemaining < 0 && (
                          <p className="text-xs text-red-500 font-medium">
                            Expired {Math.abs(daysRemaining)} days ago
                          </p>
                        )}
                      </div>
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-10 -mt-10"></div>
                  <CardContent className="p-4 relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Pricing</p>
                        <p className="text-lg font-bold">
                          {currentPlan?.currency} {currentPlan?.price || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          / {currentPlan?.durationValue} {currentPlan?.durationUnit}
                        </p>
                      </div>
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full -mr-10 -mt-10"></div>
                  <CardContent className="p-4 relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Total Usage</p>
                        {usageSummary.totalRecords > 0 ? (
                          <>
                            <p className="text-lg font-bold">{usageSummary.totalRecords}</p>
                            <p className="text-xs text-muted-foreground">
                              {usageSummary.totalQuantityUsed} units · {usageSummary.projectsCount} projects
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-bold">No usage yet</p>
                            <p className="text-xs text-muted-foreground">
                              Usage will appear after project activity starts
                            </p>
                          </>
                        )}
                      </div>
                      <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                        <Activity className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Current Subscription Details */}
              {currentPlan && (
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-500" />
                        Active Subscription Details
                      </CardTitle>
                      <Badge variant="outline" className="gap-1">
                        <Info className="h-3 w-3" />
                        {currentPlan.key}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Left Column - Plan Info */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${getPlanColor(currentPlan.key)} text-white`}>
                            {getPlanIcon(currentPlan.key)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
                            <p className="text-sm text-muted-foreground">{currentPlan.description}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Status</p>
                            <Badge variant={statusTone(currentSubscription?.status)} className="mt-1 gap-1">
                              {getStatusIcon(currentSubscription?.status)}
                              {currentSubscription?.status || "inactive"}
                            </Badge>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Started On</p>
                            <p className="font-medium">{formatDate(currentSubscription?.currentPeriodStart)}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Billing Cycle</p>
                            <p className="font-medium">{currentSubscription?.billingCycle || currentPlan?.durationUnit || "-"}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="font-medium">{currentPlan.currency} {currentPlan.price}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Features</p>
                            <p className="font-medium">{currentPlan.features?.length || 0} included</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Latest Event</p>
                            <p className="font-medium capitalize">{latestSubscriptionEvent?.action || "No events"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Feature Usage */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Gauge className="h-4 w-4 text-blue-500" />
                          Feature Usage & Limits
                        </h4>
                        <div className="space-y-3">
                          {currentPlan.features?.map((feature) => {
                            const display = getFeatureDisplay(feature);
                            const usage = featureUsage[feature.key];
                            const usagePercent = typeof usage?.percentage === "number" ? usage.percentage : 0;
                            const usageLabel = feature.mode === "limited" && usage
                              ? `${usage.used} / ${display.value ?? feature.limit ?? 0}`
                              : display.label;
                            
                            return (
                              <div key={feature.key} className="rounded-lg border p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    {getFeatureIcon(feature.key)}
                                    <span className="text-sm font-medium">{feature.label}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {display.status === 'limited' && usage && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Badge variant="outline" className="text-xs">
                                              {usageLabel}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>
                                              {usage.used} used out of {display.value} {display.unit}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    <div className={`flex items-center gap-1 ${display.color}`}>
                                      {display.icon}
                                      <span className="text-xs font-medium">{display.label}</span>
                                    </div>
                                  </div>
                                </div>
                                {display.status === 'limited' && usage && (
                                  <div className="mt-1">
                                    <div className="flex items-center gap-2">
                                      <Progress 
                                        value={usagePercent} 
                                        className={`h-1.5 flex-1 ${
                                          usagePercent > 80 ? 'bg-red-100' : 
                                          usagePercent > 60 ? 'bg-yellow-100' : 'bg-green-100'
                                        }`} 
                                      />
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {Math.round(usagePercent)}%
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {display.status === 'unlimited' && (
                                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <Infinity className="h-3 w-3" />
                                    <span>No usage limits</span>
                                  </div>
                                )}
                                {display.status === 'enabled' && (
                                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    <span>Fully enabled</span>
                                  </div>
                                )}
                                {display.status === 'disabled' && (
                                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <XCircle className="h-3 w-3 text-slate-300" />
                                    <span>Not available in this plan</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {(!currentPlan.features || currentPlan.features.length === 0) && (
                            <p className="text-sm text-muted-foreground">No features defined for this plan.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardContent className="p-6">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Quick Actions
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" size="sm" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Renew Subscription
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      View Invoice
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Bell className="h-4 w-4" />
                      Manage Alerts
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Plans Tab */}
            <TabsContent value="plans" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrent = currentPlan?.id === plan.id || currentPlan?.key === plan.key;
                  const planColor = getPlanColor(plan.key);
                  const badgeColor = getPlanBadgeColor(plan.key);
                  const features = plan.features || [];
                  const isExpanded = expandedPlans.includes(plan.id);
                  
                  return (
                    <Card 
                      key={plan.id} 
                      className={`group relative overflow-hidden transition-all hover:shadow-xl ${
                        isCurrent 
                          ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/10' 
                          : 'border hover:border-blue-300'
                      }`}
                    >
                      {/* Gradient Background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${planColor} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                      
                      {/* Current Badge */}
                      {isCurrent && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-blue-500 text-white gap-1 shadow-lg">
                            <CheckCircle2 className="h-3 w-3" />
                            Current
                          </Badge>
                        </div>
                      )}

                      <CardContent className="p-6 relative">
                        {/* Plan Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${planColor} text-white shadow-lg shrink-0`}>
                            {getPlanIcon(plan.key)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold">{plan.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {plan.description || "No description available"}
                            </p>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="flex items-end gap-2 mb-4">
                          <span className="text-3xl font-bold">
                            {plan.currency} {plan.price}
                          </span>
                          <span className="text-sm text-muted-foreground mb-1">
                            / {plan.durationValue} {plan.durationUnit}
                          </span>
                        </div>

                        {/* Key Features with Limits */}
                        <div className="space-y-2 mb-4">
                          <button
                            onClick={() => togglePlanExpand(plan.id)}
                            className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                          >
                            <span>Features & Limits</span>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          
                          <div className={`space-y-1.5 transition-all duration-300 ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-[80px] overflow-hidden opacity-80'}`}>
                            {features.slice(0, isExpanded ? undefined : 4).map((feature) => {
                              const display = getFeatureDisplay(feature);
                              return (
                                <div key={feature.key} className="flex items-center justify-between text-sm p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <div className="flex items-center gap-2">
                                    {getFeatureIcon(feature.key)}
                                    <span>{feature.label}</span>
                                  </div>
                                  <div className={`flex items-center gap-1.5 ${display.color}`}>
                                    {display.icon}
                                    <span className="text-xs font-medium">{display.label}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {!isExpanded && features.length > 4 && (
                              <p className="text-xs text-muted-foreground text-center pt-1">
                                +{features.length - 4} more features (click to expand)
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Plan Meta */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge className={badgeColor}>
                            {features.length} features
                          </Badge>
                          {plan.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                          <Badge 
                            variant={plan.isActive ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {plan.isActive ? "Available" : "Disabled"}
                          </Badge>
                        </div>

                        {/* Action Button */}
                        {!isCurrent && plan.isActive && (
                          <Button 
                            className="w-full gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/20"
                          >
                            Upgrade Now
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                        {isCurrent && (
                          <Button variant="outline" className="w-full" disabled>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Current Plan
                          </Button>
                        )}
                        {!plan.isActive && (
                          <Button variant="outline" className="w-full" disabled>
                            <XCircle className="h-4 w-4 mr-2" />
                            Not Available
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <PaginationControls
                label="Plans"
                page={plansPagination.page}
                totalPages={plansPagination.totalPages}
                total={plansPagination.total}
                onPrev={() => setPlansPage((page) => Math.max(page - 1, 1))}
                onNext={() => setPlansPage((page) => Math.min(page + 1, plansPagination.totalPages || 1))}
              />

              {plans.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground">No plans available</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Check back later for subscription options.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-4">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-blue-500" />
                    Detailed Feature Comparison
                    <Badge variant="secondary" className="ml-2">{plans.length} plans</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compare features, limits, and capabilities across all available plans
                  </p>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {plans.length > 0 ? (
                    <div className="min-w-[900px]">
                      {/* Plan Headers */}
                      <div className="grid grid-cols-[220px_repeat(auto-fill,minmax(160px,1fr))] gap-0 border-b">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 font-medium text-sm text-muted-foreground sticky left-0 bg-slate-50 dark:bg-slate-800/50 z-10">
                          Features & Limits
                        </div>
                        {plans.map((plan) => (
                          <div 
                            key={plan.id} 
                            className={`p-4 text-center ${
                              currentPlan?.id === plan.id 
                                ? 'bg-blue-50 dark:bg-blue-950/30 border-b-2 border-blue-500' 
                                : 'bg-slate-50 dark:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1.5">
                                {getPlanIcon(plan.key)}
                                <span className="font-semibold">{plan.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {plan.currency} {plan.price}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {plan.durationValue} {plan.durationUnit}
                              </div>
                              {currentPlan?.id === plan.id && (
                                <Badge className="mt-1 bg-blue-500 text-white text-[10px] px-1.5 py-0">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Feature Rows */}
                      {allFeatures.map((featureKey) => {
                        const firstPlan = plans.find(p => 
                          p.features?.some(f => f.key === featureKey)
                        );
                        const featureLabel = firstPlan?.features?.find(f => f.key === featureKey)?.label || featureKey;
                        
                        return (
                          <div key={featureKey} className="grid grid-cols-[220px_repeat(auto-fill,minmax(160px,1fr))] gap-0 border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <div className="p-4 flex items-center gap-2 sticky left-0 bg-white dark:bg-slate-950 z-10 border-r">
                              {getFeatureIcon(featureKey)}
                              <span className="text-sm font-medium">{featureLabel}</span>
                            </div>
                            {plans.map((plan) => {
                              const feature = plan.features?.find(f => f.key === featureKey);
                              const display = feature ? getFeatureDisplay(feature) : { icon: <CircleOff className="h-4 w-4 text-slate-300" />, label: "Not included", color: "text-slate-400" };
                              
                              return (
                                <div key={`${plan.id}-${featureKey}`} className="p-4 flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className={display.color}>
                                      {display.icon}
                                    </div>
                                    <span className={`text-xs font-medium ${display.color}`}>
                                      {display.label}
                                    </span>
                                    {display.value !== undefined && (
                                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1 max-w-20">
                                        <div 
                                          className="bg-blue-500 h-1.5 rounded-full transition-all" 
                                          style={{ width: `${Math.min((display.value / 100) * 100, 100)}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No plans available for comparison</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-orange-500" />
                    Subscription History
                    <Badge variant="secondary" className="ml-2">{subscriptionHistory.length}</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Plan assign, renew, cancel, and expire events
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                    {subscriptionHistory.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="group rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm capitalize">{entry.action}</p>
                              <Badge variant="outline" className="text-xs">
                                {entry.fromStatus || "none"} → {entry.toStatus || "none"}
                              </Badge>
                            </div>
                            {entry.note && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {entry.note}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(entry.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-sm font-medium capitalize">
                              {entry.action}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {subscriptionHistory.length === 0 && (
                      <div className="text-center py-12">
                        <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-lg font-medium text-muted-foreground">No subscription history</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Subscription changes will appear once a plan is assigned or updated.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Usage History
                    <Badge variant="secondary" className="ml-2">{usageHistory.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {usageHistory.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="group rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{entry.projectName}</p>
                              <Badge variant="outline" className="text-xs">
                                {entry.projectCode}
                              </Badge>
                              {entry.stageName && (
                                <Badge variant="secondary" className="text-xs">
                                  {entry.stageName}
                                </Badge>
                              )}
                            </div>
                            {entry.note && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {entry.note}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(entry.activityAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-sm font-medium">
                              {entry.totalQuantityUsed} units
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {usageHistory.length === 0 && (
                      <div className="text-center py-12">
                        <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-lg font-medium text-muted-foreground">No usage history</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Usage will appear once you start using the platform.
                        </p>
                      </div>
                    )}
                  </div>

                  <PaginationControls
                    label="Usage records"
                    page={usagePagination.page}
                    totalPages={usagePagination.totalPages}
                    total={usagePagination.total}
                    onPrev={() => setUsagePage((page) => Math.max(page - 1, 1))}
                    onNext={() => setUsagePage((page) => Math.min(page + 1, usagePagination.totalPages || 1))}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
