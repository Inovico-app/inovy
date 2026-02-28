# Brute-Force Protection Implementation

## Overview

This document describes the implementation of brute-force protection and account lockout mechanisms to prevent password attacks and credential stuffing.

## Compliance

This implementation satisfies the requirements for:
- **SSD-5.2.04**: Protect against brute-force and password attacks
- **Linear Issue**: INO2-339

## Features

### 1. Rate Limiting on Login Attempts

**Better Auth Rate Limiting** is enabled with the following configuration:

```typescript
rateLimit: {
  enabled: true,
  window: 60,
  max: 100,
  customRules: {
    "/sign-in/email": {
      window: 10,
      max: 3,
    },
    "/sign-in/passkey": {
      window: 10,
      max: 5,
    },
    "/reset-password": {
      window: 60,
      max: 3,
    },
    "/verify-email": {
      window: 60,
      max: 5,
    },
  },
}
```

This provides:
- Maximum 3 email/password login attempts per 10 seconds
- Maximum 5 passkey login attempts per 10 seconds
- Maximum 3 password reset attempts per 60 seconds
- Maximum 5 email verification attempts per 60 seconds

### 2. Account Lockout After Failed Attempts

**Custom Account Lockout** is implemented via `BruteForceProtectionService`:

- Tracks all login attempts (success and failure)
- Locks account after configurable number of failed attempts
- Lockout duration is configurable
- Automatic unlocking after lockout period expires
- Manual unlock capability for administrators

**Default Configuration:**
- `MAX_FAILED_ATTEMPTS`: 5 failed attempts (configurable via `MAX_FAILED_LOGIN_ATTEMPTS` env var)
- `LOCKOUT_DURATION_MINUTES`: 15 minutes (configurable via `LOCKOUT_DURATION_MINUTES` env var)
- `ATTEMPT_WINDOW_MINUTES`: 15 minutes window to count attempts (configurable via `ATTEMPT_WINDOW_MINUTES` env var)

### 3. Protection Against Credential Stuffing

The implementation protects against credential stuffing through:

1. **Rate limiting** at the API endpoint level (Better Auth)
2. **Account lockout** after repeated failed attempts
3. **IP address tracking** for forensics and potential IP-based blocking
4. **User agent tracking** to detect automated attacks
5. **Security logging** for suspicious activities

## Database Schema

### `login_attempts` Table

Tracks all login attempts (success and failure):

```sql
CREATE TABLE "login_attempts" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "user_id" text,
  "ip_address" text,
  "user_agent" text,
  "success" text NOT NULL,
  "attempted_at" timestamp DEFAULT now() NOT NULL
);
```

**Indexes:**
- `login_attempts_identifier_idx` on `identifier` (email)
- `login_attempts_userId_idx` on `user_id`
- `login_attempts_attemptedAt_idx` on `attempted_at`

### `account_lockouts` Table

Tracks active account lockouts:

```sql
CREATE TABLE "account_lockouts" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL UNIQUE,
  "locked_at" timestamp DEFAULT now() NOT NULL,
  "locked_until" timestamp NOT NULL,
  "failed_attempts" integer NOT NULL,
  "ip_address" text
);
```

**Indexes:**
- `account_lockouts_identifier_idx` on `identifier`
- `account_lockouts_lockedUntil_idx` on `locked_until`

## Service API

### `BruteForceProtectionService`

```typescript
// Singleton instance
import { bruteForceProtection } from "@/server/services/brute-force-protection.service";

// Check if account is locked
const lockoutInfo = await bruteForceProtection.checkLockout(email);
if (lockoutInfo.isLocked) {
  // Account is locked, deny access
}

// Record a login attempt
await bruteForceProtection.recordLoginAttempt({
  identifier: email,
  userId: user.id,
  ipAddress: request.ip,
  userAgent: request.userAgent,
  success: true,
});

// Manually unlock an account (admin function)
await bruteForceProtection.unlockAccount(email);

// Get lockout statistics
const stats = await bruteForceProtection.getLockoutStats();

// Cleanup old records (run periodically)
await bruteForceProtection.cleanupOldRecords();
```

## Integration

The brute-force protection is integrated into the sign-in flow:

1. **Before login attempt**: Check if account is locked
2. **After login attempt**: Record the attempt (success or failure)
3. **On failed attempt**: Increment failure count, potentially lock account
4. **On successful login**: Clear any lockout, reset failure count

## Configuration

Environment variables for customization:

```bash
# Maximum failed login attempts before lockout
MAX_FAILED_LOGIN_ATTEMPTS=5

# Lockout duration in minutes
LOCKOUT_DURATION_MINUTES=15

# Time window in minutes to count failed attempts
ATTEMPT_WINDOW_MINUTES=15

# Days to keep old login attempt records
LOGIN_ATTEMPTS_CLEANUP_DAYS=30
```

## Security Logging

All security events are logged with appropriate severity:

- **Failed login attempts**: Logged as warnings with context
- **Account lockouts**: Logged as suspicious activities
- **Successful logins**: Logged as info
- **Lockout checks while locked**: Logged as suspicious activities

All logging uses PII-safe anonymization for email addresses.

## Monitoring

The service provides statistics for monitoring:

```typescript
const stats = await bruteForceProtection.getLockoutStats();
// Returns:
// {
//   currentlyLocked: number,  // Currently locked accounts
//   last24Hours: number,      // Lockouts in last 24 hours
//   last7Days: number,        // Lockouts in last 7 days
// }
```

## Admin Functions

### Manual Account Unlock

Administrators can manually unlock accounts:

```typescript
await bruteForceProtection.unlockAccount(email);
```

### Cleanup Old Records

To maintain database performance, old login attempts should be cleaned up periodically:

```typescript
await bruteForceProtection.cleanupOldRecords();
```

This should be scheduled as a daily cron job.

## Testing

To test the implementation:

1. **Test rate limiting**: Attempt multiple rapid logins (should be rate-limited by Better Auth)
2. **Test account lockout**: Make 5 failed login attempts → account should lock for 15 minutes
3. **Test locked account message**: Try to login with locked account → should see lockout message
4. **Test successful login**: After lockout expires or manual unlock → login should work
5. **Test cleanup**: Verify old records are removed after configured days

## Migration

Run the database migration:

```bash
pnpm db:migrate
```

The migration file is: `0058_login-brute-force-protection.sql`

## Acceptance Criteria

✅ **Rate limiting on login attempts**: Implemented via Better Auth rate limiting (3 attempts per 10 seconds)

✅ **Account lockout after failed attempts**: Implemented via `BruteForceProtectionService` (5 attempts → 15 minute lockout)

✅ **Protection against credential stuffing**: Implemented via rate limiting, account lockout, IP tracking, and security logging

## Future Enhancements

Potential improvements for future consideration:

1. **IP-based rate limiting**: Block or slow down requests from specific IPs
2. **CAPTCHA integration**: Require CAPTCHA after several failed attempts
3. **Email notifications**: Notify users of suspicious login attempts
4. **Geographic anomaly detection**: Detect logins from unusual locations
5. **Device fingerprinting**: Track and verify known devices
6. **Multi-factor authentication**: Require 2FA for high-risk accounts
7. **Password breach detection**: Check passwords against known breach databases

## References

- SSD-5: Mechanisme voor identificatie en authenticatie
- SSD-5.2.04: Het inlogmechanisme is robuust tegen herhaaldelijke, geautomatiseerde of verdachte pogingen om wachtwoorden te raden
- [Better Auth Rate Limiting](https://better-auth.com/docs/concepts/rate-limit)
