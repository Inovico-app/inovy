"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GuardrailsViolation } from "@/server/db/schema";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  ShieldXIcon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { getGuardrailsViolations } from "../actions/guardrails-policy.actions";

interface GuardrailsViolationsTableProps {
  organizationId: string;
  initialViolations: GuardrailsViolation[];
  initialTotal: number;
}

const TYPE_BADGES: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
  pii: { label: "PII", variant: "destructive" },
  jailbreak: { label: "Jailbreak", variant: "destructive" },
  toxicity: { label: "Toxicity", variant: "secondary" },
  hallucination: { label: "Hallucination", variant: "outline" },
};

const ACTION_LABELS: Record<string, string> = {
  blocked: "Blocked",
  redacted: "Redacted",
  warned: "Warned",
  passed: "Passed",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-600 dark:text-red-400",
  high: "text-orange-600 dark:text-orange-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
};

export function GuardrailsViolationsTable({
  organizationId,
  initialViolations,
  initialTotal,
}: GuardrailsViolationsTableProps) {
  const [violations, setViolations] = useState(initialViolations);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const limit = 20;

  const { execute, isExecuting } = useAction(getGuardrailsViolations, {
    onSuccess: ({ data }) => {
      if (data) {
        setViolations(data.violations);
        setTotal(data.total);
      }
    },
  });

  function fetchPage(newPage: number) {
    setPage(newPage);
    execute({
      organizationId,
      page: newPage,
      limit,
      violationType:
        typeFilter === "all"
          ? undefined
          : (typeFilter as "pii" | "jailbreak" | "toxicity" | "hallucination"),
      direction:
        directionFilter === "all"
          ? undefined
          : (directionFilter as "input" | "output"),
    });
  }

  function handleFilter() {
    setPage(1);
    fetchPage(1);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <FilterIcon className="h-4 w-4 text-muted-foreground" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="pii">PII</SelectItem>
            <SelectItem value="jailbreak">Jailbreak</SelectItem>
            <SelectItem value="toxicity">Toxicity</SelectItem>
            <SelectItem value="hallucination">Hallucination</SelectItem>
          </SelectContent>
        </Select>

        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="input">Input</SelectItem>
            <SelectItem value="output">Output</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleFilter}>
          Apply
        </Button>
      </div>

      {/* Table */}
      {violations.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Guard</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={TYPE_BADGES[v.violationType]?.variant ?? "default"}>
                      {TYPE_BADGES[v.violationType]?.label ?? v.violationType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {v.direction}
                  </TableCell>
                  <TableCell className="text-sm">
                    {ACTION_LABELS[v.actionTaken] ?? v.actionTaken}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-sm font-medium capitalize ${SEVERITY_COLORS[v.severity] ?? ""}`}
                    >
                      {v.severity}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {v.guardName}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldXIcon className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No violations recorded</p>
          <p className="text-sm text-muted-foreground mt-1">
            Violations will appear here when guardrails detect policy breaches
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–
            {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPage(page - 1)}
              disabled={page <= 1 || isExecuting}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPage(page + 1)}
              disabled={page >= totalPages || isExecuting}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
