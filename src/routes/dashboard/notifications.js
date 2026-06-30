"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  Mail,
  MessageCircle,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Add Select component imports if not already available
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STORAGE_KEY = "factrova-notification-ui-settings-v2";

// These are just the starting/default events. Users can add their own
// on top of these, and can also delete any event (including defaults).
const DEFAULT_EVENT_DEFINITIONS = [
  {
    key: "dailyUpdates",
    title: "Daily updates",
    description: "Send a daily summary of projects, stock, and tasks.",
    builtIn: true,
    schedule: {
      enabled: true,
      time: "09:00",
      frequency: "daily",
      timezone: "GMT+5:30",
    },
  },
  {
    key: "stockAlerts",
    title: "Stock alerts",
    description: "Notify when stock is low or restocked.",
    builtIn: true,
  },
  {
    key: "inventoryMessages",
    title: "Inventory messages",
    description: "Share stock usage, inventory changes, and waste notes.",
    builtIn: true,
  },
  {
    key: "projectCreated",
    title: "Project created",
    description: "Send when a new project is created.",
    builtIn: true,
  },
  {
    key: "projectDelivered",
    title: "Project delivered",
    description: "Send when a project is completed or delivered.",
    builtIn: true,
  },
];

function uid() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createRecipient(type = "email") {
  return type === "whatsapp"
    ? { id: uid(), name: "", phone: "", enabled: true }
    : { id: uid(), name: "", email: "", enabled: true };
}

function createEventSettings(overrides = {}) {
  return {
    enabled: true,
    channels: {
      email: { enabled: true, recipients: [createRecipient("email")] },
      whatsapp: { enabled: false, recipients: [] },
    },
    schedule: {
      enabled: false,
      time: "09:00",
      frequency: "daily",
      timezone: "UTC+5:30",
    },
    ...overrides,
  };
}

function createDefaultSettings() {
  const events = {};
  for (const def of DEFAULT_EVENT_DEFINITIONS) {
    events[def.key] = createEventSettings();
  }
  return {
    channels: {
      email: { enabled: true },
      whatsapp: { enabled: false },
    },
    // definitions now live in state too, so users can add/remove/edit them
    definitions: DEFAULT_EVENT_DEFINITIONS,
    events,
  };
}

function loadSettings() {
  if (typeof window === "undefined") return createDefaultSettings();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSettings();
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return createDefaultSettings();
  }
}

function mergeWithDefaults(input) {
  const defaults = createDefaultSettings();
  const definitions =
    Array.isArray(input?.definitions) && input.definitions.length
      ? input.definitions
      : defaults.definitions;

  const events = {};
  for (const def of definitions) {
    const current = input?.events?.[def.key] ?? {};
    const emailRecipients = Array.isArray(current?.channels?.email?.recipients)
      ? current.channels.email.recipients.map((r) => ({ id: r.id ?? uid(), ...r }))
      : [];
    const whatsappRecipients = Array.isArray(current?.channels?.whatsapp?.recipients)
      ? current.channels.whatsapp.recipients.map((r) => ({ id: r.id ?? uid(), ...r }))
      : [];

    events[def.key] = {
      enabled: current.enabled !== false,
      channels: {
        email: {
          enabled: current?.channels?.email?.enabled !== false,
          recipients: emailRecipients,
        },
        whatsapp: {
          enabled: current?.channels?.whatsapp?.enabled === true,
          recipients: whatsappRecipients,
        },
      },
      schedule: {
        enabled: current?.schedule?.enabled ?? false,
        time: current?.schedule?.time ?? "09:00",
        frequency: current?.schedule?.frequency ?? "daily",
        timezone: current?.schedule?.timezone ?? "UTC+5:30",
      },
    };
  }

  return {
    channels: {
      email: { ...defaults.channels.email, ...(input?.channels?.email ?? {}) },
      whatsapp: { ...defaults.channels.whatsapp, ...(input?.channels?.whatsapp ?? {}) },
    },
    definitions,
    events,
  };
}

