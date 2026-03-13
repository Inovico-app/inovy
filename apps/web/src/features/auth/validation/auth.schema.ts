import { z } from "zod";

const safeRelativeUrl = z
  .string()
  .regex(/^\/(?!\/)/, "Must be a relative path (no protocol-relative URLs)");

const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const signUpEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: strongPasswordSchema,
  name: z.string().min(1, "Name is required"),
  callbackUrl: safeRelativeUrl.optional(),
});

export const signInEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  redirectTo: safeRelativeUrl.optional(),
});

export const magicLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: strongPasswordSchema,
});

export const socialSignInSchema = z.object({
  provider: z.enum(["google", "microsoft"]),
  callbackUrl: safeRelativeUrl.optional(),
});

export const passkeySignInSchema = z.object({
  // Passkey sign-in doesn't require input parameters
  // The browser handles the credential selection
});

