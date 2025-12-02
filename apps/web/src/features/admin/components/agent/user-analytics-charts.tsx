"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, Pie, PieChart, XAxis, YAxis } from "recharts";

interface UserAnalyticsChartsProps {
  engagementMetrics: {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    filesProcessed: number;
    filesUsedInResponses: Array<{ contentType: string; count: number }>;
    projectEngagement: Array<{
      projectId: string;
      projectName: string;
      conversationCount: number;
      messageCount: number;
    }>;
    uniqueProjectsCount: number;
    queryComplexity: {
      averageQueryLength: number;
      averageTokenCount: number;
      totalTokens: number;
      averageLatency: number;
      errorRate: number;
    };
    sourcePreference: {
      knowledgeBaseUsage: number;
      recordingUsage: number;
      taskUsage: number;
      transcriptionUsage: number;
      summaryUsage: number;
      totalResponses: number;
      knowledgeBasePercentage: number;
    };
    conversationPatterns: {
      averageDuration: number;
      longestConversation: number;
      singleMessageConversations: number;
      singleMessagePercentage: number;
    };
    qualityIndicators: {
      averageResponseQuality: number;
      followUpRate: number;
      reEngagementRate: number;
      averageSourcesPerResponse: number;
    };
  };
  startDate: Date;
  endDate: Date;
}

const chartConfig = {
  conversations: {
    label: "Conversations",
    color: "var(--chart-1)",
  },
  messages: {
    label: "Messages",
    color: "var(--chart-2)",
  },
  files: {
    label: "Files",
    color: "var(--chart-3)",
  },
  recording: {
    label: "Recordings",
    color: "var(--chart-1)",
  },
  knowledge_document: {
    label: "Knowledge Documents",
    color: "var(--chart-2)",
  },
  transcription: {
    label: "Transcriptions",
    color: "var(--chart-3)",
  },
  summary: {
    label: "Summaries",
    color: "var(--chart-4)",
  },
  task: {
    label: "Tasks",
    color: "var(--chart-5)",
  },
} satisfies Record<string, { label: string; color: string }>;

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

  // Format content types for display
  const formattedFilesUsed = filesUsedInResponses.map((item) => ({
    ...item,
    label:
      chartConfig[item.contentType as keyof typeof chartConfig]?.label ||
      item.contentType,
    color:
      chartConfig[item.contentType as keyof typeof chartConfig]?.color ||
      "var(--chart-1)",
  }));

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

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6 mt-6">
          {projectEngagement.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Project Engagement</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {uniqueProjectsCount} unique project
                    {uniqueProjectsCount !== 1 ? "s" : ""} accessed
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <ChartContainer
                      config={chartConfig}
                      className="h-[300px] w-full !aspect-auto"
                    >
                      <BarChart data={projectEngagement.slice(0, 5)}>
                        <XAxis
                          dataKey="projectName"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="conversationCount" fill="var(--chart-1)" />
                      </BarChart>
                    </ChartContainer>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Top Projects</h4>
                      <div className="space-y-2">
                        {projectEngagement.slice(0, 5).map((project) => (
                          <div
                            key={project.projectId}
                            className="flex items-center justify-between p-2 rounded border"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {project.projectName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {project.messageCount} messages
                              </p>
                            </div>
                            <div className="text-sm font-semibold ml-2">
                              {project.conversationCount}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No project engagement data available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Query Length
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {queryComplexity.averageQueryLength}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Characters</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Token Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {queryComplexity.averageTokenCount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per request</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tokens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {queryComplexity.totalTokens.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total usage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Latency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {queryComplexity.averageLatency}ms
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Error Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {queryComplexity.errorRate}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Failed requests
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Source Preference</CardTitle>
              <p className="text-sm text-muted-foreground">
                {sourcePreference.knowledgeBasePercentage}% of responses use
                Knowledge Base
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {sourcePreference.totalResponses > 0 ? (
                  <>
                    <div className="h-[300px] w-full flex items-center justify-center">
                      <ChartContainer
                        config={chartConfig}
                        className="h-full w-full max-w-[400px] !aspect-auto"
                      >
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "Knowledge Base",
                                value: sourcePreference.knowledgeBaseUsage,
                                fill: "var(--chart-1)",
                              },
                              {
                                name: "Recordings",
                                value: sourcePreference.recordingUsage,
                                fill: "var(--chart-2)",
                              },
                              {
                                name: "Tasks",
                                value: sourcePreference.taskUsage,
                                fill: "var(--chart-3)",
                              },
                              {
                                name: "Transcriptions",
                                value: sourcePreference.transcriptionUsage,
                                fill: "var(--chart-4)",
                              },
                              {
                                name: "Summaries",
                                value: sourcePreference.summaryUsage,
                                fill: "var(--chart-5)",
                              },
                            ].filter((item) => item.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, value }) => `${name}: ${value}`}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Knowledge Base</span>
                          <span className="text-sm font-semibold">
                            {sourcePreference.knowledgeBaseUsage}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Recordings</span>
                          <span className="text-sm font-semibold">
                            {sourcePreference.recordingUsage}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Tasks</span>
                          <span className="text-sm font-semibold">
                            {sourcePreference.taskUsage}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Transcriptions</span>
                          <span className="text-sm font-semibold">
                            {sourcePreference.transcriptionUsage}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Summaries</span>
                          <span className="text-sm font-semibold">
                            {sourcePreference.summaryUsage}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">
                            Total Responses
                          </span>
                          <span className="text-sm font-semibold">
                            {sourcePreference.totalResponses}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 py-8 text-center text-muted-foreground">
                    No source preference data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Files Used in Responses */}
          {formattedFilesUsed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Files Used in Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="h-[300px] w-full flex items-center justify-center">
                    <ChartContainer
                      config={chartConfig}
                      className="h-full w-full max-w-[400px] !aspect-auto"
                    >
                      <PieChart>
                        <Pie
                          data={formattedFilesUsed}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ label, count }) => `${label}: ${count}`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </div>

                  <ChartContainer
                    config={chartConfig}
                    className="h-[300px] w-full !aspect-auto"
                  >
                    <BarChart data={formattedFilesUsed}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--chart-1)" />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Response Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {qualityIndicators.averageResponseQuality.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Quality score
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Follow-Up Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {qualityIndicators.followUpRate}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Multi-exchange convos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Re-Engagement Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {qualityIndicators.reEngagementRate}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Deep conversations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Sources/Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {qualityIndicators.averageSourcesPerResponse.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Source citations
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {conversationPatterns.averageDuration}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Minutes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Longest Conversation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {conversationPatterns.longestConversation}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Messages</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Single-Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {conversationPatterns.singleMessageConversations}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {conversationPatterns.singleMessagePercentage}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Feedback Section (Placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>User Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">
                  Feedback tracking will be available soon
                </p>
                <div className="text-2xl font-bold text-muted-foreground">
                  0% Positive
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This metric will track user satisfaction ratings
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
