"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  Globe2,
  ImagePlus,
  Lock,
  Mail,
  MessageCircle,
  Plug,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import {
  canPageAction,
  clearAuthSession,
  getActiveFactoryId,
  getActiveMembership,
  getAuthSession,
} from "@/lib/auth";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings - Factrova" }] }),
  component: Settings,
});

const emptySettings = {
  adminProfile: {
    fullName: "",
    role: "Administrator",
    phone: "",
    email: "",
    city: "",
    state: "",
    pincode: "",
    address: "",
    logoUrl: "",
  },
  companyProfile: {
    companyName: "",
    gstin: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    pincode: "",
    address: "",
    logoUrl: "",
  },
  integrations: {
    whatsapp: false,
    email: false,
    platforms: false,
  },
};

function isMeaningfulValue(value) {
  if (typeof value === "boolean") {
    return true;
  }
  if (value === null || value === undefined) {
    return false;
  }
  return String(value).trim() !== "";
}

function mergeSection(fallback, source) {
  return Object.fromEntries(
    Object.entries(fallback).map(([key, fallbackValue]) => {
      const sourceValue = source?.[key];
      return [key, isMeaningfulValue(sourceValue) ? sourceValue : fallbackValue];
    })
  );
}

export function Settings() {
  const canUpdate = canPageAction("settings", "update");
  const [session] = useState(() => getAuthSession());
  const activeMembership = useMemo(() => getActiveMembership(session), [session]);
  const factoryId = useMemo(
    () => getActiveFactoryId() ?? session?.memberships?.[0]?.factory?.id ?? null,
    [session]
  );
  const isStaffMember =
    session?.primaryRole === "staff" ||
    session?.profile?.globalRole === "staff" ||
    activeMembership?.role === "staff";
  const canDeleteOwnAccount = !isStaffMember;
  
  const [settings, setSettings] = useState(emptySettings);
  const [activeTab, setActiveTab] = useState("admin-profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const profileFallback = useMemo(
    () => ({
      fullName: session?.profile?.fullName ?? session?.profile?.name ?? "",
      email: session?.profile?.email ?? "",
      phone: "",
      city: "",
      state: "",
      pincode: "",
      address: "",
      logoUrl: "",
    }),
    [session]
  );

  const loadSettings = useCallback(async () => {
    if (!factoryId) {
      setLoading(false);
      toast.error("No active factory selected");
      return;
    }
    
    setLoading(true);
    try {
      const data = await apiRootRequest(API_PATHS.factories.settings(factoryId));
      setSettings({
        adminProfile: mergeSection(
          { ...emptySettings.adminProfile, ...profileFallback },
          data.adminProfile
        ),
        companyProfile: mergeSection(emptySettings.companyProfile, data.companyProfile),
        integrations: mergeSection(emptySettings.integrations, data.integrations),
      });
    } catch (error) {
      setSettings((current) => ({
        ...current,
        adminProfile: mergeSection(current.adminProfile, profileFallback),
      }));
      toast.error(error instanceof Error ? error.message : "Unable to load settings");
    } finally {
      setLoading(false);
    }
  }, [factoryId, profileFallback]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSection = (section, value) => {
    setSettings((current) => ({ ...current, [section]: value }));
  };

  const save = async () => {
    if (!canUpdate) {
      toast.error("You do not have permission to update settings");
      return;
    }
    if (!factoryId) {
      toast.error("No active factory selected");
      return;
    }
    
    setSaving(true);
    try {
      if (activeTab === "admin-profile") {
        await apiRootRequest(API_PATHS.factories.adminProfile(factoryId), {
          method: "POST",
          body: {
            adminProfile: settings.adminProfile,
          },
        });
        toast.success("Admin profile saved successfully");
        await loadSettings();
        return;
      }
      
      await apiRootRequest(API_PATHS.factories.settings(factoryId), {
        method: "PUT",
        body: settings,
      });
      toast.success("Settings saved successfully");
      await loadSettings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await apiRootRequest(API_PATHS.auth.deleteAccount, {
        method: "DELETE",
        body: {
          reason: deleteReason.trim() || "Deleted from settings",
        },
      });
      toast.success("Account deleted successfully");
      clearAuthSession();
      setDeleteDialogOpen(false);
      window.location.assign("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete account");
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-1 sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="admin-profile">Admin Profile</TabsTrigger>
          <TabsTrigger value="company-profile">Factory Profile</TabsTrigger>
          <TabsTrigger value="password-settings">Password Settings</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="admin-profile" className="mt-0">
          <SettingsPanel title="Admin Profile" icon={<UserRound className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Full Name"
                value={settings.adminProfile.fullName}
                onChange={(value) =>
                  updateSection("adminProfile", {
                    ...settings.adminProfile,
                    fullName: value,
                  })
                }
              />
              <Field
                label="Role"
                value={settings.adminProfile.role}
                onChange={(value) =>
                  updateSection("adminProfile", {
                    ...settings.adminProfile,
                    role: value,
                  })
                }
              />
              <Field
                label="Phone"
                value={settings.adminProfile.phone}
                onChange={(value) =>
                  updateSection("adminProfile", {
                    ...settings.adminProfile,
                    phone: value,
                  })
                }
              />
              <Field
                label="Email"
                type="email"
                value={settings.adminProfile.email}
                onChange={(value) =>
                  updateSection("adminProfile", {
                    ...settings.adminProfile,
                    email: value,
                  })
                }
              />
              <Field
                label="City"
                value={settings.adminProfile.city}
                onChange={(value) =>
                  updateSection("adminProfile", {
                    ...settings.adminProfile,
                    city: value,
                  })
                }
              />
              <Field
                label="State"
                value={settings.adminProfile.state}
                onChange={(value) =>
                  updateSection("adminProfile", {
                    ...settings.adminProfile,
                    state: value,
                  })
                }
              />
              <Field
                label="Pincode"
                value={settings.adminProfile.pincode}
                onChange={(value) =>
                  updateSection("adminProfile", {
                    ...settings.adminProfile,
                    pincode: value,
                  })
                }
              />
              <LogoField />
            </div>
            <AddressField
              label="Address"
              value={settings.adminProfile.address}
              onChange={(value) =>
                updateSection("adminProfile", {
                  ...settings.adminProfile,
                  address: value,
                })
              }
            />
            <FormActions onSave={save} saving={saving} disabled={loading || !canUpdate} />
          </SettingsPanel>

          {canDeleteOwnAccount && (
            <Card className="mt-4 border-red-200 shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-row items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-red-700">Delete Account</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This performs a soft delete. If a factory admin deletes this account, all users
                    under that factory will also be deactivated and sign-in access will stop
                    immediately.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Staff and team member accounts do not see this action. Factory admin delete will
                  deactivate the full factory user group.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete account
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="company-profile" className="mt-0">
          <SettingsPanel title="Factory Profile" icon={<Building2 className="h-5 w-5" />}>
            <p className="text-sm text-muted-foreground">
              Updating the factory name here will also update the main factory display name across
              the app.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Factory Name"
                value={settings.companyProfile.companyName}
                onChange={(value) =>
                  updateSection("companyProfile", {
                    ...settings.companyProfile,
                    companyName: value,
                  })
                }
              />
              <Field
                label="GSTIN"
                value={settings.companyProfile.gstin}
                onChange={(value) =>
                  updateSection("companyProfile", {
                    ...settings.companyProfile,
                    gstin: value,
                  })
                }
              />
              <Field
                label="Phone"
                value={settings.companyProfile.phone}
                onChange={(value) =>
                  updateSection("companyProfile", {
                    ...settings.companyProfile,
                    phone: value,
                  })
                }
              />
              <Field
                label="Email"
                type="email"
                value={settings.companyProfile.email}
                onChange={(value) =>
                  updateSection("companyProfile", {
                    ...settings.companyProfile,
                    email: value,
                  })
                }
              />
              <Field
                label="City"
                value={settings.companyProfile.city}
                onChange={(value) =>
                  updateSection("companyProfile", {
                    ...settings.companyProfile,
                    city: value,
                  })
                }
              />
              <Field
                label="State"
                value={settings.companyProfile.state}
                onChange={(value) =>
                  updateSection("companyProfile", {
                    ...settings.companyProfile,
                    state: value,
                  })
                }
              />
              <Field
                label="Pincode"
                value={settings.companyProfile.pincode}
                onChange={(value) =>
                  updateSection("companyProfile", {
                    ...settings.companyProfile,
                    pincode: value,
                  })
                }
              />
              <LogoField />
            </div>
            <AddressField
              label="Address"
              value={settings.companyProfile.address}
              onChange={(value) =>
                updateSection("companyProfile", {
                  ...settings.companyProfile,
                  address: value,
                })
              }
            />
            <FormActions onSave={save} saving={saving} disabled={loading || !canUpdate} />
          </SettingsPanel>
        </TabsContent>

        <TabsContent value="password-settings" className="mt-0">
          <SettingsPanel title="Password Settings" icon={<Lock className="h-5 w-5" />}>
            <p className="text-sm text-muted-foreground">
              Password changes should be handled through your auth provider or a dedicated password
              API.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Current Password" type="password" value="" readOnly />
              <Field label="New Password" type="password" value="" readOnly />
              <Field label="Confirm Password" type="password" value="" readOnly />
            </div>
            <FormActions onSave={save} saving={saving} disabled={true} />
          </SettingsPanel>
        </TabsContent>

        <TabsContent value="integrations" className="mt-0">
          <SettingsPanel title="Integrations" icon={<Plug className="h-5 w-5" />}>
            <div className="grid gap-4 xl:grid-cols-3">
              <IntegrationCard
                title="WhatsApp"
                icon={<MessageCircle className="h-5 w-5" />}
                enabled={settings.integrations.whatsapp}
                disabled={!canUpdate}
                onToggle={(value) =>
                  updateSection("integrations", {
                    ...settings.integrations,
                    whatsapp: value,
                  })
                }
              />
              <IntegrationCard
                title="Email"
                icon={<Mail className="h-5 w-5" />}
                enabled={settings.integrations.email}
                disabled={!canUpdate}
                onToggle={(value) =>
                  updateSection("integrations", {
                    ...settings.integrations,
                    email: value,
                  })
                }
              />
              <IntegrationCard
                title="Platforms"
                icon={<Globe2 className="h-5 w-5" />}
                enabled={settings.integrations.platforms}
                disabled={!canUpdate}
                onToggle={(value) =>
                  updateSection("integrations", {
                    ...settings.integrations,
                    platforms: value,
                  })
                }
              />
            </div>
            <FormActions onSave={save} saving={saving} disabled={loading || !canUpdate} />
          </SettingsPanel>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This is a soft delete. Existing records stay in the system. If this is a factory admin
              account, all users in that factory will also be deactivated, and you will be signed out
              immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              rows={3}
              placeholder="Optional reason for deleting this account"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingAccount}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? "Deleting..." : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function SettingsPanel({ title, icon, children }) {
  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[image:var(--gradient-soft)] text-primary">
          {icon}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, type = "text", readOnly = false }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  );
}

function AddressField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
      />
    </div>
  );
}

function LogoField() {
  return (
    <div className="space-y-1.5">
      <Label>Logo</Label>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <ImagePlus className="h-5 w-5" />
        </div>
        <Input type="file" accept="image/*" />
      </div>
    </div>
  );
}

function IntegrationCard({ title, icon, enabled, onToggle, disabled }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-background text-primary">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">
              {enabled ? "Connected" : "Disconnected"}
            </p>
          </div>
        </div>
        <Button
          disabled={disabled}
          variant="outline"
          size="sm"
          type="button"
          onClick={() => onToggle(!enabled)}
        >
          {enabled ? "Disable" : "Connect"}
        </Button>
      </div>
    </div>
  );
}

function FormActions({ saving, disabled, onSave }) {
  return (
    <div className="flex justify-end border-t border-border/70 pt-4">
      <Button type="button" onClick={onSave} disabled={disabled || saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
