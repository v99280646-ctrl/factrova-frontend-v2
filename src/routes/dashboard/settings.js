import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Globe2, ImagePlus, Lock, Mail, MessageCircle, Plug, Save, UserRound, } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout.js";
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
    return Object.fromEntries(Object.entries(fallback).map(([key, fallbackValue]) => {
        const sourceValue = source?.[key];
        return [key, isMeaningfulValue(sourceValue) ? sourceValue : fallbackValue];
    }));
}
export function Settings() {
    const canUpdate = canPageAction("settings", "update");
    const factoryId = getActiveFactoryId() ?? getAuthSession()?.memberships[0]?.factory?.id ?? null;
    const [settings, setSettings] = useState(emptySettings);
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
            const data = await apiRootRequest(API_PATHS.factories.settings(factoryId));
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
                adminProfile: mergeSection({ ...emptySettings.adminProfile, ...profileFallback }, data.adminProfile),
                companyProfile: mergeSection(emptySettings.companyProfile, data.companyProfile),
                integrations: mergeSection(emptySettings.integrations, data.integrations),
            });
        }
        catch (error) {
            setSettings((current) => ({
                ...current,
                adminProfile: mergeSection(current.adminProfile, {
                    fullName: session?.profile.fullName || current.adminProfile.fullName,
                    email: session?.profile.email || current.adminProfile.email,
                }),
            }));
            toast.error(error instanceof Error ? error.message : "Unable to load settings");
        }
        finally {
            setLoading(false);
        }
    }, [factoryId]);
    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);
    const updateSection = (section, value) => {
        setSettings((current) => ({ ...current, [section]: value }));
    };
    const save = async () => {
        if (!canUpdate)
            return toast.error("You do not have permission to update settings");
        if (!factoryId) {
            toast.error("No active factory selected");
            return;
        }
        setSaving(true);
        try {
            if (activeTab === "admin-profile") {
                await toast.promise(apiRootRequest(API_PATHS.factories.adminProfile(factoryId), {
                    method: "POST",
                    body: {
                        adminProfile: settings.adminProfile,
                    },
                }), {
                    loading: "Saving admin profile...",
                    success: "Admin profile saved successfully",
                    error: (error) => error instanceof Error ? error.message : "Unable to save admin profile",
                });
                await loadSettings();
                return;
            }
            await toast.promise(apiRootRequest(API_PATHS.factories.settings(factoryId), {
                method: "PUT",
                body: settings,
            }), {
                loading: "Saving settings...",
                success: "Settings saved successfully",
                error: (error) => (error instanceof Error ? error.message : "Unable to save settings"),
            });
            await loadSettings();
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(DashboardLayout, { title: "Settings", children: _jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, className: "space-y-4", children: [_jsxs(TabsList, { className: "grid h-auto w-full grid-cols-1 sm:w-auto sm:grid-cols-4", children: [_jsx(TabsTrigger, { value: "admin-profile", children: "Admin Profile" }), _jsx(TabsTrigger, { value: "company-profile", children: "Company Profile" }), _jsx(TabsTrigger, { value: "password-settings", children: "Password Settings" }), _jsx(TabsTrigger, { value: "integrations", children: "Integrations" })] }), _jsx(TabsContent, { value: "admin-profile", className: "mt-0", children: _jsxs(SettingsPanel, { title: "Admin Profile", icon: _jsx(UserRound, { className: "h-5 w-5" }), children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(Field, { label: "Full Name", value: settings.adminProfile.fullName, onChange: (v) => updateSection("adminProfile", { ...settings.adminProfile, fullName: v }) }), _jsx(Field, { label: "Role", value: settings.adminProfile.role, onChange: (v) => updateSection("adminProfile", { ...settings.adminProfile, role: v }) }), _jsx(Field, { label: "Phone", value: settings.adminProfile.phone, onChange: (v) => updateSection("adminProfile", { ...settings.adminProfile, phone: v }) }), _jsx(Field, { label: "Email", type: "email", value: settings.adminProfile.email, onChange: (v) => updateSection("adminProfile", { ...settings.adminProfile, email: v }) }), _jsx(Field, { label: "City", value: settings.adminProfile.city, onChange: (v) => updateSection("adminProfile", { ...settings.adminProfile, city: v }) }), _jsx(Field, { label: "State", value: settings.adminProfile.state, onChange: (v) => updateSection("adminProfile", { ...settings.adminProfile, state: v }) }), _jsx(Field, { label: "Pincode", value: settings.adminProfile.pincode, onChange: (v) => updateSection("adminProfile", { ...settings.adminProfile, pincode: v }) }), _jsx(Field, { label: "Profile Logo", type: "file", value: "", readOnly: true })] }), _jsx(AddressField, { label: "Address", value: settings.adminProfile.address, onChange: (v) => updateSection("adminProfile", { ...settings.adminProfile, address: v }) }), _jsx(FormActions, { onSave: save, saving: saving, disabled: loading || !canUpdate })] }) }), _jsx(TabsContent, { value: "company-profile", className: "mt-0", children: _jsxs(SettingsPanel, { title: "Company Profile", icon: _jsx(Building2, { className: "h-5 w-5" }), children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(Field, { label: "Company Name", value: settings.companyProfile.companyName, onChange: (v) => updateSection("companyProfile", { ...settings.companyProfile, companyName: v }) }), _jsx(Field, { label: "GSTIN", value: settings.companyProfile.gstin, onChange: (v) => updateSection("companyProfile", { ...settings.companyProfile, gstin: v }) }), _jsx(Field, { label: "Phone", value: settings.companyProfile.phone, onChange: (v) => updateSection("companyProfile", { ...settings.companyProfile, phone: v }) }), _jsx(Field, { label: "Email", type: "email", value: settings.companyProfile.email, onChange: (v) => updateSection("companyProfile", { ...settings.companyProfile, email: v }) }), _jsx(Field, { label: "City", value: settings.companyProfile.city, onChange: (v) => updateSection("companyProfile", { ...settings.companyProfile, city: v }) }), _jsx(Field, { label: "State", value: settings.companyProfile.state, onChange: (v) => updateSection("companyProfile", { ...settings.companyProfile, state: v }) }), _jsx(Field, { label: "Pincode", value: settings.companyProfile.pincode, onChange: (v) => updateSection("companyProfile", { ...settings.companyProfile, pincode: v }) }), _jsx(LogoField, {})] }), _jsx(AddressField, { label: "Address", value: settings.companyProfile.address, onChange: (v) => updateSection("companyProfile", { ...settings.companyProfile, address: v }) }), _jsx(FormActions, { onSave: save, saving: saving, disabled: loading || !canUpdate })] }) }), _jsx(TabsContent, { value: "password-settings", className: "mt-0", children: _jsxs(SettingsPanel, { title: "Password Settings", icon: _jsx(Lock, { className: "h-5 w-5" }), children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Password changes should be handled through your auth provider or a dedicated password API." }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(Field, { label: "Current Password", type: "password", value: "", readOnly: true }), _jsx(Field, { label: "New Password", type: "password", value: "", readOnly: true }), _jsx(Field, { label: "Confirm Password", type: "password", value: "", readOnly: true })] }), _jsx(FormActions, { onSave: save, saving: saving, disabled: true })] }) }), _jsx(TabsContent, { value: "integrations", className: "mt-0", children: _jsxs(SettingsPanel, { title: "Integrations", icon: _jsx(Plug, { className: "h-5 w-5" }), children: [_jsxs("div", { className: "grid gap-4 xl:grid-cols-3", children: [_jsx(IntegrationCard, { title: "WhatsApp", icon: _jsx(MessageCircle, { className: "h-5 w-5" }), enabled: settings.integrations.whatsapp, disabled: !canUpdate, onToggle: (value) => updateSection("integrations", { ...settings.integrations, whatsapp: value }) }), _jsx(IntegrationCard, { title: "Email", icon: _jsx(Mail, { className: "h-5 w-5" }), enabled: settings.integrations.email, disabled: !canUpdate, onToggle: (value) => updateSection("integrations", { ...settings.integrations, email: value }) }), _jsx(IntegrationCard, { title: "Platforms", icon: _jsx(Globe2, { className: "h-5 w-5" }), enabled: settings.integrations.platforms, disabled: !canUpdate, onToggle: (value) => updateSection("integrations", { ...settings.integrations, platforms: value }) })] }), _jsx(FormActions, { onSave: save, saving: saving, disabled: loading || !canUpdate })] }) })] }) }));
}
function SettingsPanel({ title, icon, children, }) {
    return (_jsxs(Card, { className: "border-border/60 shadow-[var(--shadow-card)]", children: [_jsxs(CardHeader, { className: "flex flex-row items-center gap-3", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg bg-[image:var(--gradient-soft)] text-primary", children: icon }), _jsx(CardTitle, { className: "text-base", children: title })] }), _jsx(CardContent, { className: "space-y-4", children: children })] }));
}
function Field({ label, value, onChange, type = "text", readOnly = false, }) {
    return (_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: label }), _jsx(Input, { type: type, value: value, readOnly: readOnly, onChange: (event) => onChange?.(event.target.value) })] }));
}
function AddressField({ label, value, onChange, }) {
    return (_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: label }), _jsx(Textarea, { value: value, onChange: (event) => onChange(event.target.value), rows: 4 })] }));
}
function LogoField() {
    return (_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Logo" }), _jsxs("div", { className: "flex items-center gap-3 rounded-lg border border-dashed border-border p-3", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground", children: _jsx(ImagePlus, { className: "h-5 w-5" }) }), _jsx(Input, { type: "file", accept: "image/*" })] })] }));
}
function IntegrationCard({ title, icon, enabled, onToggle, disabled, }) {
    return (_jsx("div", { className: "rounded-lg border border-border bg-muted/20 p-4", children: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-md bg-background text-primary", children: icon }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold", children: title }), _jsx("p", { className: "text-xs text-muted-foreground", children: enabled ? "Connected" : "Disconnected" })] })] }), _jsx(Button, { disabled: disabled, variant: "outline", size: "sm", type: "button", onClick: () => onToggle(!enabled), children: enabled ? "Disable" : "Connect" })] }) }));
}
function FormActions({ saving, disabled, onSave, }) {
    return (_jsx("div", { className: "flex justify-end border-t border-border/70 pt-4", children: _jsxs(Button, { type: "button", onClick: onSave, disabled: disabled || saving, children: [_jsx(Save, { className: "mr-2 h-4 w-4" }), saving ? "Saving..." : "Save"] }) }));
}
