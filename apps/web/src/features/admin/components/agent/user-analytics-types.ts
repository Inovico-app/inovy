export interface UserAnalyticsChartsProps {
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

export const chartConfig = {
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
