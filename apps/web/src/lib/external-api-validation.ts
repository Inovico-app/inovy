import { logger } from "@/lib/logger";
import { z } from "zod";

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

export function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }

  try {
    const url = new URL(input);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeObject(obj: unknown): Record<string, unknown> {
  if (typeof obj !== "object" || obj === null) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    if (sanitizedKey) {
      if (typeof value === "string") {
        sanitized[sanitizedKey] = sanitizeString(value);
      } else if (typeof value === "object" && value !== null) {
        sanitized[sanitizedKey] = sanitizeObject(value);
      } else if (typeof value === "number" || typeof value === "boolean") {
        sanitized[sanitizedKey] = value;
      }
    }
  }
  return sanitized;
}

export function validateExternalApiResponse<T>(
  response: unknown,
  schema: z.ZodSchema<T>,
  apiName: string
): ValidationResult<T> {
  try {
    const sanitized = sanitizeObject(response);
    const validated = schema.parse(sanitized);
    return { success: true, data: validated };
  } catch (error) {
    logger.error("External API response validation failed", {
      component: "validateExternalApiResponse",
      apiName,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
          : "Invalid response format",
    };
  }
}

export function validateAndSanitizeWebhookPayload<T>(
  payload: unknown,
  schema: z.ZodSchema<T>,
  webhookSource: string
): ValidationResult<T> {
  try {
    const validated = schema.parse(payload);
    return { success: true, data: validated };
  } catch (error) {
    logger.error("Webhook payload validation failed", {
      component: "validateAndSanitizeWebhookPayload",
      webhookSource,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
          : "Invalid payload format",
    };
  }
}

export const externalApiErrorSchema = z.object({
  error: z.object({
    message: z.string().optional(),
    type: z.string().optional(),
    code: z.string().optional(),
  }),
});

export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeString(error.message);
  }

  if (typeof error === "string") {
    return sanitizeString(error);
  }

  if (typeof error === "object" && error !== null) {
    const result = externalApiErrorSchema.safeParse(error);
    if (result.success) {
      return sanitizeString(
        result.data.error.message ?? "Unknown external API error"
      );
    }
  }

  return "Unknown error";
}

export function isolateExternalData<T>(
  data: T,
  allowedFields: readonly (keyof T)[]
): Partial<T> {
  const isolated: Partial<T> = {};
  for (const field of allowedFields) {
    if (field in (data as object)) {
      isolated[field] = data[field];
    }
  }
  return isolated;
}
