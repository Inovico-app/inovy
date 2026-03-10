"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TabsContent } from "@/components/ui/tabs";
import { Bar, BarChart, Pie, PieChart, XAxis, YAxis } from "recharts";

import { chartConfig } from "./user-analytics-types";

interface UserAnalyticsSourcesProps {
  sourcePreference: {
    knowledgeBaseUsage: number;
    recordingUsage: number;
    taskUsage: number;
    transcriptionUsage: number;
    summaryUsage: number;
    totalResponses: number;
    knowledgeBasePercentage: number;
  };
  filesUsedInResponses: Array<{ contentType: string; count: number }>;
}

export function UserAnalyticsSources({
  sourcePreference,
  filesUsedInResponses,
}: UserAnalyticsSourcesProps) {
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
  );
}
