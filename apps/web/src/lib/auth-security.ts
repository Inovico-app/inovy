import { logger } from "@/lib/logger";
import { rateLimiter } from "@/server/services/rate-limiter.service";
import { createHash } from "crypto";

/**
 * Authentication Security Utilities
 * 
 * This module provides security functions to prevent username enumeration attacks:
 * 1. Rate limiting for authentication attempts
 * 2. Timing attack mitigation with consistent response times
 * 3. Standardized error messages
 */

const GENERIC_AUTH_ERROR = "Invalid email or password";
const GENERIC_RESET_SUCCESS = "If an account exists with this email, you will receive a password reset link";

/**
 * Get a consistent identifier for rate limiting unauthenticated requests
 * Uses a combination of email and IP address (if available from headers)
 */
export function getAuthRateLimitKey(email: string, ipAddress?: string): string {
  const identifier = ipAddress ? `${email}:${ipAddress}` : email;
  // Hash the identifier to avoid storing PII in Redis keys
  return createHash("sha256").update(identifier).digest("hex");
}

/**
 * Check rate limit for authentication attempts
 * Returns true if the request is allowed, false if rate limited
 */
export async function checkAuthRateLimit(
  email: string,
  ipAddress?: string
): Promise<{ allowed: boolean; resetAt?: number }> {
  const key = `auth:${getAuthRateLimitKey(email, ipAddress)}`;
  
  // Strict limits for authentication endpoints to prevent brute force
  // Allow 5 attempts per 15 minutes per email/IP combination
  const maxAttempts = 5;
  const windowSeconds = 15 * 60; // 15 minutes
  
  try {
    const result = await rateLimiter.checkLimit(key, maxAttempts, windowSeconds);
    
    if (!result.allowed) {
      logger.security.suspiciousActivity("Authentication rate limit exceeded", {
        component: "auth-security",
        email: "[REDACTED]",
        ipAddress: ipAddress ? "[REDACTED]" : undefined,
        action: "auth_rate_limit_exceeded",
        resetAt: result.resetAt,
      });
    }
    
    return {
      allowed: result.allowed,
      resetAt: result.resetAt,
    };
  } catch (error) {
    logger.error("Failed to check auth rate limit", {
      component: "auth-security",
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Fail open - allow the request if rate limiting fails
    return { allowed: true };
  }
}

/**
 * Add artificial delay to mitigate timing attacks
 * Ensures consistent response time regardless of whether the user exists or not
 * 
 * @param minDelayMs Minimum delay in milliseconds (default: 100ms)
 * @param maxDelayMs Maximum delay in milliseconds (default: 300ms)
 */
export async function addTimingDelay(
  minDelayMs: number = 100,
  maxDelayMs: number = 300
): Promise<void> {
  // Add random delay to prevent timing attacks
  // Random delay prevents attackers from using average response times
  const delay = Math.floor(Math.random() * (maxDelayMs - minDelayMs) + minDelayMs);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Standardized error message for authentication failures
 * Returns the same error message regardless of the failure reason
 */
export function getGenericAuthError(): string {
  return GENERIC_AUTH_ERROR;
}

/**
 * Standardized success message for password reset requests
 * Returns the same message regardless of whether the email exists
 */
export function getGenericResetMessage(): string {
  return GENERIC_RESET_SUCCESS;
}

/**
 * Execute an authentication operation with timing attack mitigation
 * Ensures consistent execution time regardless of success or failure
 * 
 * @param operation The operation to execute
 * @param targetDurationMs Target duration in milliseconds (default: 300ms)
 */
export async function executeWithConstantTiming<T>(
  operation: () => Promise<T>,
  targetDurationMs: number = 300
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const elapsed = Date.now() - startTime;
    
    // If the operation completed faster than target, add delay
    if (elapsed < targetDurationMs) {
      await new Promise((resolve) => setTimeout(resolve, targetDurationMs - elapsed));
    }
    
    return result;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    
    // Add delay even on error to maintain constant timing
    if (elapsed < targetDurationMs) {
      await new Promise((resolve) => setTimeout(resolve, targetDurationMs - elapsed));
    }
    
    throw error;
  }
}

/**
 * Extract IP address from request headers
 * Supports various proxy headers (X-Forwarded-For, X-Real-IP, etc.)
 */
export function getIpAddress(headers: Headers): string | undefined {
  // Check common proxy headers
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, use the first one
    return forwardedFor.split(",")[0]?.trim();
  }
  
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return undefined;
}
