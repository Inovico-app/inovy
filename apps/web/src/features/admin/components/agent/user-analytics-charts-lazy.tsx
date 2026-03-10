"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { UserAnalyticsCharts } from "./user-analytics-charts";

const LazyUserAnalyticsCharts = dynamic(
  () =>
    import("./user-analytics-charts").then((m) => m.UserAnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    ),
  }
);

export function UserAnalyticsChartsLazy(
  props: ComponentProps<typeof UserAnalyticsCharts>
) {
  return <LazyUserAnalyticsCharts {...props} />;
}
