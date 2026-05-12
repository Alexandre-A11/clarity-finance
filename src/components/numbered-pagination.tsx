import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationPrevious, PaginationNext, PaginationEllipsis,
} from "@/components/ui/pagination";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
};

/** Compact numbered pagination shell. 1-indexed pages. */
export function NumberedPagination({ page, pageCount, onPageChange }: Props) {
  if (pageCount <= 1) return null;

  const go = (p: number) => onPageChange(Math.max(1, Math.min(pageCount, p)));

  // Build a windowed list of pages: always show first, last, current ±1, ellipsis.
  const pages: (number | "…")[] = [];
  const push = (v: number | "…") => {
    if (pages[pages.length - 1] !== v) pages.push(v);
  };
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || (i >= page - 1 && i <= page + 1)) push(i);
    else if (i < page - 1) push("…");
    else if (i > page + 1) { push("…"); i = pageCount - 1; }
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={(e) => { e.preventDefault(); go(page - 1); }}
            className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          >
            <span className="hidden sm:inline">Anterior</span>
          </PaginationPrevious>
        </PaginationItem>
        {pages.map((p, idx) =>
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
          <PaginationNext
            onClick={(e) => { e.preventDefault(); go(page + 1); }}
            className={page === pageCount ? "pointer-events-none opacity-50" : "cursor-pointer"}
          >
            <span className="hidden sm:inline">Próxima</span>
          </PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
