"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";

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
  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center gap-3 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {Math.min(visibleCount, total)} of {total} meetings
      </p>
      {hasMore && (
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={isLoading}
          className="min-w-[140px]"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Load More
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
  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {total} meetings
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