function saveSettings(settings) {
  if (typeof window === "undefined") return;
  // TODO: swap this for an API call (e.g. PATCH /api/notification-settings)
  // when you're ready to persist server-side instead of just localStorage.
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

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

function RecipientList({ channel, recipients, disabled, onChange }) {
  const fieldLabel = channel === "whatsapp" ? "Phone number" : "Email address";
  const fieldKey = channel === "whatsapp" ? "phone" : "email";

  return (
    <div className="space-y-3">
      {recipients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          No {channel} recipients yet.
        </div>
      ) : (
        recipients.map((recipient, index) => (
          <div
            key={recipient.id}
            className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={recipient.name}
                onChange={(e) =>
                  onChange(
                    recipients.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)),
                  )
                }
                placeholder="Recipient name"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{fieldLabel}</Label>
              <Input
                value={recipient[fieldKey]}
                onChange={(e) =>
                  onChange(
                    recipients.map((r, i) =>
                      i === index ? { ...r, [fieldKey]: e.target.value } : r,
                    ),
                  )
                }
                placeholder={channel === "whatsapp" ? "+91 90000 00000" : "name@example.com"}
                disabled={disabled}
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={recipient.enabled !== false}
                  onCheckedChange={(next) =>
                    onChange(recipients.map((r, i) => (i === index ? { ...r, enabled: next } : r)))
                  }
                  disabled={disabled}
                />
                Active
              </label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onChange(recipients.filter((_, i) => i !== index))}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...recipients, createRecipient(channel)])}
        disabled={disabled}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add recipient
      </Button>
    </div>
  );
}

