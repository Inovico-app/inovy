"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";

interface UserAnalyticsQualityProps {
  qualityIndicators: {
    averageResponseQuality: number;
    followUpRate: number;
    reEngagementRate: number;
    averageSourcesPerResponse: number;
  };
  conversationPatterns: {
    averageDuration: number;
    longestConversation: number;
    singleMessageConversations: number;
    singleMessagePercentage: number;
  };
}

export function UserAnalyticsQuality({
  qualityIndicators,
  conversationPatterns,
}: UserAnalyticsQualityProps) {
  return (
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
  );
}
