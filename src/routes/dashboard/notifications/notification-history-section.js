"use client";

import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { historyEventTitle, formatHistoryDate, getHistoryStatusStyle } from "./notifications.utils";

function HistoryStatCard({ title, icon: Icon, value }) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-soft)] text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function NotificationHistorySection({
  settings,
  historyItems,
  historyPagination,
  historyLoading,
  historySearch,
  historyEventKey,
  historyChannel,
  historyStatus,
  onHistorySearchChange,
  onHistoryEventKeyChange,
  onHistoryChannelChange,
  onHistoryStatusChange,
  onResetFilters,
  onRefresh,
  onOpenPreview,
  onPrevPage,
  onNextPage,
}) {
  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-lg">Notification history</CardTitle>
            <p className="text-sm text-muted-foreground">
              Search sent emails, filter by channel or event, and open a preview of each dispatch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onResetFilters}>
              Reset filters
            </Button>
            <Button type="button" onClick={onRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={historySearch}
              onChange={(e) => onHistorySearchChange(e.target.value)}
              className="pl-9"
              placeholder="Search subject, message, recipient, or date"
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
            value={historyChannel}
            onChange={(e) => onHistoryChannelChange(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="all">All channels</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <select
            value={historyStatus}
            onChange={(e) => onHistoryStatusChange(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
            <option value="skipped">Skipped</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <HistoryStatCard
            title="Total records"
            icon={FileText}
            value={historyPagination.total || 0}
          />
          <HistoryStatCard
            title="Email channel"
            icon={Mail}
            value={historyItems.filter((item) => item.channel === "email").length}
          />
          <HistoryStatCard
            title="WhatsApp channel"
            icon={MessageCircle}
            value={historyItems.filter((item) => item.channel === "whatsapp").length}
          />
        </div>

        <div className="space-y-3">
          {historyLoading ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Loading history...
            </div>
          ) : historyItems.length ? (
            historyItems.map((item) => {
              const recipients = Array.isArray(item.recipients) ? item.recipients : [];
              return (
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
                          {item.subject || item.title || "Notification"}
                        </h4>
                        <Badge className={getHistoryStatusStyle(item.status)}>
                          <Activity className="h-3 w-3" />
                          <span className="ml-1 capitalize">{item.status || "sent"}</span>
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {item.channel || "email"}
                        </Badge>
                        {(item.factoryId?.name || item.factoryName) && (
                          <Badge variant="outline">
                            {item.factoryId?.name || item.factoryName}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {historyEventTitle(settings, item.eventKey)}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {item.message || item.previewText || "No message preview available"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatHistoryDate(item.sentAt || item.createdAt)}
                        </span>
                        <span>{Array.isArray(recipients) ? recipients.length : 0} recipients</span>
                        {item.meta?.date && <span>Report date: {item.meta.date}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">View preview</span>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No notification history found.
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
              <ChevronLeft className="mr-1 h-4 w-4" />
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
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