function EventAccordionItem({
  definition,
  value,
  expanded,
  onToggle,
  onChange,
  onRename,
  onDelete,
}) {
  const totalRecipients =
    value.channels.email.recipients.length + value.channels.whatsapp.recipients.length;
  const hasSchedule = definition.schedule?.enabled || value.schedule?.enabled;
  const scheduleTime = value.schedule?.time || "09:00";
  const scheduleFrequency = value.schedule?.frequency || "daily";

  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/30"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Switch
            checked={value.enabled !== false}
            onCheckedChange={(next) => onChange({ ...value, enabled: next })}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">{definition.title}</p>
            <p className="truncate text-xs text-muted-foreground">{definition.description}</p>
            {hasSchedule && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Scheduled: {scheduleFrequency} at {scheduleTime}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={value.channels.email.enabled ? "secondary" : "outline"}>Email</Badge>
          <Badge variant={value.channels.whatsapp.enabled ? "secondary" : "outline"}>
            WhatsApp
          </Badge>
          <Badge variant="outline">{totalRecipients}</Badge>
          {hasSchedule && (
            <Badge variant="default" className="bg-primary/20">
              <Clock className="h-3 w-3 mr-1" />
              Scheduled
            </Badge>
          )}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <CardContent className="space-y-4 border-t border-border/60 pt-4">
          {!definition.builtIn && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-border p-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Event name</Label>
                <Input
                  value={definition.title}
                  onChange={(e) => onRename({ title: e.target.value })}
                />
              </div>
              <div className="flex-[2] space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input
                  value={definition.description}
                  onChange={(e) => onRename({ description: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onDelete}
                title="Delete this event"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Schedule Section */}
          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Schedule</Label>
              </div>
              <Switch
                checked={value.schedule?.enabled || false}
                onCheckedChange={(next) =>
                  onChange({
                    ...value,
                    schedule: { ...value.schedule, enabled: next, time: value.schedule?.time || "09:00", frequency: value.schedule?.frequency || "daily", timezone: value.schedule?.timezone || "UTC+5:30" },
                  })
                }
              />
            </div>

            {value.schedule?.enabled && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={value.schedule?.time || "09:00"}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        schedule: { ...value.schedule, time: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <Select
                    value={value.schedule?.frequency || "daily"}
                    onValueChange={(val) =>
                      onChange({
                        ...value,
                        schedule: { ...value.schedule, frequency: val },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Timezone</Label>
                  <Select
                    value={value.schedule?.timezone || "UTC+5:30"}
                    onValueChange={(val) =>
                      onChange({
                        ...value,
                        schedule: { ...value.schedule, timezone: val },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC-12:00">UTC-12:00</SelectItem>
                      <SelectItem value="UTC-11:00">UTC-11:00</SelectItem>
                      <SelectItem value="UTC-10:00">UTC-10:00</SelectItem>
                      <SelectItem value="UTC-9:00">UTC-9:00</SelectItem>
                      <SelectItem value="UTC-8:00">UTC-8:00</SelectItem>
                      <SelectItem value="UTC-7:00">UTC-7:00</SelectItem>
                      <SelectItem value="UTC-6:00">UTC-6:00</SelectItem>
                      <SelectItem value="UTC-5:00">UTC-5:00</SelectItem>
                      <SelectItem value="UTC-4:00">UTC-4:00</SelectItem>
                      <SelectItem value="UTC-3:00">UTC-3:00</SelectItem>
                      <SelectItem value="UTC-2:00">UTC-2:00</SelectItem>
                      <SelectItem value="UTC-1:00">UTC-1:00</SelectItem>
                      <SelectItem value="UTC+0:00">UTC+0:00</SelectItem>
                      <SelectItem value="UTC+1:00">UTC+1:00</SelectItem>
                      <SelectItem value="UTC+2:00">UTC+2:00</SelectItem>
                      <SelectItem value="UTC+3:00">UTC+3:00</SelectItem>
                      <SelectItem value="UTC+3:30">UTC+3:30</SelectItem>
                      <SelectItem value="UTC+4:00">UTC+4:00</SelectItem>
                      <SelectItem value="UTC+4:30">UTC+4:30</SelectItem>
                      <SelectItem value="UTC+5:00">UTC+5:00</SelectItem>
                      <SelectItem value="UTC+5:30" className="font-semibold">UTC+5:30</SelectItem>
                      <SelectItem value="UTC+5:45">UTC+5:45</SelectItem>
                      <SelectItem value="UTC+6:00">UTC+6:00</SelectItem>
                      <SelectItem value="UTC+6:30">UTC+6:30</SelectItem>
                      <SelectItem value="UTC+7:00">UTC+7:00</SelectItem>
                      <SelectItem value="UTC+8:00">UTC+8:00</SelectItem>
                      <SelectItem value="UTC+8:45">UTC+8:45</SelectItem>
                      <SelectItem value="UTC+9:00">UTC+9:00</SelectItem>
                      <SelectItem value="UTC+9:30">UTC+9:30</SelectItem>
                      <SelectItem value="UTC+10:00">UTC+10:00</SelectItem>
                      <SelectItem value="UTC+10:30">UTC+10:30</SelectItem>
                      <SelectItem value="UTC+11:00">UTC+11:00</SelectItem>
                      <SelectItem value="UTC+12:00">UTC+12:00</SelectItem>
                      <SelectItem value="UTC+13:00">UTC+13:00</SelectItem>
                      <SelectItem value="UTC+14:00">UTC+14:00</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The notification will be sent at this time in the selected timezone.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={value.channels.email.enabled !== false}
                onCheckedChange={(next) =>
                  onChange({
                    ...value,
                    channels: {
                      ...value.channels,
                      email: { ...value.channels.email, enabled: next },
                    },
                  })
                }
              />
              Email
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={value.channels.whatsapp.enabled === true}
                onCheckedChange={(next) =>
                  onChange({
                    ...value,
                    channels: {
                      ...value.channels,
                      whatsapp: { ...value.channels.whatsapp, enabled: next },
                    },
                  })
                }
              />
              WhatsApp
            </label>
          </div>

          <div
            className={cn(
              "grid gap-4",
              (value.channels.email.enabled || value.channels.whatsapp.enabled) && "md:grid-cols-2",
            )}
          >
            {value.channels.email.enabled && (
              <div className="rounded-2xl border border-border/60 p-4">
                <p className="mb-3 font-semibold">Email recipients</p>
                <RecipientList
                  channel="email"
                  recipients={value.channels.email.recipients}
                  onChange={(next) =>
                    onChange({
                      ...value,
                      channels: {
                        ...value.channels,
                        email: { ...value.channels.email, recipients: next },
                      },
                    })
                  }
                />
              </div>
            )}
            {value.channels.whatsapp.enabled && (
              <div className="rounded-2xl border border-border/60 p-4">
                <p className="mb-3 font-semibold">WhatsApp recipients</p>
                <RecipientList
                  channel="whatsapp"
                  recipients={value.channels.whatsapp.recipients}
                  onChange={(next) =>
                    onChange({
                      ...value,
                      channels: {
                        ...value.channels,
                        whatsapp: { ...value.channels.whatsapp, recipients: next },
                      },
                    })
                  }
                />
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function Notifications() {
  const [settings, setSettings] = useState(createDefaultSettings);
  const [activeTab, setActiveTab] = useState("events");
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

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
    saveSettings(settings);
    toast.success("Notification settings saved");
  };

  const updateChannel = (channel, value) => {
    setSettings((current) => ({ ...current, channels: { ...current.channels, [channel]: value } }));
  };

  const updateEventValue = (key, nextValue) => {
    setSettings((current) => ({ ...current, events: { ...current.events, [key]: nextValue } }));
  };

  const renameEvent = (key, patch) => {
    setSettings((current) => ({
      ...current,
      definitions: current.definitions.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    }));
  };

  const addEvent = () => {
    const key = uid();
    setSettings((current) => ({
      ...current,
      definitions: [
        ...current.definitions,
        {
          key,
          title: "New event",
          description: "Describe when this notification fires.",
          builtIn: false,
          schedule: {
            enabled: false,
            time: "09:00",
            frequency: "daily",
            timezone: "UTC+5:30",
          },
        },
      ],
      events: { ...current.events, [key]: createEventSettings() },
    }));
    setExpandedKey(key);
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
          <TabsList className="grid h-auto w-full grid-cols-1 sm:w-auto sm:grid-cols-3">
            <TabsTrigger value="events">Event Setup</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-0 space-y-4">
            <div className="space-y-3">
              {settings.definitions.map((def) => {
                const event = settings.events[def.key];
                if (!event) return null;
                return (
                  <EventAccordionItem
                    key={def.key}
                    definition={def}
                    value={event}
                    expanded={expandedKey === def.key}
                    onToggle={() => setExpandedKey((k) => (k === def.key ? null : def.key))}
                    onChange={(nextValue) => updateEventValue(def.key, nextValue)}
                    onRename={(patch) => renameEvent(def.key, patch)}
                    onDelete={() => deleteEvent(def.key)}
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

          <TabsContent value="channels" className="mt-0 space-y-4">
            <Card className="border-border/60 shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="text-lg">Global channels</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-soft)] text-primary">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold">Email</p>
                        <p className="text-xs text-muted-foreground">Main email channel switch</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.channels.email.enabled}
                      onCheckedChange={(next) =>
                        updateChannel("email", { ...settings.channels.email, enabled: next })
                      }
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-soft)] text-primary">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold">WhatsApp</p>
                        <p className="text-xs text-muted-foreground">
                          Main WhatsApp channel switch
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.channels.whatsapp.enabled}
                      onCheckedChange={(next) =>
                        updateChannel("whatsapp", { ...settings.channels.whatsapp, enabled: next })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="mt-0 space-y-4">
            <Card className="border-border/60 shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-soft)] text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Layout preview</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    How each event is split by channel and recipient list.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.definitions.map((def) => {
                  const event = settings.events[def.key];
                  if (!event) return null;
                  const hasSchedule = event.schedule?.enabled;
                  return (
                    <div key={def.key} className="rounded-2xl border border-border/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{def.title}</p>
                          <p className="text-xs text-muted-foreground">{def.description}</p>
                          {hasSchedule && (
                            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Scheduled: {event.schedule.frequency} at {event.schedule.time} ({event.schedule.timezone})
                            </p>
                          )}
                        </div>
                        <Badge variant={event.enabled ? "secondary" : "outline"}>
                          {event.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Email recipients
                          </p>
                          <div className="mt-2 space-y-1">
                            {event.channels.email.recipients.length ? (
                              event.channels.email.recipients.map((r) => (
                                <p key={r.id} className="text-sm">
                                  {r.name || "Unnamed"} · {r.email || "No email"}
                                </p>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No email recipients added.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            WhatsApp recipients
                          </p>
                          <div className="mt-2 space-y-1">
                            {event.channels.whatsapp.recipients.length ? (
                              event.channels.whatsapp.recipients.map((r) => (
                                <p key={r.id} className="text-sm">
                                  {r.name || "Unnamed"} · {r.phone || "No phone"}
                                </p>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No WhatsApp recipients added.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-3">
          <p className="text-xs text-muted-foreground">Saved locally in the browser only.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSettings(createDefaultSettings())}
          >
            Reset
          </Button>
          <Button type="button" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}