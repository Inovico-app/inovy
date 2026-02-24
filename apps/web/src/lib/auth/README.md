# Client-Specified Authentication Requirements (SSD-5.2.01)

This implementation provides a comprehensive system for enforcing client-specified authentication requirements, ensuring compliance with NEN 7510 and healthcare security standards.

## Overview

The authentication policy system allows organizations to:

1. **Configure credential policies**: Password complexity, history, and expiration
2. **Require MFA**: Enforce multi-factor authentication for all users
3. **Manage sessions**: Configure timeout and inactivity policies
4. **Control access**: IP whitelisting and authentication method restrictions
5. **Account protection**: Failed login attempt tracking and automatic lockouts

## Database Schema

### Tables

1. **organization_auth_policies**: Organization-specific authentication requirements
   - Password policies (length, complexity, history, expiration)
   - MFA requirements (required, grace period)
   - Session policies (timeout, inactivity)
   - Account protection (max attempts, lockout duration)
   - Allowed authentication methods
   - IP whitelist

2. **user_mfa_settings**: User-level MFA configuration
   - TOTP secret and enablement status
   - Backup codes (hashed)
   - Enrollment and verification timestamps

3. **password_history**: Password change history for reuse prevention
   - User ID and password hash
   - Created timestamp

4. **login_attempts**: Login attempt tracking for security monitoring
   - User ID, email, success status
   - IP address, user agent
   - Failure reason
   - Timestamp

5. **account_lockouts**: Temporary account locks after failed attempts
   - User ID, locked until timestamp
   - Lock reason and unlock status

## Core Components

### 1. MFA Utilities (`mfa-utils.ts`)

Provides TOTP-based multi-factor authentication:

- **TOTP Secret Generation**: Creates Base32-encoded secrets
- **QR Code URL Generation**: For authenticator app enrollment
- **TOTP Verification**: Validates 6-digit time-based codes with time window
- **Backup Codes**: Generates and validates one-time backup codes
- **Password Validation**: Enforces organization-specific password policies

### 2. Auth Policy Service (`auth-policy-service.ts`)

Business logic for enforcing authentication policies:

- **Password Validation**: Checks against organization-specific requirements
- **Login Allowance Checks**: IP whitelisting, failed attempt tracking
- **Login Attempt Recording**: Tracks successful and failed logins
- **MFA Requirement Checks**: Determines if MFA is required with grace periods
- **Auth Method Allowance**: Validates allowed authentication methods

### 3. Auth Policy Enforcement (`auth-policy-enforcement.ts`)

Runtime enforcement of authentication policies:

- **Password Policy Enforcement**: Validates and enforces password rules
- **Password Change Recording**: Maintains password history
- **Login Policy Enforcement**: Checks IP, lockouts, and records attempts
- **Auth Method Validation**: Ensures only allowed methods are used

### 4. Data Access Layer (`organization-auth-policy.queries.ts`)

Database queries for all auth policy operations:

- **OrganizationAuthPolicyQueries**: CRUD for organization policies
- **UserMfaQueries**: MFA settings management
- **PasswordHistoryQueries**: Password history tracking
- **LoginAttemptQueries**: Login attempt logging
- **AccountLockoutQueries**: Account lock management

## Server Actions

### Auth Policy Actions (`auth-policy.actions.ts`)

- `updateAuthPolicy`: Update organization authentication policy
- `getAuthPolicy`: Retrieve current authentication policy
- `deleteAuthPolicy`: Remove custom policy (revert to defaults)

### MFA Actions (`mfa.actions.ts`)

- `enrollMfa`: Initiate MFA enrollment (generates QR code)
- `verifyMfaEnrollment`: Complete MFA setup (verifies code, returns backup codes)
- `disableMfa`: Disable MFA (requires password confirmation)
- `verifyMfaToken`: Verify MFA token (TOTP or backup code)
- `regenerateBackupCodes`: Generate new backup codes
- `getMfaStatus`: Check current MFA status

## Client Hooks

### Auth Policy Hooks (`use-auth-policy.ts`)

- `useUpdateAuthPolicy`: Update organization auth policy
- `useGetAuthPolicy`: Fetch current auth policy
- `useDeleteAuthPolicy`: Delete custom auth policy

### MFA Hooks (`use-mfa.ts`)

- `useEnrollMfa`: Start MFA enrollment
- `useVerifyMfaEnrollment`: Complete MFA enrollment
- `useDisableMfa`: Disable MFA
- `useVerifyMfaToken`: Verify MFA token
- `useRegenerateBackupCodes`: Generate new backup codes
- `useGetMfaStatus`: Get current MFA status

## UI Components

### Security Settings Page (`/settings/security`)

Main page for security configuration with two sections:

1. **MFA Settings** (`mfa-settings.tsx`):
   - Enable/disable MFA
   - View enrollment status
   - Organization MFA requirements
   - Grace period information

2. **Auth Policy Form** (`auth-policy-form.tsx`):
   - Email verification settings
   - MFA requirements
   - Password complexity rules
   - Session management
   - Account protection

