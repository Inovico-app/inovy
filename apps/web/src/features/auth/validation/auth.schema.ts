import { z } from "zod";

const safeRelativeUrl = z
  .string()
  .regex(/^\/(?!\/)/, "Must be a relative path (no protocol-relative URLs)");

export const signUpEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const socialSignInSchema = z.object({
  provider: z.enum(["google", "microsoft"]),
  callbackUrl: safeRelativeUrl.optional(),
});

export const passkeySignInSchema = z.object({
  // Passkey sign-in doesn't require input parameters
  // The browser handles the credential selection
});

