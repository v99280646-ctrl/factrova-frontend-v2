import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Globe2,
  ImagePlus,
  Lock,
  Mail,
  MessageCircle,
  Plug,
  Save,
  UserRound,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { canPageAction, getActiveFactoryId, getAuthSession } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings - Factrova" }] }),
  component: Settings,
});

type SettingsPayload = {
  adminProfile: {
    fullName: string;
    role: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    pincode: string;
    address: string;
    logoUrl: string;
  };
  companyProfile: {
    companyName: string;
    gstin: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    pincode: string;
    address: string;
    logoUrl: string;
  };
  integrations: {
    whatsapp: boolean;
    email: boolean;
    platforms: boolean;
  };
};

const emptySettings: SettingsPayload = {
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

function isMeaningfulValue(value: unknown) {
  if (typeof value === "boolean") {
    return true;
  }

  if (value === null || value === undefined) {
    return false;
  }

  return String(value).trim() !== "";
}

function mergeSection<T extends Record<string, unknown>>(fallback: T, source?: Partial<T>) {
  return Object.fromEntries(
    Object.entries(fallback).map(([key, fallbackValue]) => {
      const sourceValue = source?.[key as keyof T];
      return [key, isMeaningfulValue(sourceValue) ? sourceValue : fallbackValue];
    }),
  ) as T;
}

function Settings() {
  const canUpdate = canPageAction("settings", "update");
  const factoryId = getActiveFactoryId() ?? getAuthSession()?.memberships[0]?.factory?.id ?? null;
  const [settings, setSettings] = useState<SettingsPayload>(emptySettings);
  const [activeTab, setActiveTab] = useState("admin-profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const session = getAuthSession();
    if (!factoryId) {
      setLoading(false);
      toast.error("No active factory selected");
      return;
    }

    setLoading(true);
    try {
      const data = await apiRootRequest<SettingsPayload>(API_PATHS.factories.settings(factoryId));
      const profileFallback = {
        fullName: session?.profile.fullName ?? "",
        email: session?.profile.email ?? "",
        phone: "",
        city: "",
        state: "",
        pincode: "",
        address: "",
      };
      setSettings({
        adminProfile: mergeSection(
          { ...emptySettings.adminProfile, ...profileFallback },
          data.adminProfile,
        ),
        companyProfile: mergeSection(emptySettings.companyProfile, data.companyProfile),
        integrations: mergeSection(emptySettings.integrations, data.integrations),
      });
    } catch (error) {
      setSettings((current) => ({
        ...current,
        adminProfile: mergeSection(current.adminProfile, {
          fullName: session?.profile.fullName || current.adminProfile.fullName,
          email: session?.profile.email || current.adminProfile.email,
        }),
      }));
      toast.error(error instanceof Error ? error.message : "Unable to load settings");
    } finally {
      setLoading(false);
    }
  }, [factoryId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateSection = <K extends keyof SettingsPayload>(
    section: K,
    value: SettingsPayload[K],
  ) => {
    setSettings((current) => ({ ...current, [section]: value }));
  };

  const save = async () => {
    if (!canUpdate) return toast.error("You do not have permission to update settings");
    if (!factoryId) {
      toast.error("No active factory selected");
      return;
    }

    setSaving(true);
    try {
      if (activeTab === "admin-profile") {
        await toast.promise(
          apiRootRequest(API_PATHS.factories.adminProfile(factoryId), {
            method: "POST",
            body: {
              adminProfile: settings.adminProfile,
            },
          }),
          {
            loading: "Saving admin profile...",
            success: "Admin profile saved successfully",
            error: (error) =>
              error instanceof Error ? error.message : "Unable to save admin profile",
          },
        );
        await loadSettings();
        return;
      }

      await toast.promise(
        apiRootRequest(API_PATHS.factories.settings(factoryId), {
          method: "PUT",
          body: settings,
        }),
        {
          loading: "Saving settings...",
          success: "Settings saved successfully",
          error: (error) => (error instanceof Error ? error.message : "Unable to save settings"),
        },
      );
      await loadSettings();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-1 sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="admin-profile">Admin Profile</TabsTrigger>
          <TabsTrigger value="company-profile">Company Profile</TabsTrigger>
          <TabsTrigger value="password-settings">Password Settings</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        <TabsContent value="admin-profile" className="mt-0">
          <SettingsPanel title="Admin Profile" icon={<UserRound className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Full Name"
                value={settings.adminProfile.fullName}
                onChange={(v) =>
                  updateSection("adminProfile", { ...settings.adminProfile, fullName: v })
                }
              />
              <Field
                label="Role"
                value={settings.adminProfile.role}
                onChange={(v) =>
                  updateSection("adminProfile", { ...settings.adminProfile, role: v })
                }
              />
              <Field
                label="Phone"
                value={settings.adminProfile.phone}
                onChange={(v) =>
                  updateSection("adminProfile", { ...settings.adminProfile, phone: v })
                }
              />
              <Field
                label="Email"
                type="email"
                value={settings.adminProfile.email}
                onChange={(v) =>
                  updateSection("adminProfile", { ...settings.adminProfile, email: v })
                }
              />
              <Field
                label="City"
                value={settings.adminProfile.city}
                onChange={(v) =>
                  updateSection("adminProfile", { ...settings.adminProfile, city: v })
                }
              />
              <Field
                label="State"
                value={settings.adminProfile.state}
                onChange={(v) =>
                  updateSection("adminProfile", { ...settings.adminProfile, state: v })
                }
              />
              <Field
                label="Pincode"
                value={settings.adminProfile.pincode}
                onChange={(v) =>
                  updateSection("adminProfile", { ...settings.adminProfile, pincode: v })
                }
              />
              <Field label="Profile Logo" type="file" value="" readOnly />
            </div>
            <AddressField
              label="Address"
              value={settings.adminProfile.address}
              onChange={(v) =>
                updateSection("adminProfile", { ...settings.adminProfile, address: v })
              }
            />
            <FormActions onSave={save} saving={saving} disabled={loading || !canUpdate} />
          </SettingsPanel>
        </TabsContent>

        <TabsContent value="company-profile" className="mt-0">
          <SettingsPanel title="Company Profile" icon={<Building2 className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Company Name"
                value={settings.companyProfile.companyName}
                onChange={(v) =>
                  updateSection("companyProfile", { ...settings.companyProfile, companyName: v })
                }
              />
              <Field
                label="GSTIN"
                value={settings.companyProfile.gstin}
                onChange={(v) =>
                  updateSection("companyProfile", { ...settings.companyProfile, gstin: v })
                }
              />
              <Field
                label="Phone"
                value={settings.companyProfile.phone}
                onChange={(v) =>
                  updateSection("companyProfile", { ...settings.companyProfile, phone: v })
                }
              />
              <Field
                label="Email"
                type="email"
                value={settings.companyProfile.email}
                onChange={(v) =>
                  updateSection("companyProfile", { ...settings.companyProfile, email: v })
                }
              />
              <Field
                label="City"
                value={settings.companyProfile.city}
                onChange={(v) =>
                  updateSection("companyProfile", { ...settings.companyProfile, city: v })
                }
              />
              <Field
                label="State"
                value={settings.companyProfile.state}
                onChange={(v) =>
                  updateSection("companyProfile", { ...settings.companyProfile, state: v })
                }
              />
              <Field
                label="Pincode"
                value={settings.companyProfile.pincode}
                onChange={(v) =>
                  updateSection("companyProfile", { ...settings.companyProfile, pincode: v })
                }
              />
              <LogoField />
            </div>
            <AddressField
              label="Address"
              value={settings.companyProfile.address}
              onChange={(v) =>
                updateSection("companyProfile", { ...settings.companyProfile, address: v })
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
            <FormActions onSave={save} saving={saving} disabled />
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
                  updateSection("integrations", { ...settings.integrations, whatsapp: value })
                }
              />
              <IntegrationCard
                title="Email"
                icon={<Mail className="h-5 w-5" />}
                enabled={settings.integrations.email}
                disabled={!canUpdate}
                onToggle={(value) =>
                  updateSection("integrations", { ...settings.integrations, email: value })
                }
              />
              <IntegrationCard
                title="Platforms"
                icon={<Globe2 className="h-5 w-5" />}
                enabled={settings.integrations.platforms}
                disabled={!canUpdate}
                onToggle={(value) =>
                  updateSection("integrations", { ...settings.integrations, platforms: value })
                }
              />
            </div>
            <FormActions onSave={save} saving={saving} disabled={loading || !canUpdate} />
          </SettingsPanel>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

function SettingsPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
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

function AddressField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
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

function IntegrationCard({
  title,
  icon,
  enabled,
  onToggle,
  disabled,
}: {
  title: string;
  icon: ReactNode;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}) {
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
        <Button disabled={disabled} variant="outline" size="sm" type="button" onClick={() => onToggle(!enabled)}>
          {enabled ? "Disable" : "Connect"}
        </Button>
      </div>
    </div>
  );
}

function FormActions({
  saving,
  disabled,
  onSave,
}: {
  saving: boolean;
  disabled?: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-end border-t border-border/70 pt-4">
      <Button type="button" onClick={onSave} disabled={disabled || saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
