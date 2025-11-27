import { betterAuthInstance } from "@/lib/better-auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Better Auth API route handler
 *
 * This catch-all route handles all Better Auth endpoints:
 * - /api/auth/sign-up
 * - /api/auth/sign-in
 * - /api/auth/sign-out
 * - /api/auth/session
 * - /api/auth/organization/*
 * - /api/auth/magic-link/*
 * - /api/auth/passkey/*
 * - /api/auth/stripe/*
 * - And all other Better Auth endpoints
 *
 * Note: Kinde auth route remains at /api/auth/[kindeAuth] until Phase 7
 */
export const { GET, POST } = toNextJsHandler(betterAuthInstance);

