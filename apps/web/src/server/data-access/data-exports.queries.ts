import { db } from "@/server/db";
import {
  dataExports,
  type DataExport,
  type ExportStatus,
  type NewDataExport,
} from "@/server/db/schema/data-exports";
import { and, desc, eq, lte } from "drizzle-orm";

export class DataExportsQueries {
  static async createExport(data: NewDataExport): Promise<DataExport> {
    const [export_] = await db.insert(dataExports).values(data).returning();
    return export_;
  }

  static async getExportById(id: string): Promise<DataExport | null> {
    const [export_] = await db
      .select()
      .from(dataExports)
      .where(eq(dataExports.id, id))
      .limit(1);
    return export_ ?? null;
  }

  static async getExportsByUserId(
    userId: string,
    organizationId: string
  ): Promise<DataExport[]> {
    return await db
      .select()
      .from(dataExports)
      .where(
        and(
          eq(dataExports.userId, userId),
          eq(dataExports.organizationId, organizationId)
        )
      )
      .orderBy(desc(dataExports.createdAt));
  }

  static async updateExportStatus(
    id: string,
    status: ExportStatus,
    updates?: {
      fileData?: Buffer;
      fileSize?: number;
      recordingsCount?: number;
      tasksCount?: number;
      conversationsCount?: number;
      errorMessage?: string | null;
      completedAt?: Date;
    }
  ): Promise<DataExport | undefined> {
    const [updated] = await db
      .update(dataExports)
      .set({
        status,
        ...updates,
      })
      .where(eq(dataExports.id, id))
      .returning();
    return updated;
  }

  static async getExportFileData(id: string): Promise<Buffer | null> {
    const [export_] = await db
      .select({ fileData: dataExports.fileData })
      .from(dataExports)
      .where(eq(dataExports.id, id))
      .limit(1);
    return export_?.fileData ?? null;
  }

  /**
   * Delete expired data exports
   * Deletes exports that have passed their expiration date
   */
  static async deleteExpiredExports(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(dataExports)
      .where(and(eq(dataExports.status, "completed"), lte(dataExports.expiresAt, now)));
    return result.rowCount ?? 0;
  }

  /**
   * Delete all exports for a specific user
   */
  static async deleteByUserId(
    userId: string,
    organizationId: string
  ): Promise<number> {
    const result = await db
      .delete(dataExports)
      .where(
        and(
          eq(dataExports.userId, userId),
          eq(dataExports.organizationId, organizationId)
        )
      );
    return result.rowCount ?? 0;
  }
}

