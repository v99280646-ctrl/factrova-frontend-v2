"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import {
  createDefaultSettings,
  historyEventTitle,
  mergeWithDefaults,
} from "./notifications/notifications.utils";
import { NotificationHistorySection } from "./notifications/notification-history-section";
import {
  NotificationPreviewDialog,
  NotificationSendConfirmDialog,
} from "./notifications/notification-dialogs";
import { NotificationEventCard } from "./notifications/notification-event-card";

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

export function Notifications() {
  const [settings, setSettings] = useState(createDefaultSettings);
  const [activeTab, setActiveTab] = useState("events");
  const [expandedKey, setExpandedKey] = useState(null);
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
    let active = true;
    const load = async () => {
      try {
        const response = await apiRequest(API_PATHS.notifications.root);
        if (!active) return;
        setSettings(mergeWithDefaults(response?.settings));
      }
      catch {
        if (!active) return;
        setSettings(createDefaultSettings());
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "history") return undefined;
    let active = true;
    const timer = setTimeout(() => {
      const loadHistory = async () => {
        setHistoryLoading(true);
        try {
          const response = await apiRequest(API_PATHS.notifications.history, {
            query: {
              page: historyPage,
              limit: 10,
              search: historySearch.trim() || undefined,
              eventKey: historyEventKey === "all" ? undefined : historyEventKey,
              channel: historyChannel === "all" ? undefined : historyChannel,
              status: historyStatus === "all" ? undefined : historyStatus,
              reload: historyReloadToken,
            },
          });
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
        }
        catch (error) {
          if (!active) return;
          toast.error(error instanceof Error ? error.message : "Unable to load notification history");
        }
        finally {
          if (active) setHistoryLoading(false);
        }
      };
      void loadHistory();
    }, historySearch.trim() ? 300 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeTab, historyPage, historySearch, historyEventKey, historyChannel, historyStatus, historyReloadToken]);

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

  const handleSave = () => {
    void (async () => {
      try {
        const response = await apiRequest(API_PATHS.notifications.root, {
          method: "PUT",
          body: settings,
        });
        setSettings(mergeWithDefaults(response?.settings));
        toast.success("Notification settings saved");
      }
      catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save notification settings");
      }
    })();
  };

  const updateEventValue = (key, nextValue) => {
    setSettings((current) => ({ ...current, events: { ...current.events, [key]: nextValue } }));
  };

  const openHistoryPreview = (item) => {
    setSelectedHistory(item);
    setHistoryPreviewOpen(true);
  };

  const refreshHistory = () => {
    setHistoryReloadToken((value) => value + 1);
  };

  const sendEventNow = async (eventKey) => {
    if (!eventKey) return;
    setSendingEventKey(eventKey);
    try {
      const response = await apiRequest(API_PATHS.notifications.sendNow(eventKey), {
        method: "POST",
        body: { channels: pendingSendChannels.length ? pendingSendChannels : undefined },
      });
      toast.success(response?.status === "skipped" ? "Event recorded in history" : "Notification sent");
      refreshHistory();
    }
    catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send notification now");
    }
    finally {
      setSendingEventKey("");
    }
  };

  const requestSendEvent = (eventKey) => {
    if (!eventKey) return;
    const event = settings.events[eventKey];
    const nextChannels = [
      event?.channels?.email?.enabled ? "email" : null,
      event?.channels?.whatsapp?.enabled ? "whatsapp" : null,
    ].filter(Boolean);
    setPendingSendChannels(nextChannels);
    setPendingSendEventKey(eventKey);
    setSendConfirmOpen(true);
  };

  const confirmSendEvent = async () => {
    const eventKey = pendingSendEventKey;
    setSendConfirmOpen(false);
    setPendingSendEventKey("");
    if (!eventKey) return;
    await sendEventNow(eventKey);
  };

  const renameEvent = (key, patch) => {
    setSettings((current) => ({
      ...current,
      definitions: current.definitions.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    }));
  };

  const deleteEvent = (key) => {
    setSettings((current) => {
      const { [key]: _removed, ...restEvents } = current.events;
      return {
        ...current,
        definitions: current.definitions.filter((d) => d.key !== key),
        events: restEvents,
      };
    });
    toast.success("Event removed");
  };

  return (
    <DashboardLayout title="Notifications">
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
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:w-auto sm:grid-cols-2">
            <TabsTrigger value="events">Event Setup</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-0 space-y-4">
            <div className="space-y-3">
              {settings.definitions.map((def) => {
                const event = settings.events[def.key];
                if (!event) return null;
                return (
                  <NotificationEventCard
                    key={def.key}
                    definition={def}
                    value={event}
                    expanded={expandedKey === def.key}
                    onToggle={() => setExpandedKey((k) => (k === def.key ? null : def.key))}
                    onChange={(nextValue) => updateEventValue(def.key, nextValue)}
                    onRename={(patch) => renameEvent(def.key, patch)}
                    onDelete={() => deleteEvent(def.key)}
                    onSendNow={requestSendEvent}
                    sendNowLoading={sendingEventKey === def.key}
                  />
                );
              })}
              {settings.definitions.length === 0 && (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  No events configured. Click "Add event" to create one.
                </div>
              )}
            </div>
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
                setHistorySearch("");
                setHistoryEventKey("all");
                setHistoryChannel("all");
                setHistoryStatus("all");
                setHistoryPage(1);
              }}
              onRefresh={refreshHistory}
              onOpenPreview={openHistoryPreview}
              onPrevPage={() => setHistoryPage((page) => Math.max(1, page - 1))}
              onNextPage={() => setHistoryPage((page) => page + 1)}
            />
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setSettings(createDefaultSettings())}>
            Reset
          </Button>
          <Button type="button" onClick={handleSave}>
            Save settings
          </Button>
        </div>

        <NotificationPreviewDialog
          open={historyPreviewOpen}
          onOpenChange={setHistoryPreviewOpen}
          selectedHistory={selectedHistory}
          settings={settings}
        />

        <NotificationSendConfirmDialog
          open={sendConfirmOpen}
          onOpenChange={(open) => {
            setSendConfirmOpen(open);
            if (!open) {
              setPendingSendEventKey("");
              setPendingSendChannels([]);
            }
          }}
          eventTitle={historyEventTitle(settings, pendingSendEventKey)}
          channelOptions={[
            {
              key: "email",
              label: "Email",
              enabled: Boolean(settings.events[pendingSendEventKey]?.channels?.email?.enabled),
            },
            {
              key: "whatsapp",
              label: "WhatsApp",
              enabled: Boolean(settings.events[pendingSendEventKey]?.channels?.whatsapp?.enabled),
            },
          ]}
          selectedChannels={pendingSendChannels}
          onSelectedChannelsChange={setPendingSendChannels}
          isSending={sendingEventKey === pendingSendEventKey}
          onConfirm={() => void confirmSendEvent()}
        />
      </div>
    </DashboardLayout>
  );
}
