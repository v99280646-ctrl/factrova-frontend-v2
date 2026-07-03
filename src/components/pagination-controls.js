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
      <p className="text-center text-slate-500 dark:text-slate-400 sm:text-left">
        {total} {label}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={safePage <= 1 || loading}
          className="w-full sm:w-auto"
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
          className="w-full sm:w-auto"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
