"use client";

import { Mail, Send, Users, Calendar, Tag, FileText, Eye, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatHistoryDate, formatRecipientLabel, getHistoryStatusStyle, historyEventTitle } from "./notifications.utils";
import { cn } from "@/lib/utils";

function getPreviewContent(selectedHistory) {
  const rawText = String(selectedHistory?.previewText || selectedHistory?.message || "").trim();
  const summary = selectedHistory?.summary || {};
  const isWhatsApp = selectedHistory?.channel === "whatsapp";

  if (!isWhatsApp) {
    return rawText;
  }

  try {
    if (!rawText && Object.keys(summary).length) {
      const machineLines = [
        `Daily update for ${selectedHistory?.meta?.date || "today"}`,
        `Projects Worked: ${summary.projectsWorked ?? 0}`,
        `Projects Created: ${summary.projectsCreatedToday ?? 0}`,
        `Projects Delivered: ${summary.projectsDeliveredToday ?? 0}`,
        `Pressing: ${summary.pressingSheets ?? 0} sheets`,
        `Cutting: ${summary.cuttingSheets ?? 0} sheets`,
        `Edgebanding: ${summary.edgebandingSheets ?? 0} meters`,
        `Boring: ${summary.boringSheets ?? 0} holes`,
      ];
      return machineLines.join("\n");
    }

    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message.trim();
      }
      if (typeof parsed.body === "string" && parsed.body.trim()) {
        return parsed.body.trim();
      }
      if (Array.isArray(parsed.params) && parsed.params.length) {
        return parsed.params.map((value, index) => `${index + 1}. ${String(value)}`).join("\n");
      }
    }
  }
  catch {
    if (rawText) {
      return rawText;
    }
  }

  return rawText || "";
}

export function NotificationPreviewDialog({
  open,
  onOpenChange,
  selectedHistory,
  settings,
}) {
  const isWhatsApp = selectedHistory?.channel === "whatsapp";
  const previewContent = getPreviewContent(selectedHistory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6 border-b bg-muted/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isWhatsApp ? (
                <MessageCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <Mail className="h-5 w-5 text-primary" />
              )}
              {isWhatsApp ? "WhatsApp preview" : "Email preview"}
            </DialogTitle>
            <DialogDescription>
              Review the subject, recipients, and message body captured in the history log.
            </DialogDescription>
          </DialogHeader>
        </div>

        {selectedHistory ? (
          <div className="p-6">
            {/* Compact header with key info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Event</p>
                <p className="mt-1 font-semibold text-sm truncate">{historyEventTitle(settings, selectedHistory.eventKey)}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Subject</p>
                <p className="mt-1 font-medium text-sm truncate">{selectedHistory.subject || selectedHistory.title || "-"}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Channel</p>
                <Badge variant="secondary" className="mt-1 capitalize">
                  {selectedHistory.channel || "-"}
                </Badge>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <Badge className={cn("mt-1", getHistoryStatusStyle(selectedHistory.status))}>
                  <span className="capitalize">{selectedHistory.status || "sent"}</span>
                </Badge>
              </div>
            </div>

            {/* Main layout: Email Preview takes priority */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left sidebar - Meta info (1/4) */}
              <div className="lg:col-span-1 space-y-4">
                {/* Sent at */}
                <div className="bg-muted/20 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Sent at
                  </p>
                  <p className="mt-2 font-medium">{formatHistoryDate(selectedHistory.sentAt || selectedHistory.createdAt)}</p>
                </div>

                {/* Recipients */}
                {Array.isArray(selectedHistory.recipients) && selectedHistory.recipients.length > 0 && (
                  <div className="bg-muted/20 rounded-lg p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Recipients ({selectedHistory.recipients.length})
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedHistory.recipients.map((recipient, index) => (
                        <Badge key={`${recipient.email || recipient.phone || index}`} variant="outline" className="text-xs">
                          {formatRecipientLabel(recipient)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary Stats - Compact */}
                {selectedHistory.summary && (
                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Summary
                    </p>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Projects</span>
                        <span className="font-bold">{selectedHistory.summary.projectsWorked ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Sheets</span>
                        <span className="font-bold">{selectedHistory.summary.totalSheetsWorked ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Usage entries</span>
                        <span className="font-bold">{selectedHistory.summary.totalUsageEntries ?? 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right main content - Email Preview (3/4) */}
              <div className="lg:col-span-3">
                <div className="bg-white dark:bg-gray-950 rounded-lg border shadow-sm h-full">
                  <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      {isWhatsApp ? "WhatsApp message" : "Email preview"}
                    </p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {selectedHistory.channel || "email"}
                    </Badge>
                  </div>
                  <div className="p-6 max-h-[550px] overflow-y-auto">
                    {selectedHistory.previewHtml ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: selectedHistory.previewHtml }} 
                        className="prose prose-sm max-w-none dark:prose-invert"
                      />
                    ) : (
                      <div
                        className={cn(
                          "whitespace-pre-wrap rounded-lg p-4 text-sm",
                          isWhatsApp
                            ? "border border-emerald-200 bg-emerald-50 font-medium text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-50"
                            : "bg-muted/10 font-mono text-muted-foreground",
                        )}
                      >
                        {previewContent || "No preview available."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function NotificationSendConfirmDialog({
  open,
  onOpenChange,
  eventTitle,
  channelOptions = [],
  selectedChannels = [],
  onSelectedChannelsChange,
  isSending,
  onConfirm,
}) {
  const toggleChannel = (channelKey, checked) => {
    const next = checked
      ? [...selectedChannels, channelKey]
      : selectedChannels.filter((item) => item !== channelKey);
    onSelectedChannelsChange?.([...new Set(next)]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Send notification now?
          </DialogTitle>
          <DialogDescription>
            This will immediately send the selected event to its configured recipients and add a history record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Event</p>
            <p className="mt-1 font-semibold">{eventTitle || "-"}</p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Send channels</p>
            <div className="mt-3 space-y-2">
              {channelOptions.map((option) => {
                const checked = selectedChannels.includes(option.key);
                return (
                  <label
                    key={option.key}
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => toggleChannel(option.key, Boolean(next))}
                      disabled={!option.enabled}
                    />
                    {option.key === "whatsapp" ? (
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Mail className="h-4 w-4 text-blue-600" />
                    )}
                    <span className="font-medium">{option.label}</span>
                    {!option.enabled && (
                      <span className="ml-auto text-xs text-muted-foreground">Disabled</span>
                    )}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Select one or more channels to send now.
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Delivery note
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Selected channels will run now if they are configured and have recipients.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={Boolean(isSending) || selectedChannels.length === 0}>
            {isSending ? "Sending..." : "Confirm send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
