import z from "zod";

/**
 * Knowledge Base Validation Schemas
 * Type-safe input validation for knowledge base operations
 */

/**
 * Scope enum validation
 */
export const knowledgeBaseScopeSchema = z.enum([
  "project",
  "organization",
  "global",
]);

/**
 * Create knowledge entry schema
 */
export const createKnowledgeEntrySchema = z.object({
  scope: knowledgeBaseScopeSchema,
  scopeId: z
    .string()
    .nullable()
    .refine(
      (val) => {
        // scopeId is required for project/organization, null for global
        return val !== null || val === null; // This will be validated in the service layer
      },
      {
        message: "scopeId must be provided for project/organization scope",
      }
    ),
  term: z
    .string()
    .min(1, "Term is required")
    .max(100, "Term must be less than 100 characters")
    .trim(),
  definition: z
    .string()
    .min(1, "Definition is required")
    .max(5000, "Definition must be less than 5000 characters")
    .trim(),
  context: z
    .string()
    .max(1000, "Context must be less than 1000 characters")
    .nullable()
    .optional(),
  examples: z.array(z.string().max(500)).nullable().optional(),
});

export type CreateKnowledgeEntryInput = z.infer<
  typeof createKnowledgeEntrySchema
>;

/**
 * Update knowledge entry schema (partial update)
 */
export const updateKnowledgeEntrySchema = z.object({
  term: z
    .string()
    .min(1, "Term is required")
    .max(100, "Term must be less than 100 characters")
    .trim()
    .optional(),
  definition: z
    .string()
    .min(1, "Definition is required")
    .max(5000, "Definition must be less than 5000 characters")
    .trim()
    .optional(),
  context: z
    .string()
    .max(1000, "Context must be less than 1000 characters")
    .nullable()
    .optional(),
  examples: z.array(z.string().max(500)).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateKnowledgeEntryInput = z.infer<
  typeof updateKnowledgeEntrySchema
>;

/**
 * Allowed file types for document uploads
 */
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf", // PDF
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/msword", // DOC
  "text/plain", // TXT
  "text/markdown", // MD
] as const;

/**
 * Maximum file size: 50MB
 */
export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB in bytes

/**
 * Upload knowledge document schema
 */
export const uploadKnowledgeDocumentSchema = z.object({
  scope: knowledgeBaseScopeSchema,
  scopeId: z.string().nullable(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .nullable()
    .optional(),
  // File validation will be done separately since we can't validate File objects in Zod schema
  // File size and type validation should be done in the service layer
});

export type UploadKnowledgeDocumentInput = z.infer<
  typeof uploadKnowledgeDocumentSchema
>;

/**
 * Search knowledge schema
 */
export const searchKnowledgeSchema = z.object({
  scope: knowledgeBaseScopeSchema,
  scopeId: z.string().nullable(),
  searchTerm: z
    .string()
    .min(1, "Search term is required")
    .max(200, "Search term must be less than 200 characters")
    .trim(),
});

export type SearchKnowledgeInput = z.infer<typeof searchKnowledgeSchema>;

/**
 * Delete knowledge entry schema
 */
export const deleteKnowledgeEntrySchema = z.object({
  id: z.string().uuid("Invalid entry ID"),
});

export type DeleteKnowledgeEntryInput = z.infer<
  typeof deleteKnowledgeEntrySchema
>;

/**
 * Promote knowledge entry schema
 */
export const promoteKnowledgeEntrySchema = z.object({
  entryId: z.string().uuid("Invalid entry ID"),
  toScope: knowledgeBaseScopeSchema.refine(
    (val) => val !== "project",
    {
      message: "Cannot promote to project scope. Use organization or global.",
    }
  ),
});

export type PromoteKnowledgeEntryInput = z.infer<
  typeof promoteKnowledgeEntrySchema
>;

/**
 * Delete knowledge document schema
 */
export const deleteKnowledgeDocumentSchema = z.object({
  id: z.string().uuid("Invalid document ID"),
});

export type DeleteKnowledgeDocumentInput = z.infer<
  typeof deleteKnowledgeDocumentSchema
>;

