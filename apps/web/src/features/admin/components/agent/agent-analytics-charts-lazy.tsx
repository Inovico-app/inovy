"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { AgentAnalyticsCharts } from "./agent-analytics-charts";

const LazyAgentAnalyticsCharts = dynamic(
  () =>
    import("./agent-analytics-charts").then((m) => m.AgentAnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    ),
  }
);

export function AgentAnalyticsChartsLazy(
  props: ComponentProps<typeof AgentAnalyticsCharts>
) {
  return <LazyAgentAnalyticsCharts {...props} />;
}
