"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import {
  createDefaultSettings,
  historyEventTitle,
  mergeWithDefaults,
} from "@/routes/dashboard/notifications/notifications.utils";
import { NotificationEventCard } from "@/routes/dashboard/notifications/notification-event-card";
import { NotificationHistorySection } from "@/routes/dashboard/notifications/notification-history-section";
import {
  NotificationPreviewDialog,
  NotificationSendConfirmDialog,
} from "@/routes/dashboard/notifications/notification-dialogs";

function SummaryCard({ title, icon: Icon, enabled, count, helper }) {
  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-soft)] text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="font-semibold">{enabled ? "Enabled" : "Disabled"}</p>
          <p className="text-xs text-muted-foreground">
            {count} recipient rows {helper ? `· ${helper}` : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getEnabledChannels(eventValue) {
  return [
    eventValue?.channels?.email?.enabled ? "email" : null,
    eventValue?.channels?.whatsapp?.enabled ? "whatsapp" : null,
  ].filter(Boolean);
}

export function FactoryNotificationsPanel({ factoryId, factoryName }) {
  const [settings, setSettings] = useState(createDefaultSettings);
  const [activeTab, setActiveTab] = useState("events");
  const [expandedKey, setExpandedKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyEventKey, setHistoryEventKey] = useState("all");
  const [historyChannel, setHistoryChannel] = useState("all");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [historyPreviewOpen, setHistoryPreviewOpen] = useState(false);
  const [sendingEventKey, setSendingEventKey] = useState("");
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [pendingSendEventKey, setPendingSendEventKey] = useState("");
  const [pendingSendChannels, setPendingSendChannels] = useState([]);

  useEffect(() => {
    if (!factoryId) return;

    let active = true;
    const loadAudit = async () => {
      setLoading(true);
      try {
        const response = await apiRootRequest(API_PATHS.admin.factoryNotificationAudit(factoryId));
        if (!active) return;
        setSettings(mergeWithDefaults(response?.settings));
        setHistoryItems(response?.dispatchHistory ?? []);
        setHistoryPagination(
          response?.historyPagination ?? {
            page: 1,
            limit: 10,
            total: Array.isArray(response?.dispatchHistory) ? response.dispatchHistory.length : 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        );
      } catch (error) {
        if (!active) return;
        toast.error(
          error instanceof Error ? error.message : "Unable to load notification settings",
        );
        setSettings(createDefaultSettings());
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadAudit();
    return () => {
      active = false;
    };
  }, [factoryId]);

  useEffect(() => {
    if (activeTab !== "history" || !factoryId) return undefined;

    let active = true;
    const timer = setTimeout(
      () => {
        const loadHistory = async () => {
          setHistoryLoading(true);
          try {
            const response = await apiRootRequest(
              API_PATHS.admin.factoryNotificationsHistory(factoryId),
              {
                query: {
                  page: historyPage,
                  limit: 10,
                  search: historySearch.trim() || undefined,
                  eventKey: historyEventKey === "all" ? undefined : historyEventKey,
                  channel: historyChannel === "all" ? undefined : historyChannel,
                  status: historyStatus === "all" ? undefined : historyStatus,
                  reload: historyReloadToken,
                },
              },
            );
            if (!active) return;
            setHistoryItems(response?.items ?? []);
            setHistoryPagination(
              response?.pagination ?? {
                page: historyPage,
                limit: 10,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              },
            );
          } catch (error) {
            if (!active) return;
            toast.error(
              error instanceof Error ? error.message : "Unable to load notification history",
            );
          } finally {
            if (active) setHistoryLoading(false);
          }
        };

        void loadHistory();
      },
      historySearch.trim() ? 300 : 0,
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    activeTab,
    factoryId,
    historyPage,
    historySearch,
    historyEventKey,
    historyChannel,
    historyStatus,
    historyReloadToken,
  ]);

  useEffect(() => {
    if (!settings?.definitions?.length) return;
    if (expandedKey && settings.definitions.some((definition) => definition.key === expandedKey))
      return;
    setExpandedKey(settings.definitions[0]?.key ?? null);
  }, [expandedKey, settings.definitions]);

  const eventRecipientCount = useMemo(() => {
    return settings.definitions.reduce((sum, def) => {
      const event = settings.events[def.key];
      if (!event) return sum;
      const emailCount = event.channels.email.enabled ? event.channels.email.recipients.length : 0;
      const whatsappCount = event.channels.whatsapp.enabled
        ? event.channels.whatsapp.recipients.length
        : 0;
      return sum + emailCount + whatsappCount;
    }, 0);
  }, [settings]);

  const enabledEventCount = useMemo(
    () => settings.definitions.filter((def) => settings.events[def.key]?.enabled).length,
    [settings],
  );

  const handleSave = async () => {
    if (!factoryId) return;

    setSaving(true);
    try {
      const response = await apiRootRequest(API_PATHS.admin.factoryNotifications(factoryId), {
        method: "PUT",
        body: settings,
      });
      setSettings(mergeWithDefaults(response?.settings));
      toast.success("Notification settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  const updateChannel = (channel, value) => {
    setSettings((current) => ({
      ...current,
      channels: { ...current.channels, [channel]: value },
    }));
  };

  const updateEventValue = (key, nextValue) => {
    setSettings((current) => ({
      ...current,
      events: { ...current.events, [key]: nextValue },
    }));
  };

  const renameEvent = (key, patch) => {
    setSettings((current) => ({
      ...current,
      definitions: current.definitions.map((definition) =>
        definition.key === key ? { ...definition, ...patch } : definition,
      ),
    }));
  };

  const deleteEvent = (key) => {
    setSettings((current) => {
      const { [key]: _removed, ...restEvents } = current.events;
      return {
        ...current,
        definitions: current.definitions.filter((definition) => definition.key !== key),
        events: restEvents,
      };
    });
    toast.success("Event removed");
  };

  const refreshHistory = () => {
    setHistoryReloadToken((value) => value + 1);
  };

  const requestSendEvent = (eventKey) => {
    if (!eventKey) return;
    const event = settings.events[eventKey];
    const nextChannels = getEnabledChannels(event);
    if (!nextChannels.length) {
      toast.error("Enable email or WhatsApp before sending this event");
      return;
    }
    setPendingSendChannels(nextChannels);
    setPendingSendEventKey(eventKey);
    setSendConfirmOpen(true);
  };

  const sendEventNow = async (eventKey) => {
    if (!eventKey || !factoryId) return;

    setSendingEventKey(eventKey);
    try {
      const response = await apiRootRequest(
        API_PATHS.admin.factoryNotificationsSendNow(factoryId, eventKey),
        {
          method: "POST",
          body: { channels: pendingSendChannels.length ? pendingSendChannels : undefined },
        },
      );
      toast.success(
        response?.status === "skipped" ? "Event recorded in history" : "Notification sent",
      );
      refreshHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send notification now");
    } finally {
      setSendingEventKey("");
    }
  };

  const confirmSendEvent = async () => {
    const eventKey = pendingSendEventKey;
    setSendConfirmOpen(false);
    setPendingSendEventKey("");
    if (!eventKey) return;
    await sendEventNow(eventKey);
  };

  const openHistoryPreview = (item) => {
    setSelectedHistory(item);
    setHistoryPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Email channel"
          icon={Mail}
          enabled={settings.channels.email.enabled}
          count={eventRecipientCount}
          helper="uses per-event email lists"
        />
        <SummaryCard
          title="WhatsApp channel"
          icon={MessageCircle}
          enabled={settings.channels.whatsapp.enabled}
          count={eventRecipientCount}
          helper="uses per-event phone lists"
        />
        <SummaryCard
          title="Enabled events"
          icon={ShieldCheck}
          enabled={enabledEventCount > 0}
          count={enabledEventCount}
          helper={`${settings.definitions.length} total events`}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 sm:w-auto sm:grid-cols-3">
          <TabsTrigger value="events">Event Setup</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-0 space-y-4">
          <Card className="border-border/60 shadow-[var(--shadow-card)]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 border-b border-border/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-lg font-semibold">Notification settings</p>
                  <p className="text-sm text-muted-foreground">
                    Edit the event setup for {factoryName || "this factory"} and save changes.
                  </p>
                </div>
                <Button type="button" onClick={handleSave} disabled={saving || loading}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save settings"}
                </Button>
              </div>

              {loading ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  Loading notification settings...
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-soft)] text-primary">
                            <Mail className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold">Email channel</p>
                            <p className="text-xs text-muted-foreground">
                              Main email channel switch for this factory
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant={settings.channels.email.enabled ? "default" : "outline"}
                          onClick={() =>
                            updateChannel("email", {
                              ...settings.channels.email,
                              enabled: !settings.channels.email.enabled,
                            })
                          }
                        >
                          {settings.channels.email.enabled ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-soft)] text-primary">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold">WhatsApp channel</p>
                            <p className="text-xs text-muted-foreground">
                              Main WhatsApp channel switch for this factory
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant={settings.channels.whatsapp.enabled ? "default" : "outline"}
                          onClick={() =>
                            updateChannel("whatsapp", {
                              ...settings.channels.whatsapp,
                              enabled: !settings.channels.whatsapp.enabled,
                            })
                          }
                        >
                          {settings.channels.whatsapp.enabled ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {settings.definitions.map((definition) => {
                      const value = settings.events[definition.key];
                      if (!value) return null;
                      return (
                        <NotificationEventCard
                          key={definition.key}
                          definition={definition}
                          value={value}
                          expanded={expandedKey === definition.key}
                          onToggle={() =>
                            setExpandedKey((current) =>
                              current === definition.key ? null : definition.key,
                            )
                          }
                          onChange={(nextValue) => updateEventValue(definition.key, nextValue)}
                          onRename={(patch) => renameEvent(definition.key, patch)}
                          onDelete={() => deleteEvent(definition.key)}
                          onSendNow={requestSendEvent}
                          sendNowLoading={sendingEventKey === definition.key}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="mt-0 space-y-4">
          <Card className="border-border/60 shadow-[var(--shadow-card)]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 border-b border-border/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-lg font-semibold">Event actions</p>
                  <p className="text-sm text-muted-foreground">
                    Quickly send any configured event now for {factoryName || "this factory"}.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={refreshHistory}>
                  Refresh history
                </Button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {settings.definitions.map((definition) => {
                  const value = settings.events[definition.key];
                  if (!value) return null;
                  const channels = getEnabledChannels(value);
                  return (
                    <div
                      key={definition.key}
                      className="rounded-2xl border border-border/70 bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{definition.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {channels.length ? channels.join(" · ") : "No channel enabled"}
                            {definition.schedule?.enabled
                              ? ` · Scheduled ${definition.schedule.time || "09:00"}`
                              : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => requestSendEvent(definition.key)}
                          disabled={!channels.length || sendingEventKey === definition.key}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {sendingEventKey === definition.key ? "Sending..." : "Send now"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-0 space-y-4">
          <NotificationHistorySection
            settings={settings}
            historyItems={historyItems}
            historyPagination={historyPagination}
            historyLoading={historyLoading}
            historySearch={historySearch}
            historyEventKey={historyEventKey}
            historyChannel={historyChannel}
            historyStatus={historyStatus}
            onHistorySearchChange={(value) => {
              setHistoryPage(1);
              setHistorySearch(value);
            }}
            onHistoryEventKeyChange={(value) => {
              setHistoryPage(1);
              setHistoryEventKey(value);
            }}
            onHistoryChannelChange={(value) => {
              setHistoryPage(1);
              setHistoryChannel(value);
            }}
            onHistoryStatusChange={(value) => {
              setHistoryPage(1);
              setHistoryStatus(value);
            }}
            onResetFilters={() => {
              setHistoryPage(1);
              setHistorySearch("");
              setHistoryEventKey("all");
              setHistoryChannel("all");
              setHistoryStatus("all");
            }}
            onRefresh={refreshHistory}
            onOpenPreview={openHistoryPreview}
            onPrevPage={() => setHistoryPage((value) => Math.max(1, value - 1))}
            onNextPage={() => setHistoryPage((value) => value + 1)}
          />
        </TabsContent>
      </Tabs>

      <NotificationPreviewDialog
        open={historyPreviewOpen}
        onOpenChange={setHistoryPreviewOpen}
        selectedHistory={selectedHistory}
        settings={settings}
      />

      <NotificationSendConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        eventTitle={historyEventTitle(settings, pendingSendEventKey)}
        channelOptions={[
          { key: "email", label: "Email", enabled: true },
          { key: "whatsapp", label: "WhatsApp", enabled: true },
        ].filter((option) => pendingSendChannels.includes(option.key))}
        selectedChannels={pendingSendChannels}
        onSelectedChannelsChange={setPendingSendChannels}
        isSending={Boolean(sendingEventKey)}
        onConfirm={confirmSendEvent}
      />
    </div>
  );
}
