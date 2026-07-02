"use client";

import { ChevronDown, Clock, Plus, Send, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_CODES } from "@/utils/countryCodes";
import { SCHEDULE_WORKING_DAYS, createRecipient } from "./notifications.utils";

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
            className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-3"
          >
            <div className="grid gap-3 md:grid-cols-2">
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
              {channel === "whatsapp" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone Number</Label>
                  <div className="flex gap-2">
                    <Select
                      value={recipient.countryCode || "+91"}
                      onValueChange={(value) =>
                        onChange(
                          recipients.map((r, i) =>
                            i === index ? { ...r, countryCode: value } : r,
                          ),
                        )
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-[120px] shrink-0">
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {COUNTRY_CODES.map(({ code, country }) => (
                          <SelectItem key={code} value={code}>
                            {code} ({country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={recipient.phone || ""}
                      onChange={(e) =>
                        onChange(
                          recipients.map((r, i) =>
                            i === index ? { ...r, phone: e.target.value } : r,
                          ),
                        )
                      }
                      placeholder="90000 00000"
                      disabled={disabled}
                      className="flex-1"
                    />
                  </div>
                </div>
              ) : (
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
                    placeholder="name@example.com"
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
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

function formatWorkingDays(days = []) {
  const labels = SCHEDULE_WORKING_DAYS.filter((day) => days.includes(day.key)).map((day) => day.label);
  if (!labels.length) return "No days selected";
  if (labels.length === 7) return "Every day";
  return labels.join(", ");
}

export function NotificationEventCard({
  definition,
  value,
  expanded,
  onToggle,
  onChange,
  onRename,
  onDelete,
  onSendNow,
  sendNowLoading,
}) {
  const totalRecipients =
    value.channels.email.recipients.length + value.channels.whatsapp.recipients.length;

  const hasSchedule = !!definition.schedule;
  const isScheduleEnabled = hasSchedule && value.schedule?.enabled;
  const scheduleTime = value.schedule?.time || "09:00";
  const scheduleFrequency = value.schedule?.frequency || "daily";
  const scheduleTimezone = value.schedule?.timezone || "GMT+5:30";
  const scheduleWorkingDays = Array.isArray(value.schedule?.workingDays) && value.schedule.workingDays.length
    ? value.schedule.workingDays
    : SCHEDULE_WORKING_DAYS.map((day) => day.key);
  const inventoryThresholds = Array.isArray(value.thresholds) && value.thresholds.length
    ? [...new Set(
        value.thresholds
          .map((threshold) => Number(threshold))
          .filter((threshold) => Number.isFinite(threshold) && threshold >= 0)
      )].sort((a, b) => b - a)
    : [];

  return (
    <Card className="overflow-hidden border-border/60 shadow-[var(--shadow-card)]">
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
            {isScheduleEnabled && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Scheduled: {scheduleFrequency} at {scheduleTime} ({scheduleTimezone}) · {formatWorkingDays(scheduleWorkingDays)}
              </p>
            )}
            {definition.key === "inventoryMessages" && inventoryThresholds.length > 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Tag className="h-3 w-3" />
                Stock reminders: {inventoryThresholds.join(", ")}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onSendNow?.(definition.key);
            }}
            disabled={Boolean(sendNowLoading)}
          >
            <Send className="h-3.5 w-3.5" />
            {sendNowLoading ? "Sending..." : "Send now"}
          </Button>
          {isScheduleEnabled && (
            <Badge variant="default" className="bg-primary/20">
              <Clock className="mr-1 h-3 w-3" />
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
                <Input value={definition.title} onChange={(e) => onRename({ title: e.target.value })} />
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

          {hasSchedule && (
            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">Schedule Settings</Label>
                </div>
                <Switch
                  checked={value.schedule?.enabled || false}
                  onCheckedChange={(next) => {
                    const currentSchedule = value.schedule || {
                      time: "09:00",
                      frequency: "daily",
                      timezone: "GMT+5:30",
                    };
                    onChange({
                      ...value,
                      schedule: {
                        ...currentSchedule,
                        enabled: next,
                      },
                    });
                  }}
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
                          schedule: {
                            ...value.schedule,
                            time: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Working days</Label>
                    <div className="flex flex-wrap gap-2">
                      {SCHEDULE_WORKING_DAYS.map((day) => {
                        const active = scheduleWorkingDays.includes(day.key);
                        return (
                          <Button
                            key={day.key}
                            type="button"
                            variant={active ? "default" : "outline"}
                            size="sm"
                            className="h-8 px-3"
                            onClick={() =>
                              onChange({
                                ...value,
                                schedule: {
                                  ...value.schedule,
                                  workingDays: active
                                    ? scheduleWorkingDays.filter((key) => key !== day.key)
                                    : [...scheduleWorkingDays, day.key],
                                },
                              })
                            }
                          >
                            {day.label}
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Disabled days will be skipped by the scheduler.
                    </p>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">Timezone</Label>
                    <Select
                      value={value.schedule?.timezone || "GMT+5:30"}
                      onValueChange={(val) =>
                        onChange({
                          ...value,
                          schedule: {
                            ...value.schedule,
                            timezone: val,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GMT-12:00">GMT-12:00</SelectItem>
                        <SelectItem value="GMT-11:00">GMT-11:00</SelectItem>
                        <SelectItem value="GMT-10:00">GMT-10:00</SelectItem>
                        <SelectItem value="GMT-9:00">GMT-9:00</SelectItem>
                        <SelectItem value="GMT-8:00">GMT-8:00</SelectItem>
                        <SelectItem value="GMT-7:00">GMT-7:00</SelectItem>
                        <SelectItem value="GMT-6:00">GMT-6:00</SelectItem>
                        <SelectItem value="GMT-5:00">GMT-5:00</SelectItem>
                        <SelectItem value="GMT-4:00">GMT-4:00</SelectItem>
                        <SelectItem value="GMT-3:00">GMT-3:00</SelectItem>
                        <SelectItem value="GMT-2:00">GMT-2:00</SelectItem>
                        <SelectItem value="GMT-1:00">GMT-1:00</SelectItem>
                        <SelectItem value="GMT+0:00">GMT+0:00</SelectItem>
                        <SelectItem value="GMT+1:00">GMT+1:00</SelectItem>
                        <SelectItem value="GMT+2:00">GMT+2:00</SelectItem>
                        <SelectItem value="GMT+3:00">GMT+3:00</SelectItem>
                        <SelectItem value="GMT+3:30">GMT+3:30</SelectItem>
                        <SelectItem value="GMT+4:00">GMT+4:00</SelectItem>
                        <SelectItem value="GMT+4:30">GMT+4:30</SelectItem>
                        <SelectItem value="GMT+5:00">GMT+5:00</SelectItem>
                        <SelectItem value="GMT+5:30" className="font-semibold">
                          GMT+5:30
                        </SelectItem>
                        <SelectItem value="GMT+5:45">GMT+5:45</SelectItem>
                        <SelectItem value="GMT+6:00">GMT+6:00</SelectItem>
                        <SelectItem value="GMT+6:30">GMT+6:30</SelectItem>
                        <SelectItem value="GMT+7:00">GMT+7:00</SelectItem>
                        <SelectItem value="GMT+8:00">GMT+8:00</SelectItem>
                        <SelectItem value="GMT+8:45">GMT+8:45</SelectItem>
                        <SelectItem value="GMT+9:00">GMT+9:00</SelectItem>
                        <SelectItem value="GMT+9:30">GMT+9:30</SelectItem>
                        <SelectItem value="GMT+10:00">GMT+10:00</SelectItem>
                        <SelectItem value="GMT+10:30">GMT+10:30</SelectItem>
                        <SelectItem value="GMT+11:00">GMT+11:00</SelectItem>
                        <SelectItem value="GMT+12:00">GMT+12:00</SelectItem>
                        <SelectItem value="GMT+13:00">GMT+13:00</SelectItem>
                        <SelectItem value="GMT+14:00">GMT+14:00</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The notification will be sent at this time in the selected timezone.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {definition.key === "inventoryMessages" && (
            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Stock reminder thresholds</Label>
              </div>
              <div className="space-y-3">
                {inventoryThresholds.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                    No reminder thresholds yet. Add values like 100 or 50 to send inventory reminders when stock falls to those levels.
                  </div>
                ) : (
                  inventoryThresholds.map((threshold, index) => (
                    <div key={`${definition.key}-threshold-${index}`} className="flex items-end gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs">Reminder threshold #{index + 1}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={threshold}
                          onChange={(e) => {
                            const nextThresholds = [...inventoryThresholds];
                            nextThresholds[index] = Math.max(0, Number(e.target.value) || 0);
                            onChange({
                              ...value,
                              thresholds: nextThresholds,
                            });
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          onChange({
                            ...value,
                            thresholds: inventoryThresholds.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  <span>Send reminder when stock becomes less than or equal to any threshold below.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onChange({
                        ...value,
                        thresholds: [...inventoryThresholds, 0],
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add threshold
                  </Button>
                </div>
              </div>
            </div>
          )}

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
