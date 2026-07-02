"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Clock,
  Eye,
  FileText,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { SuperadminAccess } from "@/components/superadmin/access";
import { SuperadminShell } from "@/components/superadmin/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import {
  createDefaultSettings,
  formatHistoryDate,
  getHistoryStatusStyle,
  historyEventTitle,
} from "@/routes/dashboard/notifications/notifications.utils";
import { NotificationPreviewDialog } from "@/routes/dashboard/notifications/notification-dialogs";
import { NotificationHistorySection } from "@/routes/dashboard/notifications/notification-history-section";

function SummaryCard({ title, icon: Icon, value, helper }) {
  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-soft)] text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduledHistorySection({
  settings,
  historyItems,
  historyPagination,
  historyLoading,
  historySearch,
  historyEventKey,
  historyStatus,
  onHistorySearchChange,
  onHistoryEventKeyChange,
  onHistoryStatusChange,
  onResetFilters,
  onRefresh,
  onOpenPreview,
  onPrevPage,
  onNextPage,
}) {
  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-lg font-semibold">Scheduled runs</p>
            <p className="text-sm text-muted-foreground">
              Today’s actual schedule runs with final status and summary.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onResetFilters}>
              Reset filters
            </Button>
            <Button type="button" variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={historySearch}
              onChange={(e) => onHistorySearchChange(e.target.value)}
              className="pl-9"
              placeholder="Search subject, summary, factory, or date"
            />
          </div>
          <select
            value={historyEventKey}
            onChange={(e) => onHistoryEventKeyChange(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="all">All events</option>
            {settings.definitions.map((definition) => (
              <option key={definition.key} value={definition.key}>
                {definition.title}
              </option>
            ))}
          </select>
          <select
            value={historyStatus}
            onChange={(e) => onHistoryStatusChange(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
            <option value="skipped">Skipped</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard
            title="Total records"
            icon={FileText}
            value={historyPagination.total || 0}
            helper="all scheduled runs"
          />
          <SummaryCard
            title="Runs on page"
            icon={Clock}
            value={historyItems.length}
            helper="actual schedule runs"
          />
          <SummaryCard
            title="Failed"
            icon={Activity}
            value={historyItems.filter((item) => item.status === "failed").length}
            helper="in current page"
          />
        </div>

        <div className="space-y-3">
          {historyLoading ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Loading schedule history...
            </div>
          ) : historyItems.length ? (
            historyItems.map((item) => (
              <button
                key={item._id || item.id}
                type="button"
                onClick={() => onOpenPreview(item)}
                className="w-full rounded-2xl border border-border/70 bg-background p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate font-semibold text-foreground">
                        {item.subject || item.title || "Scheduled run"}
                      </h4>
                      <Badge className={getHistoryStatusStyle(item.status)}>
                        <span className="capitalize">{item.status || "scheduled"}</span>
                      </Badge>
                      {(item.factoryId?.name || item.factoryName) && (
                        <Badge variant="outline">{item.factoryId?.name || item.factoryName}</Badge>
                      )}
                      <Badge variant="outline">{historyEventTitle(settings, item.eventKey)}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {item.message || item.previewText || "No schedule preview available"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatHistoryDate(item.sentAt || item.createdAt)}
                      </span>
                      {item.scheduleDate && <span>Schedule date: {item.scheduleDate}</span>}
                      {item.scheduleTime && <span>Time: {item.scheduleTime}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">View preview</span>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No scheduled history found.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {historyPagination.page || 1} of {historyPagination.totalPages || 0}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={!historyPagination.hasPrev}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={!historyPagination.hasNext}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryTabShell({
  title,
  description,
  onResetFilters,
  onRefresh,
  onSearchChange,
  onEventKeyChange,
  onStatusChange,
  onChannelChange,
  searchValue,
  eventKeyValue,
  statusValue,
  channelValue,
  items,
  pagination,
  loading,
  onOpenPreview,
  onPrevPage,
  onNextPage,
  settings,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={onResetFilters}>
            Reset filters
          </Button>
          <Button type="button" variant="outline" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <NotificationHistorySection
        settings={settings}
        historyItems={items}
        historyPagination={pagination}
        historyLoading={loading}
        historySearch={searchValue}
        historyEventKey={eventKeyValue}
        historyChannel={channelValue}
        historyStatus={statusValue}
        onHistorySearchChange={onSearchChange}
        onHistoryEventKeyChange={onEventKeyChange}
        onHistoryChannelChange={onChannelChange}
        onHistoryStatusChange={onStatusChange}
        onResetFilters={onResetFilters}
        onRefresh={onRefresh}
        onOpenPreview={onOpenPreview}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
      />
    </div>
  );
}

export function SuperadminNotifications() {
  const [settings] = useState(createDefaultSettings);
  const [activeTab, setActiveTab] = useState("dispatch");

  const [dispatchItems, setDispatchItems] = useState([]);
  const [dispatchPagination, setDispatchPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchSearch, setDispatchSearch] = useState("");
  const [dispatchEventKey, setDispatchEventKey] = useState("all");
  const [dispatchChannel, setDispatchChannel] = useState("all");
  const [dispatchStatus, setDispatchStatus] = useState("all");
  const [dispatchPage, setDispatchPage] = useState(1);
  const [dispatchReloadToken, setDispatchReloadToken] = useState(0);

  const [scheduledItems, setScheduledItems] = useState([]);
  const [scheduledPagination, setScheduledPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [scheduledSearch, setScheduledSearch] = useState("");
  const [scheduledEventKey, setScheduledEventKey] = useState("all");
  const [scheduledStatus, setScheduledStatus] = useState("all");
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledReloadToken, setScheduledReloadToken] = useState(0);

  const [selectedHistory, setSelectedHistory] = useState(null);
  const [historyPreviewOpen, setHistoryPreviewOpen] = useState(false);

  const loadHistory = async (view, options = {}) => {
    const query = {
      view,
      page: options.page || 1,
      limit: 20,
      search: options.search?.trim() || undefined,
      eventKey: options.eventKey && options.eventKey !== "all" ? options.eventKey : undefined,
      status: options.status && options.status !== "all" ? options.status : undefined,
      channel: options.channel && options.channel !== "all" ? options.channel : undefined,
    };

    const response = await apiRootRequest(API_PATHS.admin.notificationsHistory, {
      query,
    });
    return response;
  };

  useEffect(() => {
    if (activeTab !== "dispatch") return undefined;

    let active = true;
    const timer = setTimeout(
      () => {
        const run = async () => {
          setDispatchLoading(true);
          try {
            const response = await loadHistory("dispatch", {
              page: dispatchPage,
              search: dispatchSearch,
              eventKey: dispatchEventKey,
              channel: dispatchChannel,
              status: dispatchStatus,
              reload: dispatchReloadToken,
            });
            if (!active) return;
            setDispatchItems(response?.items ?? []);
            setDispatchPagination(response?.pagination ?? dispatchPagination);
          } catch (error) {
            if (!active) return;
            toast.error(error instanceof Error ? error.message : "Unable to load dispatch history");
          } finally {
            if (active) setDispatchLoading(false);
          }
        };
        void run();
      },
      dispatchSearch.trim() ? 300 : 0,
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    activeTab,
    dispatchPage,
    dispatchSearch,
    dispatchEventKey,
    dispatchChannel,
    dispatchStatus,
    dispatchReloadToken,
  ]);

  useEffect(() => {
    if (activeTab !== "scheduled") return undefined;

    let active = true;
    const timer = setTimeout(
      () => {
        const run = async () => {
          setScheduledLoading(true);
          try {
            const response = await loadHistory("scheduled", {
              page: scheduledPage,
              search: scheduledSearch,
              eventKey: scheduledEventKey,
              status: scheduledStatus,
              reload: scheduledReloadToken,
            });
            if (!active) return;
            setScheduledItems(response?.items ?? []);
            setScheduledPagination(response?.pagination ?? scheduledPagination);
          } catch (error) {
            if (!active) return;
            toast.error(
              error instanceof Error ? error.message : "Unable to load scheduled history",
            );
          } finally {
            if (active) setScheduledLoading(false);
          }
        };
        void run();
      },
      scheduledSearch.trim() ? 300 : 0,
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    activeTab,
    scheduledPage,
    scheduledSearch,
    scheduledEventKey,
    scheduledStatus,
    scheduledReloadToken,
  ]);

  const dispatchTotal = dispatchPagination.total || 0;
  const scheduledTotal = scheduledPagination.total || 0;
  const totalHistory = dispatchTotal + scheduledTotal;

  const openHistoryPreview = (item) => {
    setSelectedHistory(item);
    setHistoryPreviewOpen(true);
  };

  const refreshDispatch = () => setDispatchReloadToken((value) => value + 1);
  const refreshScheduled = () => setScheduledReloadToken((value) => value + 1);

  return (
    <SuperadminAccess>
      <SuperadminShell title="Notification Manage">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="All history"
              icon={FileText}
              value={totalHistory}
              helper="dispatch + scheduled"
            />
            <SummaryCard
              title="Dispatch history"
              icon={Mail}
              value={dispatchTotal}
              helper="sent notifications"
            />
            <SummaryCard
              title="Scheduled history"
              icon={Clock}
              value={scheduledTotal}
              helper="cron run records"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:w-auto">
              <TabsTrigger value="dispatch">All Factory History</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled History</TabsTrigger>
            </TabsList>

            <TabsContent value="dispatch" className="mt-0 space-y-4">
              <HistoryTabShell
                title="All factory notification history"
                description="Sent, failed, and skipped dispatch records across every factory."
                filters={4}
                settings={settings}
                searchValue={dispatchSearch}
                eventKeyValue={dispatchEventKey}
                statusValue={dispatchStatus}
                channelValue={dispatchChannel}
                items={dispatchItems}
                pagination={dispatchPagination}
                loading={dispatchLoading}
                onOpenPreview={openHistoryPreview}
                onSearchChange={(value) => {
                  setDispatchPage(1);
                  setDispatchSearch(value);
                }}
                onEventKeyChange={(value) => {
                  setDispatchPage(1);
                  setDispatchEventKey(value);
                }}
                onStatusChange={(value) => {
                  setDispatchPage(1);
                  setDispatchStatus(value);
                }}
                onChannelChange={(value) => {
                  setDispatchPage(1);
                  setDispatchChannel(value);
                }}
                onResetFilters={() => {
                  setDispatchPage(1);
                  setDispatchSearch("");
                  setDispatchEventKey("all");
                  setDispatchChannel("all");
                  setDispatchStatus("all");
                }}
                onRefresh={refreshDispatch}
                onPrevPage={() => setDispatchPage((value) => Math.max(1, value - 1))}
                onNextPage={() => setDispatchPage((value) => value + 1)}
              />
            </TabsContent>

            <TabsContent value="scheduled" className="mt-0 space-y-4">
              <ScheduledHistorySection
                settings={settings}
                historyItems={scheduledItems}
                historyPagination={scheduledPagination}
                historyLoading={scheduledLoading}
                historySearch={scheduledSearch}
                historyEventKey={scheduledEventKey}
                historyStatus={scheduledStatus}
                onHistorySearchChange={(value) => {
                  setScheduledPage(1);
                  setScheduledSearch(value);
                }}
                onHistoryEventKeyChange={(value) => {
                  setScheduledPage(1);
                  setScheduledEventKey(value);
                }}
                onHistoryStatusChange={(value) => {
                  setScheduledPage(1);
                  setScheduledStatus(value);
                }}
                onResetFilters={() => {
                  setScheduledPage(1);
                  setScheduledSearch("");
                  setScheduledEventKey("all");
                  setScheduledStatus("all");
                }}
                onRefresh={refreshScheduled}
                onOpenPreview={openHistoryPreview}
                onPrevPage={() => setScheduledPage((value) => Math.max(1, value - 1))}
                onNextPage={() => setScheduledPage((value) => value + 1)}
              />
            </TabsContent>
          </Tabs>
        </div>

        <NotificationPreviewDialog
          open={historyPreviewOpen}
          onOpenChange={setHistoryPreviewOpen}
          selectedHistory={selectedHistory}
          settings={settings}
        />
      </SuperadminShell>
    </SuperadminAccess>
  );
}
