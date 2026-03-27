"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";

export interface FeedbackItem {
  id: string;
  userId: string;
  recordingId: string;
  type: string;
  rating: string;
  comment: string | null;
  createdAt: Date;
  recordingTitle: string | null;
  recordingProjectId: string | null;
}

interface FeedbackTableProps {
  feedbackItems: FeedbackItem[];
}

type TypeFilter = "all" | "summary" | "transcription" | "general";
type RatingFilter = "all" | "positive" | "negative";

export function FeedbackTable({ feedbackItems }: FeedbackTableProps) {
  const t = useTranslations("admin.feedback");

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  const filtered = feedbackItems.filter((item) => {
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesRating =
      ratingFilter === "all" || item.rating === ratingFilter;
    return matchesType && matchesRating;
  });

  const typeFilters: Array<{ value: TypeFilter; label: string }> = [
    { value: "all", label: t("all") },
    { value: "summary", label: t("summary") },
    { value: "transcription", label: t("transcription") },
    { value: "general", label: t("general") },
  ];

  const ratingFilters: Array<{ value: RatingFilter; label: string }> = [
    { value: "all", label: t("all") },
    { value: "positive", label: t("positive") },
    { value: "negative", label: t("negative") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground mr-1">
            {t("filterByType")}:
          </span>
          {typeFilters.map(({ value, label }) => (
            <Button
              key={value}
              variant={typeFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground mr-1">
            {t("filterByRating")}:
          </span>
          {ratingFilters.map(({ value, label }) => (
            <Button
              key={value}
              variant={ratingFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setRatingFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {t("noFeedback")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("recording")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("rating")}</TableHead>
              <TableHead>{t("comment")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {format(new Date(item.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {item.recordingTitle && item.recordingProjectId ? (
                    <Link
                      href={
                        `/projects/${item.recordingProjectId}/recordings/${item.recordingId}` as Route
                      }
                      className="text-sm font-medium hover:underline"
                    >
                      {item.recordingTitle}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {t(item.type as "summary" | "transcription" | "general")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.rating === "positive" ? (
                    <div className="flex items-center gap-1.5">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">
                        {t("positive")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <ThumbsDown className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">
                        {t("negative")}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  {item.comment ? (
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {item.comment}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
