import { and, count, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  feedback,
  type Feedback,
  type NewFeedback,
} from "../db/schema/feedback";
import { recordings } from "../db/schema/recordings";

interface FeedbackStats {
  total: number;
  positiveCount: number;
  negativeCount: number;
  byType: {
    summary: { positive: number; negative: number };
    transcription: { positive: number; negative: number };
    general: { positive: number; negative: number };
  };
}

interface FeedbackFilters {
  type?: "summary" | "transcription" | "general";
  rating?: "positive" | "negative";
}

interface FeedbackWithRecording extends Feedback {
  recordingTitle: string | null;
}

export class FeedbackQueries {
  static async create(data: NewFeedback): Promise<Feedback> {
    const [result] = await db.insert(feedback).values(data).returning();
    return result;
  }

  static async getByUserAndRecording(
    userId: string,
    recordingId: string,
  ): Promise<Feedback[]> {
    return db
      .select()
      .from(feedback)
      .where(
        and(eq(feedback.userId, userId), eq(feedback.recordingId, recordingId)),
      );
  }

  static async getAggregateStats(
    organizationId: string,
  ): Promise<FeedbackStats> {
    const rows = await db
      .select({
        type: feedback.type,
        rating: feedback.rating,
        count: count(),
      })
      .from(feedback)
      .where(eq(feedback.organizationId, organizationId))
      .groupBy(feedback.type, feedback.rating);

    const stats: FeedbackStats = {
      total: 0,
      positiveCount: 0,
      negativeCount: 0,
      byType: {
        summary: { positive: 0, negative: 0 },
        transcription: { positive: 0, negative: 0 },
        general: { positive: 0, negative: 0 },
      },
    };

    for (const row of rows) {
      const c = row.count;
      stats.total += c;
      if (row.rating === "positive") stats.positiveCount += c;
      if (row.rating === "negative") stats.negativeCount += c;

      const typeKey = row.type as keyof typeof stats.byType;
      if (stats.byType[typeKey]) {
        if (row.rating === "positive") stats.byType[typeKey].positive += c;
        if (row.rating === "negative") stats.byType[typeKey].negative += c;
      }
    }

    return stats;
  }

  static async getByOrganization(
    organizationId: string,
    filters?: FeedbackFilters,
  ): Promise<FeedbackWithRecording[]> {
    const conditions = [eq(feedback.organizationId, organizationId)];

    if (filters?.type) {
      conditions.push(eq(feedback.type, filters.type));
    }
    if (filters?.rating) {
      conditions.push(eq(feedback.rating, filters.rating));
    }

    return db
      .select({
        id: feedback.id,
        organizationId: feedback.organizationId,
        userId: feedback.userId,
        recordingId: feedback.recordingId,
        type: feedback.type,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt,
        recordingTitle: recordings.title,
      })
      .from(feedback)
      .leftJoin(recordings, eq(feedback.recordingId, recordings.id))
      .where(and(...conditions))
      .orderBy(sql`${feedback.createdAt} DESC`);
  }
}

export type { FeedbackStats, FeedbackFilters, FeedbackWithRecording };
