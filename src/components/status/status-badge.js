import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }) {
  const normalizedStatus = status === "completed" ? "delivered" : status;
  const map = {
    ongoing: "bg-primary/10 text-primary border-primary/20",
    delivered: "bg-success/10 text-success border-success/20",
    hold: "bg-warning/15 text-warning-foreground border-warning/30",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return _jsx("span", {
    className: cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
      map[normalizedStatus],
    ),
    children: normalizedStatus,
  });
}
