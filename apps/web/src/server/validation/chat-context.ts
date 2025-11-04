import { z } from "zod";

export const chatContextSchema = z.discriminatedUnion("context", [
  z.object({
    context: z.literal("organization"),
  }),
  z.object({
    context: z.literal("project"),
    projectId: z.string().uuid(),
  }),
]);

export type ChatContext = z.infer<typeof chatContextSchema>;