### MFA Enrollment Dialog (`mfa-enrollment-dialog.tsx`)

Three-step enrollment process:

1. **Introduction**: Explains MFA and requirements
2. **QR Code Scan**: Display QR code and manual entry key
3. **Backup Codes**: Show and allow download of backup codes

## Usage Examples

### Configuring Organization Auth Policy

```typescript
import { updateAuthPolicy } from "@/features/auth/actions/auth-policy.actions";

// Update password requirements
await updateAuthPolicy({
  organizationId: "org-123",
  passwordMinLength: 12,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  passwordHistoryCount: 5,
});

// Require MFA for all users
await updateAuthPolicy({
  organizationId: "org-123",
  requireMfa: true,
  mfaGracePeriodDays: 30,
});
```

### Enrolling in MFA

```typescript
import { enrollMfa, verifyMfaEnrollment } from "@/features/auth/actions/mfa.actions";

// Step 1: Generate QR code
const enrollResult = await enrollMfa({});
const { qrCodeUrl, manualEntryKey } = enrollResult.data.data;

// Step 2: User scans QR code and enters verification code
const verifyResult = await verifyMfaEnrollment({ token: "123456" });
const { backupCodes } = verifyResult.data.data;

// Step 3: User saves backup codes
```

### Enforcing Policies During Authentication

```typescript
import { AuthPolicyEnforcement } from "@/lib/auth/auth-policy-enforcement";

// Validate password before account creation/update
const validation = await AuthPolicyEnforcement.enforcePasswordPolicy({
  password: "MyP@ssw0rd123",
  userId: "user-123",
  organizationId: "org-123",
});

if (validation.isErr()) {
  console.error("Password policy violation:", validation.error);
}

// Check login policy and record attempt
const loginCheck = await AuthPolicyEnforcement.enforceLoginPolicy({
  email: "user@example.com",
  userId: "user-123",
  organizationId: "org-123",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  success: true,
});

if (loginCheck.isErr()) {
  console.error("Login policy violation:", loginCheck.error);
}
```

## Default Policies

If no custom policy is configured, the following defaults apply:

- **Email Verification**: Required
- **MFA**: Not required (grace period: 30 days)
- **Password**:
  - Minimum length: 8 characters
  - No complexity requirements
  - No history tracking
  - No expiration
- **Sessions**:
  - Timeout: 7 days (10,080 minutes)
  - Inactivity timeout: 1 day (1,440 minutes)
- **Account Protection**:
  - Max failed attempts: 5
  - Lockout duration: 30 minutes
  - Password reset: Allowed
- **Auth Methods**: All methods allowed (email-password, Google, Microsoft, magic-link, passkey)
- **IP Whitelist**: None (all IPs allowed)

## Integration Points

### During User Registration

1. Check if organization has custom password policy
2. Validate password against policy
3. Record password hash in history (if enabled)
4. Send verification email (if required)

### During Login

1. Check if account is locked
2. Validate IP address (if whitelist configured)
3. Check if auth method is allowed
4. Record login attempt
5. Lock account if max failed attempts reached
6. Check MFA requirement and prompt if needed

### During Password Change

1. Validate new password against policy
2. Check password history (if enabled)
3. Record new password hash
4. Optionally notify user of expiration date

## Security Considerations

### TOTP Implementation

- Uses standard HOTP/TOTP algorithm (RFC 6238)
- 30-second time window
- 6-digit codes
- Time window of ±1 period for clock skew
- Constant-time comparison to prevent timing attacks

### Backup Codes

- 10 codes generated per enrollment
- Each code is 8 characters (alphanumeric)
- Hashed using SHA-256 before storage
- Single-use only (removed after verification)
- Can be regenerated with password confirmation

### Password History

- Passwords are compared using bcrypt
- Old hashes are cleaned up based on history count
- Only applies to local email/password authentication

### Account Lockouts

- Temporary locks based on policy configuration
- Automatic unlock after duration expires
- Manual unlock available for administrators
- All lockouts are logged for audit purposes

## Compliance

This implementation helps meet the following compliance requirements:

### NEN 7510 (Information Security in Healthcare)

- Configurable authentication strength
- Password complexity enforcement
- Session management controls
- Access logging and monitoring

### AVG/GDPR

- Audit trail of login attempts
- User consent for MFA enrollment
- Right to disable MFA (if not required)
- Secure storage of authentication credentials

### SSD-5.2.01

- Client-specified authentication requirements
- Credential policy enforcement
- MFA availability where required
- Flexible configuration per organization

## Future Enhancements

Potential additions to consider:

1. **Additional MFA Methods**: SMS, hardware tokens, biometric
2. **Risk-Based Authentication**: Adaptive MFA based on login context
3. **Password Strength Meter**: Real-time feedback during password entry
4. **Session Management UI**: View and revoke active sessions
5. **Audit Log Integration**: Link auth events to main audit system
6. **Compliance Reports**: Generate reports on auth policy compliance
7. **SSO/SAML Support**: Enterprise single sign-on integration
8. **Conditional Access**: Time-based or location-based access rules
