import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  totalPages,
  total,
  label = "total results",
  loading = false,
  onPrevious,
  onNext,
}) {
  const safeTotalPages = Math.max(1, Number(totalPages || 1));
  const safePage = Math.min(Math.max(1, Number(page || 1)), safeTotalPages);

  return safeTotalPages > 1 && (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-slate-500 dark:text-slate-400">
        {total} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={safePage <= 1 || loading}
        >
          Previous
        </Button>
        <span className="min-w-20 text-center text-slate-600 dark:text-slate-300">
          Page {safePage} of {safeTotalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={safePage >= safeTotalPages || loading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
