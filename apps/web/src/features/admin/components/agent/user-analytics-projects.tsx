"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TabsContent } from "@/components/ui/tabs";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { chartConfig } from "./user-analytics-types";

interface UserAnalyticsProjectsProps {
  projectEngagement: Array<{
    projectId: string;
    projectName: string;
    conversationCount: number;
    messageCount: number;
  }>;
  uniqueProjectsCount: number;
}

export function UserAnalyticsProjects({
  projectEngagement,
  uniqueProjectsCount,
}: UserAnalyticsProjectsProps) {
  return (
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
  );
}
