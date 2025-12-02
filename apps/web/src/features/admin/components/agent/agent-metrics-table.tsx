"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AgentMetric } from "@/server/db/schema/agent-metrics";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import { useState } from "react";

interface AgentMetricsTableProps {
  metrics: AgentMetric[];
  total: number;
  limit: number;
  currentPage: number;
}

interface MetricRowProps {
  metric: AgentMetric;
}

function MetricRow({ metric }: MetricRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatToolCalls = (toolCalls: string[] | null): string => {
    if (!toolCalls || toolCalls.length === 0) return "None";
    return toolCalls.join(", ");
  };

  const formatMetadata = (metadata: Record<string, unknown> | null): string => {
    if (!metadata) return "None";
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return "Invalid JSON";
    }
  };

  const truncateText = (text: string | null | undefined, maxLength: number = 50): string => {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  const hasDetails =
    metric.errorMessage ||
    metric.conversationId ||
    (metric.toolCalls && metric.toolCalls.length > 0) ||
    metric.metadata;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <>
        <TableRow>
          <TableCell className="whitespace-nowrap">
            <div className="flex flex-col">
              <span className="text-sm">
                {new Date(metric.createdAt).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(metric.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="outline">{metric.requestType}</Badge>
          </TableCell>
          <TableCell className="font-mono text-xs">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="truncate cursor-help max-w-[120px]">
                    {truncateText(metric.userId, 15)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono">{metric.userId}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>
          <TableCell className="font-mono text-xs">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="truncate cursor-help max-w-[120px]">
                    {truncateText(metric.organizationId, 15)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono">{metric.organizationId}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>
          <TableCell className="text-right">
            {metric.latencyMs !== null ? (
              <span className="font-medium">{metric.latencyMs}ms</span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell className="text-center">
            {metric.error ? (
              <Badge variant="destructive">Error</Badge>
            ) : (
              <Badge variant="default">Success</Badge>
            )}
          </TableCell>
          <TableCell className="text-right">
            {metric.tokenCount !== null ? (
              <span className="font-medium">
                {metric.tokenCount.toLocaleString()}
              </span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell className="max-w-xs">
            {metric.query ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="truncate cursor-help">
                      {truncateText(metric.query, 40)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    <p className="break-words">{metric.query}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell>
            {hasDetails ? (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isOpen ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            ) : (
              <span className="text-muted-foreground text-xs">-</span>
            )}
          </TableCell>
        </TableRow>
        {hasDetails && (
          <CollapsibleContent asChild>
            <TableRow>
              <TableCell colSpan={9} className="bg-muted/30">
                <div className="space-y-3 py-3">
                  {metric.conversationId && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Conversation ID:
                      </span>
                      <p className="font-mono text-xs mt-1 break-all">
                        {metric.conversationId}
                      </p>
                    </div>
                  )}
                  {metric.errorMessage && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Error Message:
                      </span>
                      <p className="text-sm mt-1 text-destructive break-words">
                        {metric.errorMessage}
                      </p>
                    </div>
                  )}
                  {metric.toolCalls && metric.toolCalls.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Tool Calls:
                      </span>
                      <p className="text-sm mt-1 break-words">
                        {formatToolCalls(metric.toolCalls)}
                      </p>
                    </div>
                  )}
                  {metric.metadata && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Metadata:
                      </span>
                      <pre className="text-xs mt-1 p-2 bg-background rounded border overflow-auto max-h-48">
                        {formatMetadata(metric.metadata)}
                      </pre>
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          </CollapsibleContent>
        )}
      </>
    </Collapsible>
  );
}

export function AgentMetricsTable({
  metrics,
  total,
  limit,
  currentPage,
}: AgentMetricsTableProps) {
  const router = useRouter();
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const totalPages = Math.ceil(total / limit);
  const startIndex = (currentPage - 1) * limit;
  const endIndex = Math.min(startIndex + metrics.length, total);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        {metrics.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created At</TableHead>
                    <TableHead>Request Type</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Organization ID</TableHead>
                    <TableHead className="text-right">Latency (ms)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Token Count</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead className="w-12">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => (
                    <MetricRow key={metric.id} metric={metric} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {endIndex} of {total} metrics
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No metrics found matching your filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

