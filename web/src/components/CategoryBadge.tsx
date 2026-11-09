import { CATEGORY_LABELS, type Category } from "@/lib/types";

const STYLES: Record<Category, string> = {
  contact:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  housing: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  health:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  financial:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  legal: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  other: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[category]}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
