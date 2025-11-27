import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  knowledgeBaseDocuments,
  type DocumentProcessingStatus,
} from "../db/schema/knowledge-base-documents";
import type { KnowledgeBaseScope } from "../db/schema/knowledge-base-entries";
import type {
  CreateKnowledgeDocumentDto,
  KnowledgeDocumentDto,
  UpdateKnowledgeDocumentDto,
} from "../dto/knowledge-base.dto";

/**
 * Database queries for Knowledge Base Documents operations
 * Pure data access layer - no business logic
 */
export class KnowledgeBaseDocumentsQueries {
  /**
   * Create a new knowledge base document record
   */
  static async createDocument(
    data: CreateKnowledgeDocumentDto
  ): Promise<KnowledgeDocumentDto> {
    const [document] = await db
      .insert(knowledgeBaseDocuments)
      .values({
        scope: data.scope,
        scopeId: data.scopeId,
        title: data.title,
        description: data.description ?? null,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        createdById: data.createdById,
        processingStatus: "pending",
      })
      .returning();

    return {
      id: document.id,
      scope: document.scope,
      scopeId: document.scopeId,
      title: document.title,
      description: document.description,
      fileUrl: document.fileUrl,
      fileName: document.fileName,
      fileSize: document.fileSize,
      fileType: document.fileType,
      extractedText: document.extractedText,
      processingStatus: document.processingStatus,
      processingError: document.processingError,
      createdById: document.createdById,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * Update document metadata
   */
  static async updateDocument(
    id: string,
    data: UpdateKnowledgeDocumentDto
  ): Promise<KnowledgeDocumentDto | null> {
    const [document] = await db
      .update(knowledgeBaseDocuments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeBaseDocuments.id, id))
      .returning();

    if (!document) return null;

    return {
      id: document.id,
      scope: document.scope,
      scopeId: document.scopeId,
      title: document.title,
      description: document.description,
      fileUrl: document.fileUrl,
      fileName: document.fileName,
      fileSize: document.fileSize,
      fileType: document.fileType,
      extractedText: document.extractedText,
      processingStatus: document.processingStatus,
      processingError: document.processingError,
      createdById: document.createdById,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * Delete a document record
   */
  static async deleteDocument(id: string): Promise<boolean> {
    const result = await db
      .delete(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Get document by ID
   */
  static async getDocumentById(
    id: string
  ): Promise<KnowledgeDocumentDto | null> {
    const [document] = await db
      .select()
      .from(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.id, id))
      .limit(1);

    if (!document) return null;

    return {
      id: document.id,
      scope: document.scope,
      scopeId: document.scopeId,
      title: document.title,
      description: document.description,
      fileUrl: document.fileUrl,
      fileName: document.fileName,
      fileSize: document.fileSize,
      fileType: document.fileType,
      extractedText: document.extractedText,
      processingStatus: document.processingStatus,
      processingError: document.processingError,
      createdById: document.createdById,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * Get documents by scope
   */
  static async getDocumentsByScope(
    scope: KnowledgeBaseScope,
    scopeId: string | null
  ): Promise<KnowledgeDocumentDto[]> {
    const conditions = [eq(knowledgeBaseDocuments.scope, scope)];

    if (scopeId === null) {
      conditions.push(isNull(knowledgeBaseDocuments.scopeId));
    } else {
      conditions.push(eq(knowledgeBaseDocuments.scopeId, scopeId));
    }

    const documents = await db
      .select()
      .from(knowledgeBaseDocuments)
      .where(and(...conditions))
      .orderBy(knowledgeBaseDocuments.createdAt);

    return documents.map((doc) => ({
      id: doc.id,
      scope: doc.scope,
      scopeId: doc.scopeId,
      title: doc.title,
      description: doc.description,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      extractedText: doc.extractedText,
      processingStatus: doc.processingStatus,
      processingError: doc.processingError,
      createdById: doc.createdById,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  /**
   * Update document processing status
   */
  static async updateProcessingStatus(
    id: string,
    status: DocumentProcessingStatus,
    error?: string | null
  ): Promise<KnowledgeDocumentDto | null> {
    const [document] = await db
      .update(knowledgeBaseDocuments)
      .set({
        processingStatus: status,
        processingError: error ?? null,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeBaseDocuments.id, id))
      .returning();

    if (!document) return null;

    return {
      id: document.id,
      scope: document.scope,
      scopeId: document.scopeId,
      title: document.title,
      description: document.description,
      fileUrl: document.fileUrl,
      fileName: document.fileName,
      fileSize: document.fileSize,
      fileType: document.fileType,
      extractedText: document.extractedText,
      processingStatus: document.processingStatus,
      processingError: document.processingError,
      createdById: document.createdById,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}

