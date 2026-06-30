import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Eye, Plus, Pencil, Trash2, RefreshCw, CheckCircle2, Circle, AlertCircle, } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
const PAGES = [
    "overview",
    "customers",
    "vendors",
    "projects",
    "services",
    "subscriptions",
    "staff",
    "stock",
    "finance",
    "notifications",
    "settings",
];
const ACTIONS = ["view", "add", "edit", "delete", "update"];
const DEFAULTS = Object.fromEntries(PAGES.map((page) => [page, ["view"]]));
// Action configuration with dependencies
const ACTION_CONFIG = {
    view: {
        icon: Eye,
        label: "View",
        color: "text-blue-500",
        description: "Can view page content and read-only access"
    },
    add: {
        icon: Plus,
        label: "Add",
        color: "text-green-500",
        description: "Can create new entries",
        requires: ["view"]
    },
    edit: {
        icon: Pencil,
        label: "Edit",
        color: "text-amber-500",
        description: "Can modify existing entries",
        requires: ["view"]
    },
    delete: {
        icon: Trash2,
        label: "Delete",
        color: "text-red-500",
        description: "Can remove entries",
        requires: ["view"]
    },
    update: {
        icon: RefreshCw,
        label: "Update",
        color: "text-purple-500",
        description: "Can update status, workflow, quantity, or settings",
        requires: ["view"],
    },
};
// Page categories for better organization
const PAGE_CATEGORIES = {
    "Core Management": ["overview", "customers", "vendors", "projects"],
    "Operations": ["services", "staff", "stock"],
    "Administration": ["subscriptions", "finance", "notifications", "settings"],
};
export function StaffPermissionsGrid({ value, onChange, }) {
    const [expandedPages, setExpandedPages] = useState(new Set(PAGES));
    const [searchTerm, setSearchTerm] = useState("");
    const meta = useMemo(() => ({ pages: PAGES, actions: ACTIONS, defaults: DEFAULTS }), []);
    const toggleExpand = (page) => {
        const newExpanded = new Set(expandedPages);
        if (newExpanded.has(page)) {
            newExpanded.delete(page);
        }
        else {
            newExpanded.add(page);
        }
        setExpandedPages(newExpanded);
    };
    const handlePageToggle = (page, enabled) => {
        const next = { ...value };
        if (enabled) {
            // Default to 'view' when enabled
            next[page] = ["view"];
        }
        else {
            // Remove page permissions when disabled
            delete next[page];
        }
        onChange(next);
    };
    const handleActionToggle = (page, action, checked) => {
        const currentActions = value[page] || [];
        let nextActions;
        if (checked) {
            // Add the action and any required dependencies
            const actionsToAdd = [action];
            const config = ACTION_CONFIG[action];
            if (config.requires) {
                actionsToAdd.push(...config.requires);
            }
            nextActions = [...new Set([...currentActions, ...actionsToAdd])];
        }
        else {
            // Remove the action and any actions that depend on it
            nextActions = currentActions.filter((a) => {
                // Keep if it's not the action being removed
                if (a === action)
                    return false;
                // Check if any remaining action depends on this action
                const dependentActions = ACTIONS.filter(act => ACTION_CONFIG[act].requires?.includes(action));
                // If this action is required by other enabled actions, keep it
                if (dependentActions.some(da => currentActions.includes(da))) {
                    return true;
                }
                return true;
            });
        }
        // Ensure view is always present if any other action exists
        if (nextActions.length > 0 && !nextActions.includes("view")) {
            nextActions = ["view", ...nextActions];
        }
        onChange({
            ...value,
            [page]: nextActions,
        });
    };
    const handleSelectAllActions = (page) => {
        onChange({
            ...value,
            [page]: [...ACTIONS],
        });
    };
    const handleClearAllActions = (page) => {
        onChange({
            ...value,
            [page]: ["view"],
        });
    };
    const getActionCount = (page) => {
        const actions = value[page] || [];
        return actions.length;
    };
    const getPermissionLevel = (page) => {
        const actions = value[page] || [];
        if (actions.length === 0)
            return "none";
        if (actions.length === ACTIONS.length)
            return "full";
        return "partial";
    };
    const isActionDisabled = (page, action) => {
        const currentActions = value[page] || [];
        const config = ACTION_CONFIG[action];
        // If action requires view permission and view is not enabled
        if (config.requires?.includes("view") && !currentActions.includes("view")) {
            return true;
        }
        return false;
    };
    const getActionTooltip = (action) => {
        return ACTION_CONFIG[action].description;
    };
    const filteredPages = searchTerm
        ? PAGES.filter((page) => page.toLowerCase().includes(searchTerm.toLowerCase()))
        : PAGES;
    // Group pages by category when not searching
    const getDisplayedPages = () => {
        if (searchTerm) {
            return { "Search Results": filteredPages };
        }
        return PAGE_CATEGORIES;
    };
    const displayedContent = getDisplayedPages();
    return (_jsx(TooltipProvider, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-4 flex-wrap", children: [_jsxs("div", { className: "relative flex-1 max-w-sm", children: [_jsx("input", { type: "text", placeholder: "Search pages...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" }), searchTerm && (_jsx("button", { onClick: () => setSearchTerm(""), className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground", children: "\u00D7" }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => {
                                        const allExpanded = new Set(PAGES);
                                        setExpandedPages(allExpanded);
                                    }, children: "Expand All" }), _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => setExpandedPages(new Set()), children: "Collapse All" })] })] }), _jsx("div", { className: "border rounded-lg overflow-hidden bg-background", children: Object.entries(displayedContent).map(([category, pages]) => (_jsxs("div", { className: "border-b last:border-b-0", children: [!searchTerm && (_jsx("div", { className: "px-6 py-3 bg-muted/30 border-b", children: _jsx("h3", { className: "text-sm font-semibold text-muted-foreground", children: category }) })), _jsx("div", { className: "divide-y", children: pages.map((page) => {
                                    const isEnabled = !!value[page] && value[page].length > 0;
                                    const selectedActions = value[page] || [];
                                    const isExpanded = expandedPages.has(page);
                                    const permissionLevel = getPermissionLevel(page);
                                    const actionCount = getActionCount(page);
                                    return (_jsxs("div", { className: cn("transition-colors hover:bg-muted/20", isEnabled && "bg-primary/5"), children: [_jsx("div", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 flex-1", children: [_jsx("button", { onClick: () => toggleExpand(page), className: "p-1 hover:bg-muted rounded transition-colors", children: isExpanded ? (_jsx(ChevronDown, { className: "w-4 h-4 text-muted-foreground" })) : (_jsx(ChevronRight, { className: "w-4 h-4 text-muted-foreground" })) }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Switch, { id: `page-${page}`, checked: isEnabled, onCheckedChange: (checked) => handlePageToggle(page, checked), className: "data-[state=checked]:bg-primary" }), _jsx(Label, { htmlFor: `page-${page}`, className: "font-medium capitalize cursor-pointer text-base", children: page })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [isEnabled && (_jsxs("div", { className: "flex items-center gap-1.5", children: [permissionLevel === "full" && (_jsxs("div", { className: "flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full", children: [_jsx(CheckCircle2, { className: "w-3 h-3 text-green-600" }), _jsx("span", { className: "text-xs font-medium text-green-700 dark:text-green-300", children: "Full Access" })] })), permissionLevel === "partial" && (_jsxs("div", { className: "flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full", children: [_jsx(Circle, { className: "w-3 h-3 text-amber-600" }), _jsxs("span", { className: "text-xs font-medium text-amber-700 dark:text-amber-300", children: [actionCount, "/", ACTIONS.length, " Actions"] })] }))] })), !isEnabled && (_jsx("div", { className: "px-2 py-1 bg-muted rounded-full", children: _jsx("span", { className: "text-xs text-muted-foreground", children: "No Access" }) }))] })] }) }), isEnabled && isExpanded && (_jsx("div", { className: "px-4 pb-4 pl-12", children: _jsxs("div", { className: "bg-muted/10 rounded-lg p-4 space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Select permissions for this page" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => handleSelectAllActions(page), className: "text-xs h-7", children: "Select All" }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => handleClearAllActions(page), className: "text-xs h-7", children: "Clear All" })] })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3", children: meta.actions.map((action) => {
                                                                const ActionIcon = ACTION_CONFIG[action].icon;
                                                                const isChecked = selectedActions.includes(action);
                                                                const isDisabled = isActionDisabled(page, action);
                                                                return (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("label", { className: cn("flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all", "border hover:border-primary/50", isChecked && !isDisabled
                                                                                    ? "border-primary bg-primary/5"
                                                                                    : "border-transparent bg-muted/20", isDisabled && "opacity-50 cursor-not-allowed"), children: [_jsx(Checkbox, { id: `${page}-${action}`, checked: isChecked, disabled: isDisabled, onCheckedChange: (checked) => handleActionToggle(page, action, !!checked), className: "data-[state=checked]:bg-primary" }), _jsx(ActionIcon, { className: cn("w-3.5 h-3.5", ACTION_CONFIG[action].color) }), _jsx(Label, { htmlFor: `${page}-${action}`, className: "text-xs capitalize cursor-pointer font-normal", children: ACTION_CONFIG[action].label })] }) }), _jsxs(TooltipContent, { children: [_jsx("p", { className: "text-xs", children: getActionTooltip(action) }), isDisabled && (_jsx("p", { className: "text-xs text-red-400 mt-1", children: "Requires \"View\" permission first" }))] })] }, action));
                                                            }) }), _jsxs("div", { className: "text-xs pt-2 border-t space-y-1", children: [selectedActions.length === ACTIONS.length ? (_jsxs("div", { className: "flex items-center gap-2 text-green-600", children: [_jsx(CheckCircle2, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Full access granted to this page" })] })) : selectedActions.length === 1 && selectedActions.includes("view") ? (_jsxs("div", { className: "flex items-center gap-2 text-amber-600", children: [_jsx(AlertCircle, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Read-only access (view only)" })] })) : selectedActions.length > 0 ? (_jsxs("div", { className: "flex items-center gap-2 text-blue-600", children: [_jsx(Circle, { className: "w-3.5 h-3.5" }), _jsxs("span", { children: ["Custom permissions: ", selectedActions.length, " action(s) selected", !selectedActions.includes("view") && (_jsx("span", { className: "text-red-500 ml-1", children: "(View permission will be auto-added)" }))] })] })) : (_jsxs("div", { className: "flex items-center gap-2 text-red-600", children: [_jsx(AlertCircle, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "No actions selected - access will be restricted" })] })), selectedActions.length > 0 && selectedActions.length < ACTIONS.length && (_jsxs("div", { className: "flex items-center gap-2 text-muted-foreground mt-1", children: [_jsx("span", { children: "Selected: " }), _jsx("div", { className: "flex gap-1", children: selectedActions.map(action => (_jsx("span", { className: "text-xs capitalize px-1.5 py-0.5 bg-muted rounded", children: action }, action))) })] }))] })] }) }))] }, page));
                                }) })] }, category))) }), _jsxs("div", { className: "flex items-center justify-between pt-4 border-t flex-wrap gap-3", children: [_jsxs("div", { className: "text-sm text-muted-foreground", children: [Object.keys(value).length, " of ", PAGES.length, " pages have access"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => {
                                        const allPermissions = Object.fromEntries(PAGES.map((page) => [page, [...ACTIONS]]));
                                        onChange(allPermissions);
                                    }, children: "Grant All Access" }), _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => onChange({}), children: "Revoke All Access" })] })] })] }) }));
}
