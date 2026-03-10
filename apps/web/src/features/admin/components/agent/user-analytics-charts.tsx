"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { UserAnalyticsPerformance } from "./user-analytics-performance";
import { UserAnalyticsProjects } from "./user-analytics-projects";
import { UserAnalyticsQuality } from "./user-analytics-quality";
import { UserAnalyticsSources } from "./user-analytics-sources";
import type { UserAnalyticsChartsProps } from "./user-analytics-types";

export function UserAnalyticsCharts({
  engagementMetrics,
  startDate,
  endDate,
}: UserAnalyticsChartsProps) {
  const {
    totalConversations,
    totalMessages,
    averageMessagesPerConversation,
    filesProcessed,
    filesUsedInResponses,
    projectEngagement,
    uniqueProjectsCount,
    queryComplexity,
    sourcePreference,
    conversationPatterns,
    qualityIndicators,
  } = engagementMetrics;

  return (
    <div className="space-y-6">
      {/* Overview - Always visible */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-2xl font-bold">{totalConversations}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total Conversations
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalMessages}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total Messages
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {averageMessagesPerConversation.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg Messages/Conversation
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold">{filesProcessed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Files Processed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Sections */}
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        <UserAnalyticsProjects
          projectEngagement={projectEngagement}
          uniqueProjectsCount={uniqueProjectsCount}
        />

        <UserAnalyticsPerformance queryComplexity={queryComplexity} />

        <UserAnalyticsSources
          sourcePreference={sourcePreference}
          filesUsedInResponses={filesUsedInResponses}
        />

        <UserAnalyticsQuality
          qualityIndicators={qualityIndicators}
          conversationPatterns={conversationPatterns}
        />
      </Tabs>
    </div>
  );
}
