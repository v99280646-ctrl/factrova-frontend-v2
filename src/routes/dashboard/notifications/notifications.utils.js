export const SCHEDULE_WORKING_DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export const DEFAULT_EVENT_DEFINITIONS = [
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
      workingDays: SCHEDULE_WORKING_DAYS.map((day) => day.key),
    },
  },
  {
    key: "stockAlerts",
    title: "Stock alerts",
    description: "Notify when stock reaches the insufficient level.",
    builtIn: true,
  },
  {
    key: "inventoryMessages",
    title: "Inventory messages",
    description: "Share stock usage, inventory changes, waste notes, and stock reminders.",
    builtIn: true,
    thresholds: [100],
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

export function createRecipient(type = "email") {
  return type === "whatsapp"
    ? { id: uid(), name: "", countryCode: "+91", phone: "", enabled: true }
    : { id: uid(), name: "", email: "", enabled: true };
}

function createEventSettings(definition) {
  const settings = {
    enabled: true,
    channels: {
      email: { enabled: true, recipients: [createRecipient("email")] },
      whatsapp: { enabled: false, recipients: [] },
    },
  };

  if (definition.key === "inventoryMessages") {
    settings.thresholds = Array.isArray(definition.thresholds) && definition.thresholds.length
      ? definition.thresholds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value >= 0)
      : [100, 50];
  }

  if (definition.schedule) {
    settings.schedule = {
      enabled: definition.schedule.enabled !== undefined ? definition.schedule.enabled : true,
      time: definition.schedule.time || "09:00",
      frequency: definition.schedule.frequency || "daily",
      timezone: definition.schedule.timezone || "GMT+5:30",
      workingDays:
        Array.isArray(definition.schedule.workingDays) && definition.schedule.workingDays.length
          ? definition.schedule.workingDays
          : SCHEDULE_WORKING_DAYS.map((day) => day.key),
    };
  }

  return settings;
}

export function createDefaultSettings() {
  const events = {};
  for (const def of DEFAULT_EVENT_DEFINITIONS) {
    events[def.key] = createEventSettings(def);
  }
  return {
    channels: {
      email: { enabled: true },
      whatsapp: { enabled: false },
    },
    definitions: DEFAULT_EVENT_DEFINITIONS,
    events,
  };
}

function cloneDefinition(definition) {
  return {
    key: definition.key,
    title: definition.title,
    description: definition.description || "",
    builtIn: definition.builtIn !== false,
    ...(definition.schedule ? { schedule: { ...definition.schedule } } : {}),
  };
}

export function mergeWithDefaults(input) {
  const defaults = createDefaultSettings();

  const inputDefinitions = Array.isArray(input?.definitions) ? input.definitions : [];
  const defsByKey = new Map();
  for (const def of defaults.definitions) {
    defsByKey.set(def.key, {
      ...def,
      schedule: def.schedule ? { ...def.schedule } : undefined,
    });
  }
  for (const def of inputDefinitions) {
    if (!def?.key) continue;
    const existing = defsByKey.get(def.key);
    defsByKey.set(def.key, {
      ...(existing || {}),
      ...def,
      schedule:
        existing?.schedule || def.schedule
          ? { ...(existing?.schedule || {}), ...(def.schedule || {}) }
          : undefined,
    });
  }
  const definitions = [...defsByKey.values()].map(cloneDefinition);

  const events = {};
  for (const def of definitions) {
    const current = input?.events?.[def.key] || {};

    const emailRecipients =
      Array.isArray(current?.channels?.email?.recipients) &&
      current.channels.email.recipients.length > 0
        ? current.channels.email.recipients.map((r) => ({ id: r.id ?? uid(), ...r }))
        : [createRecipient("email")];

    const whatsappRecipients =
      Array.isArray(current?.channels?.whatsapp?.recipients) &&
      current.channels.whatsapp.recipients.length > 0
        ? current.channels.whatsapp.recipients.map((r) => ({
            id: r.id ?? uid(),
            name: r.name || "",
            countryCode: r.countryCode || "+91",
            phone: r.phone || "",
            enabled: r.enabled !== false,
          }))
        : [];

    const eventSettings = {
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
    };

    if (def.key === "inventoryMessages" || current?.thresholds !== undefined) {
      const nextThresholds = Array.isArray(current?.thresholds) && current.thresholds.length
        ? current.thresholds
        : Array.isArray(def.thresholds) && def.thresholds.length
          ? def.thresholds
          : [100, 50];
      eventSettings.thresholds = [...new Set(
        nextThresholds
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value >= 0)
      )].sort((a, b) => b - a);
    }

    if (def.schedule) {
      const currentSchedule = current.schedule || {};
      eventSettings.schedule = {
        enabled:
          currentSchedule.enabled !== undefined ? currentSchedule.enabled : def.schedule.enabled,
        time: currentSchedule.time || def.schedule.time || "09:00",
        frequency: currentSchedule.frequency || def.schedule.frequency || "daily",
        timezone: currentSchedule.timezone || def.schedule.timezone || "GMT+5:30",
        workingDays:
          Array.isArray(currentSchedule.workingDays) && currentSchedule.workingDays.length
            ? currentSchedule.workingDays
            : Array.isArray(def.schedule.workingDays) && def.schedule.workingDays.length
              ? def.schedule.workingDays
              : SCHEDULE_WORKING_DAYS.map((day) => day.key),
      };
    }

    events[def.key] = eventSettings;
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

export function formatHistoryDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function getHistoryStatusStyle(status) {
  const map = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    cancelled: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    skipped: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[status] || map.sent;
}

export function formatRecipientLabel(recipient) {
  if (!recipient) return "-";
  if (recipient.email) return recipient.email;
  if (recipient.phone) return `${recipient.countryCode || "+91"} ${recipient.phone}`.trim();
  return recipient.name || "-";
}

export function historyEventTitle(settings, eventKey) {
  return (
    settings.definitions.find((definition) => definition.key === eventKey)?.title || eventKey || "-"
  );
}
