"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";

interface UserAnalyticsPerformanceProps {
  queryComplexity: {
    averageQueryLength: number;
    averageTokenCount: number;
    totalTokens: number;
    averageLatency: number;
    errorRate: number;
  };
}

export function UserAnalyticsPerformance({
  queryComplexity,
}: UserAnalyticsPerformanceProps) {
  return (
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
  );
}
