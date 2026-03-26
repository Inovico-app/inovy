"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";

const PAGE_SIZE = 20;

interface PagesPaginationProps {
  variant?: "pages";
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

interface LoadMorePaginationProps {
  variant: "load-more";
  visibleCount: number;
  total: number;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading?: boolean;
}

type MeetingsPaginationProps = PagesPaginationProps | LoadMorePaginationProps;

export function MeetingsPagination(props: MeetingsPaginationProps) {
  if (props.variant === "load-more") {
    return <LoadMorePagination {...props} />;
  }
  return <PagesPagination {...props} />;
}

function LoadMorePagination({
  visibleCount,
  total,
  hasMore,
  onLoadMore,
  isLoading,
}: LoadMorePaginationProps) {
  const t = useTranslations("meetings");
  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center gap-3 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        {t("pagination.showingOfTotal", {
          visible: Math.min(visibleCount, total),
          total,
        })}
      </p>
      {hasMore && (
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={isLoading}
          aria-busy={isLoading}
          className="min-w-[140px]"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center mr-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          </span>
          {t("pagination.loadMore")}
        </Button>
      )}
    </div>
  );
}

function PagesPagination({
  currentPage,
  totalPages,
  total,
  pageSize = PAGE_SIZE,
  onPageChange,
}: PagesPaginationProps) {
  const t = useTranslations("meetings");
  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-muted-foreground">
        {t("pagination.showingRange", {
          start: startItem,
          end: endItem,
          total,
        })}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label={t("pagination.firstPage")}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label={t("pagination.previousPage")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          {t("pagination.pageOf", { current: currentPage, total: totalPages })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label={t("pagination.nextPage")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label={t("pagination.lastPage")}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
