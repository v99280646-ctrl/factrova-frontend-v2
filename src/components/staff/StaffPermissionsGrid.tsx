import { useMemo, useState } from "react";
import type { PageAction, PageName, PagePermissions } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PermissionsMeta {
  pages: PageName[];
  actions: PageAction[];
  defaults: PagePermissions;
}

interface StaffPermissionsGridProps {
  value: PagePermissions;
  onChange: (value: PagePermissions) => void;
}

const PAGES: PageName[] = [
  "overview",
  "customers",
  "vendors",
  "projects",
  "services",
  "staff",
  "stock",
  "finance",
  "notifications",
  "settings",
];

const ACTIONS: PageAction[] = ["view", "add", "edit", "delete", "update"];

const DEFAULTS: PagePermissions = Object.fromEntries(
  PAGES.map((page) => [page, ["view"]]),
) as PagePermissions;

// Action configuration with dependencies
const ACTION_CONFIG: Record<PageAction, { 
  icon: any; 
  label: string; 
  color: string;
  description: string;
  requires?: PageAction[];
}> = {
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
  "Administration": ["finance", "notifications", "settings"],
};

export function StaffPermissionsGrid({
  value,
  onChange,
}: StaffPermissionsGridProps) {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set(PAGES));
  const [searchTerm, setSearchTerm] = useState("");

  const meta = useMemo<PermissionsMeta>(
    () => ({ pages: PAGES, actions: ACTIONS, defaults: DEFAULTS }),
    [],
  );

  const toggleExpand = (page: PageName) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(page)) {
      newExpanded.delete(page);
    } else {
      newExpanded.add(page);
    }
    setExpandedPages(newExpanded);
  };

  const handlePageToggle = (page: PageName, enabled: boolean) => {
    const next = { ...value };
    if (enabled) {
      // Default to 'view' when enabled
      next[page] = ["view"];
    } else {
      // Remove page permissions when disabled
      delete next[page];
    }
    onChange(next);
  };

  const handleActionToggle = (
    page: PageName,
    action: PageAction,
    checked: boolean,
  ) => {
    const currentActions = value[page] || [];
    let nextActions: PageAction[];
    
    if (checked) {
      // Add the action and any required dependencies
      const actionsToAdd = [action];
      const config = ACTION_CONFIG[action];
      if (config.requires) {
        actionsToAdd.push(...config.requires);
      }
      nextActions = [...new Set([...currentActions, ...actionsToAdd])];
    } else {
      // Remove the action and any actions that depend on it
      nextActions = currentActions.filter((a) => {
        // Keep if it's not the action being removed
        if (a === action) return false;
        // Check if any remaining action depends on this action
        const dependentActions = ACTIONS.filter(act => 
          ACTION_CONFIG[act].requires?.includes(action)
        );
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

  const handleSelectAllActions = (page: PageName) => {
    onChange({
      ...value,
      [page]: [...ACTIONS],
    });
  };

  const handleClearAllActions = (page: PageName) => {
    onChange({
      ...value,
      [page]: ["view"],
    });
  };

  const getActionCount = (page: PageName) => {
    const actions = value[page] || [];
    return actions.length;
  };

  const getPermissionLevel = (page: PageName): "full" | "partial" | "none" => {
    const actions = value[page] || [];
    if (actions.length === 0) return "none";
    if (actions.length === ACTIONS.length) return "full";
    return "partial";
  };

  const isActionDisabled = (page: PageName, action: PageAction): boolean => {
    const currentActions = value[page] || [];
    const config = ACTION_CONFIG[action];
    
    // If action requires view permission and view is not enabled
    if (config.requires?.includes("view") && !currentActions.includes("view")) {
      return true;
    }
    
    return false;
  };

  const getActionTooltip = (action: PageAction): string => {
    return ACTION_CONFIG[action].description;
  };

  const filteredPages = searchTerm
    ? PAGES.filter((page) =>
        page.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : PAGES;

  // Group pages by category when not searching
  const getDisplayedPages = () => {
    if (searchTerm) {
      return { "Search Results": filteredPages };
    }
    return PAGE_CATEGORIES;
  };

  const displayedContent = getDisplayedPages();

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search and Actions Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const allExpanded = new Set(PAGES);
                setExpandedPages(allExpanded);
              }}
            >
              Expand All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpandedPages(new Set())}
            >
              Collapse All
            </Button>
          </div>
        </div>

        {/* Permissions Grid */}
        <div className="border rounded-lg overflow-hidden bg-background">
          {Object.entries(displayedContent).map(([category, pages]) => (
            <div key={category} className="border-b last:border-b-0">
              {!searchTerm && (
                <div className="px-6 py-3 bg-muted/30 border-b">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {category}
                  </h3>
                </div>
              )}
              <div className="divide-y">
                {(pages as PageName[]).map((page) => {
                  const isEnabled = !!value[page] && value[page]!.length > 0;
                  const selectedActions = value[page] || [];
                  const isExpanded = expandedPages.has(page);
                  const permissionLevel = getPermissionLevel(page);
                  const actionCount = getActionCount(page);

                  return (
                    <div
                      key={page}
                      className={cn(
                        "transition-colors hover:bg-muted/20",
                        isEnabled && "bg-primary/5"
                      )}
                    >
                      {/* Page Header */}
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={() => toggleExpand(page)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                            
                            <div className="flex items-center gap-3">
                              <Switch
                                id={`page-${page}`}
                                checked={isEnabled}
                                onCheckedChange={(checked) =>
                                  handlePageToggle(page, checked)
                                }
                                className="data-[state=checked]:bg-primary"
                              />
                              <Label
                                htmlFor={`page-${page}`}
                                className="font-medium capitalize cursor-pointer text-base"
                              >
                                {page}
                              </Label>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Permission Level Badge */}
                            {isEnabled && (
                              <div className="flex items-center gap-1.5">
                                {permissionLevel === "full" && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                      Full Access
                                    </span>
                                  </div>
                                )}
                                {permissionLevel === "partial" && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <Circle className="w-3 h-3 text-amber-600" />
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                      {actionCount}/{ACTIONS.length} Actions
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {!isEnabled && (
                              <div className="px-2 py-1 bg-muted rounded-full">
                                <span className="text-xs text-muted-foreground">
                                  No Access
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions Section */}
                      {isEnabled && isExpanded && (
                        <div className="px-4 pb-4 pl-12">
                          <div className="bg-muted/10 rounded-lg p-4 space-y-3">
                            {/* Quick Actions */}
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-muted-foreground">
                                Select permissions for this page
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSelectAllActions(page)}
                                  className="text-xs h-7"
                                >
                                  Select All
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleClearAllActions(page)}
                                  className="text-xs h-7"
                                >
                                  Clear All
                                </Button>
                              </div>
                            </div>

                            {/* Action Checkboxes Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                              {meta.actions.map((action) => {
                                const ActionIcon = ACTION_CONFIG[action].icon;
                                const isChecked = selectedActions.includes(action);
                                const isDisabled = isActionDisabled(page, action);
                                
                                return (
                                  <Tooltip key={action}>
                                    <TooltipTrigger asChild>
                                      <label
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
                                          "border hover:border-primary/50",
                                          isChecked && !isDisabled
                                            ? "border-primary bg-primary/5"
                                            : "border-transparent bg-muted/20",
                                          isDisabled && "opacity-50 cursor-not-allowed"
                                        )}
                                      >
                                        <Checkbox
                                          id={`${page}-${action}`}
                                          checked={isChecked}
                                          disabled={isDisabled}
                                          onCheckedChange={(checked) =>
                                            handleActionToggle(page, action, !!checked)
                                          }
                                          className="data-[state=checked]:bg-primary"
                                        />
                                        <ActionIcon
                                          className={cn(
                                            "w-3.5 h-3.5",
                                            ACTION_CONFIG[action].color
                                          )}
                                        />
                                        <Label
                                          htmlFor={`${page}-${action}`}
                                          className="text-xs capitalize cursor-pointer font-normal"
                                        >
                                          {ACTION_CONFIG[action].label}
                                        </Label>
                                      </label>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">{getActionTooltip(action)}</p>
                                      {isDisabled && (
                                        <p className="text-xs text-red-400 mt-1">
                                          Requires "View" permission first
                                        </p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>

                            {/* Permission Summary */}
                            <div className="text-xs pt-2 border-t space-y-1">
                              {selectedActions.length === ACTIONS.length ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Full access granted to this page</span>
                                </div>
                              ) : selectedActions.length === 1 && selectedActions.includes("view") ? (
                                <div className="flex items-center gap-2 text-amber-600">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Read-only access (view only)</span>
                                </div>
                              ) : selectedActions.length > 0 ? (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Circle className="w-3.5 h-3.5" />
                                  <span>
                                    Custom permissions: {selectedActions.length} action(s) selected
                                    {!selectedActions.includes("view") && (
                                      <span className="text-red-500 ml-1">
                                        (View permission will be auto-added)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-600">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>No actions selected - access will be restricted</span>
                                </div>
                              )}
                              
                              {/* Show which actions are selected */}
                              {selectedActions.length > 0 && selectedActions.length < ACTIONS.length && (
                                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                  <span>Selected: </span>
                                  <div className="flex gap-1">
                                    {selectedActions.map(action => (
                                      <span key={action} className="text-xs capitalize px-1.5 py-0.5 bg-muted rounded">
                                        {action}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Footer */}
        <div className="flex items-center justify-between pt-4 border-t flex-wrap gap-3">
          <div className="text-sm text-muted-foreground">
            {Object.keys(value).length} of {PAGES.length} pages have access
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const allPermissions = Object.fromEntries(
                  PAGES.map((page) => [page, [...ACTIONS]])
                ) as PagePermissions;
                onChange(allPermissions);
              }}
            >
              Grant All Access
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({})}
            >
              Revoke All Access
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// import { useMemo } from "react";
// import type { PageAction, PageName, PagePermissions } from "@/lib/auth";
// import { Switch } from "@/components/ui/switch";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";

// interface PermissionsMeta {
//   pages: PageName[];
//   actions: PageAction[];
//   defaults: PagePermissions;
// }

// interface StaffPermissionsGridProps {
//   value: PagePermissions;
//   onChange: (value: PagePermissions) => void;
// }

// const PAGES: PageName[] = [
//   "overview",
//   "customers",
//   "vendors",
//   "projects",
//   "services",
//   "staff",
//   "stock",
//   "finance",
//   "notifications",
//   "settings",
// ];

// const ACTIONS: PageAction[] = ["view", "add", "edit", "delete", "update"];

// const DEFAULTS: PagePermissions = Object.fromEntries(
//   PAGES.map((page) => [page, ["view"]]),
// ) as PagePermissions;

// export function StaffPermissionsGrid({
//   value,
//   onChange,
// }: StaffPermissionsGridProps) {
//   const meta = useMemo<PermissionsMeta>(
//     () => ({ pages: PAGES, actions: ACTIONS, defaults: DEFAULTS }),
//     [],
//   );


//   const handlePageToggle = (page: PageName, enabled: boolean) => {
//     const next = { ...value };
//     if (enabled) {
//       // Default to 'view' when enabled
//       next[page] = ["view"];
//     } else {
//       // Remove page permissions when disabled
//       delete next[page];
//     }
//     onChange(next);
//   };

//   const handleActionToggle = (
//     page: PageName,
//     action: PageAction,
//     checked: boolean,
//   ) => {
//     const currentActions = value[page] || [];
//     const nextActions = checked
//       ? [...new Set([...currentActions, action])]
//       : currentActions.filter((a) => a !== action);

//     onChange({
//       ...value,
//       [page]: nextActions,
//     });
//   };

//   return (
//     <div className="space-y-4 border rounded-md p-4 bg-muted/20">
//       <div className="grid grid-cols-1 gap-4">
//         {meta?.pages?.map((page) => {
//           const isEnabled = !!value[page] && value[page]!.length > 0;
//           const selectedActions = value[page] || [];

//           return (
//             <div
//               key={page}
//               className="flex flex-col space-y-3 pb-3 border-b last:border-0 last:pb-0"
//             >
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center space-x-2">
//                   <Switch
//                     id={`page-${page}`}
//                     checked={isEnabled}
//                     onCheckedChange={(checked) =>
//                       handlePageToggle(page, checked)
//                     }
//                   />
//                   <Label
//                     htmlFor={`page-${page}`}
//                     className="font-semibold capitalize cursor-pointer"
//                   >
//                     {page}
//                   </Label>
//                 </div>
//                 {isEnabled && (
//                   <span className="text-[10px] text-primary uppercase font-bold px-1.5 py-0.5 bg-primary/10 rounded">
//                     Access Enabled
//                   </span>
//                 )}
//               </div>

//               {isEnabled && (
//                 <div className="flex flex-wrap gap-x-6 gap-y-2 pl-12">
//                   {meta.actions.map((action) => (
//                     <div key={action} className="flex items-center space-x-2">
//                       <Checkbox
//                         id={`${page}-${action}`}
//                         checked={selectedActions.includes(action)}
//                         onCheckedChange={(checked) =>
//                           handleActionToggle(page, action, !!checked)
//                         }
//                       />
//                       <Label
//                         htmlFor={`${page}-${action}`}
//                         className="text-xs capitalize cursor-pointer font-normal text-muted-foreground"
//                       >
//                         {action}
//                       </Label>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }
