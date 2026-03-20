// src/server/validation/bot/unsubscribe-from-series.schema.ts
import { z } from "zod";

export const unsubscribeFromSeriesSchema = z.object({
  subscriptionId: z.string().uuid(),
});
