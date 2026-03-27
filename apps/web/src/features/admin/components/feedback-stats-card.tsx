import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRightIcon, MessageSquare, ThumbsUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface FeedbackStatsCardProps {
  stats: {
    total: number;
    positiveCount: number;
    negativeCount: number;
    byType: {
      summary: { positive: number; negative: number };
      transcription: { positive: number; negative: number };
      general: { positive: number; negative: number };
    };
  };
  translations: {
    title: string;
    totalFeedback: string;
    positiveRate: string;
    byType: string;
    viewAll: string;
    dashboardDescription: string;
    positive: string;
    negative: string;
  };
}

export function FeedbackStatsCard({
  stats,
  translations,
}: FeedbackStatsCardProps) {
  const positiveRate =
    stats.total > 0 ? Math.round((stats.positiveCount / stats.total) * 100) : 0;

  const typeEntries: Array<{
    key: keyof typeof stats.byType;
    label: string;
  }> = [
    { key: "summary", label: "Summary" },
    { key: "transcription", label: "Transcription" },
    { key: "general", label: "General" },
  ];

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            {translations.title}
          </CardTitle>
          <CardDescription>{translations.dashboardDescription}</CardDescription>
        </div>
        <Link
          href={"/admin/feedback" as Route}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {translations.viewAll}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {translations.totalFeedback}
            </p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {translations.positiveRate}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{positiveRate}%</p>
              <ThumbsUp className="h-4 w-4 text-green-500" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {translations.byType}
            </p>
            <div className="space-y-1.5">
              {typeEntries.map(({ key, label }) => {
                const typeStats = stats.byType[key];
                const typeTotal = typeStats.positive + typeStats.negative;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground capitalize">
                      {label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        {typeTotal}
                      </Badge>
                      {typeTotal > 0 && (
                        <span className="text-xs text-green-600 font-medium">
                          {Math.round((typeStats.positive / typeTotal) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
