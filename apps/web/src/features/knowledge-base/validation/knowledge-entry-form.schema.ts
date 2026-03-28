import { z } from "zod";

export const createKnowledgeEntryFormSchema = z.object({
  term: z
    .string()
    .trim()
    .min(1, "Term is required")
    .max(100, "Term must be less than 100 characters"),
  definition: z
    .string()
    .trim()
    .min(1, "Definition is required")
    .max(5000, "Definition must be less than 5000 characters"),
  context: z
    .string()
    .max(1000, "Context must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  examples: z.string().optional().or(z.literal("")),
  boost: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 2;
      },
      { message: "Boost must be a number between 0 and 2" },
    ),
  category: z.enum(["medical", "legal", "technical", "custom"]).optional(),
});

export const editKnowledgeEntryFormSchema =
  createKnowledgeEntryFormSchema.extend({
    isActive: z.boolean(),
  });

export type CreateKnowledgeEntryFormValues = z.infer<
  typeof createKnowledgeEntryFormSchema
>;
export type EditKnowledgeEntryFormValues = z.infer<
  typeof editKnowledgeEntryFormSchema
>;
