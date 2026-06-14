import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: "ongoing" | "completed" | "hold" }) {
  const map = {
    ongoing: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-success/10 text-success border-success/20",
    hold: "bg-warning/15 text-warning-foreground border-warning/30",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        map[status],
      )}
    >
      {status}
    </span>
  );
}
