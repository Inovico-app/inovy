"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

interface AgentMetricsChartsProps {
  requestCount: Array<{ date: string; value: number }>;
  latency: Array<{ date: string; value: number }>;
  errorRate: Array<{ date: string; value: number }>;
  tokenUsage: Array<{ date: string; value: number }>;
  toolUsage: Array<{ toolName: string; count: number }>;
}

const chartConfig = {
  requests: {
    label: "Requests",
    color: "var(--chart-1)",
  },
  latency: {
    label: "Latency (ms)",
    color: "var(--chart-2)",
  },
  errorRate: {
    label: "Error Rate (%)",
    color: "var(--chart-3)",
  },
  tokens: {
    label: "Tokens",
    color: "var(--chart-4)",
  },
  search_knowledge_base: {
    label: "Search Knowledge Base",
    color: "var(--chart-1)",
  },
  create_task: {
    label: "Create Task",
    color: "var(--chart-2)",
  },
  get_project_info: {
    label: "Get Project Info",
    color: "var(--chart-3)",
  },
  list_recordings: {
    label: "List Recordings",
    color: "var(--chart-4)",
  },
  other: {
    label: "Other",
    color: "var(--chart-5)",
  },
} satisfies Record<string, { label: string; color: string }>;

export function AgentMetricsCharts({
  requestCount,
  latency,
  errorRate,
  tokenUsage,
  toolUsage,
}: AgentMetricsChartsProps) {
  // Format dates for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const hasRequestData = requestCount.length > 0;
  const hasLatencyData = latency.length > 0;
  const hasErrorRateData = errorRate.length > 0;
  const hasTokenData = tokenUsage.length > 0;
  const hasToolData = toolUsage.length > 0;

  const EmptyState = ({
    message,
    height = 300,
  }: {
    message: string;
    height?: number;
  }) => (
    <div
      className="flex items-center justify-center text-sm text-muted-foreground"
      style={{ height: `${height}px` }}
    >
      {message}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Row: Key Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Request Count Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Count</CardTitle>
          </CardHeader>
          <CardContent>
            {hasRequestData ? (
              <ChartContainer
                config={chartConfig}
                className="h-[250px] w-full !aspect-auto"
              >
                <LineChart data={requestCount}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyState message="No data available" height={250} />
            )}
          </CardContent>
        </Card>

        {/* Average Latency Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Latency</CardTitle>
          </CardHeader>
          <CardContent>
            {hasLatencyData ? (
              <ChartContainer
                config={chartConfig}
                className="h-[250px] w-full !aspect-auto"
              >
                <LineChart data={latency}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyState message="No data available" height={250} />
            )}
          </CardContent>
        </Card>

        {/* Error Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {hasErrorRateData ? (
              <ChartContainer
                config={chartConfig}
                className="h-[250px] w-full !aspect-auto"
              >
                <AreaChart data={errorRate}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-3)"
                    fill="var(--chart-3)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <EmptyState message="No data available" height={250} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Token Usage and Tool Usage */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Token Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {hasTokenData ? (
              <ChartContainer
                config={chartConfig}
                className="h-[300px] w-full !aspect-auto"
              >
                <BarChart data={tokenUsage}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--chart-4)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState message="No token usage data available" height={300} />
            )}
          </CardContent>
        </Card>

        {/* Tool Usage Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tool Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {hasToolData ? (
              <div className="h-[300px] w-full flex items-center justify-center">
                <ChartContainer
                  config={chartConfig}
                  className="h-full w-full max-w-[400px] !aspect-auto"
                >
                  <PieChart>
                    <Pie
                      data={toolUsage.map((item) => ({
                        ...item,
                        fill:
                          chartConfig[item.toolName as keyof typeof chartConfig]
                            ?.color || "var(--chart-1)",
                      }))}
                      dataKey="count"
                      nameKey="toolName"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ toolName, count }) => `${toolName}: ${count}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <EmptyState message="No tool usage data available" height={300} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

