import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
};

/** Compact numbered pagination shell. 1-indexed pages. */
export function NumberedPagination({ page, pageCount, onPageChange }: Props) {
  if (pageCount <= 1) return null;

  const go = (p: number) => onPageChange(Math.max(1, Math.min(pageCount, p)));

  // Windowed page list: first, last, current ±1, with ellipsis.
  const set = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const visible = Array.from(set).filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const items: (number | "…")[] = [];
  visible.forEach((n, i) => {
    if (i > 0 && n - visible[i - 1] > 1) items.push("…");
    items.push(n);
  });

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            size="default"
            onClick={(e) => { e.preventDefault(); go(page - 1); }}
            className={`gap-1 pl-2.5 cursor-pointer ${page === 1 ? "pointer-events-none opacity-50" : ""}`}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </PaginationLink>
        </PaginationItem>
        {items.map((p, idx) =>
          p === "…" ? (
            <PaginationItem key={`e${idx}`}><PaginationEllipsis /></PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                isActive={p === page}
                onClick={(e) => { e.preventDefault(); go(p); }}
                className="cursor-pointer"
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationLink
            size="default"
            onClick={(e) => { e.preventDefault(); go(page + 1); }}
            className={`gap-1 pr-2.5 cursor-pointer ${page === pageCount ? "pointer-events-none opacity-50" : ""}`}
            aria-label="Próxima página"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
