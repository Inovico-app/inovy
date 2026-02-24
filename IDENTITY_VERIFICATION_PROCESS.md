# Identity Verification Process Documentation

## Overview

This document describes the identity verification and authentication security measures implemented in the Inovy application to comply with SSD-5.2.02 (Baseline Informatiebeveiliging Overheid) requirements.

**SSD Requirement**: The configuration of the identification and authentication facility ensures that the authenticated person/system is indeed the identified person/system.

## Table of Contents

1. [Authentication Mechanisms](#authentication-mechanisms)
2. [Identity Verification Process](#identity-verification-process)
3. [Account Takeover Protection](#account-takeover-protection)
4. [Session Management](#session-management)
5. [Anomaly Detection](#anomaly-detection)
6. [Audit Logging](#audit-logging)
7. [Security Best Practices](#security-best-practices)

---

## Authentication Mechanisms

### Overview

The application implements multiple strong authentication mechanisms using Better Auth framework:

### 1. Email/Password Authentication

**Implementation**: `apps/web/src/lib/auth.ts`

**Features**:
- Email verification required before first login
- Secure password hashing using industry-standard algorithms
- Password reset with time-limited tokens
- Automatic session revocation on password reset

**Process**:
1. User registers with email and password
2. Verification email sent automatically
3. User clicks verification link
4. Account activated and auto-signed in
5. Subsequent logins require valid credentials

**Configuration**:
```typescript
emailAndPassword: {
  enabled: true,
  autoSignIn: true,
  revokeSessionsOnPasswordReset: true,
  requireEmailVerification: true,
}
```

### 2. OAuth 2.0 Social Providers

**Supported Providers**:
- Google
- Microsoft

**Implementation**: `apps/web/src/lib/auth.ts`

**Identity Verification**:
- Delegates identity verification to trusted OAuth providers
- Providers perform their own authentication (often including 2FA)
- Account linking enabled for trusted providers
- Automatic profile updates on sign-in

**Configuration**:
```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    prompt: "select_account consent",
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    tenantId: process.env.MICROSOFT_TENANT_ID,
  },
}
```

**Account Linking**:
- Trusted providers can be linked to existing accounts
- Email matching used for account identification
- Prevents duplicate accounts for same user

### 3. Magic Link Authentication

**Implementation**: `apps/web/src/lib/auth.ts`

**Process**:
1. User enters email address
2. Time-limited magic link sent to email
3. User clicks link to authenticate
4. Session created after email verification

**Security Features**:
- Single-use tokens
- Time-limited expiration
- Stored securely in database
- Indexed for fast validation

### 4. Passkey/WebAuthn Authentication

**Implementation**: `apps/web/src/lib/auth.ts`

**Features**:
- Hardware-backed cryptographic authentication
- Biometric authentication support
- Phishing-resistant authentication
- Device-bound credentials

**Security Benefits**:
- Most secure authentication method
- Prevents credential theft and phishing
- No password to compromise
- Built-in device verification

**Configuration**:
```typescript
passkey({
  rpID: process.env.BETTER_AUTH_URL?.replace(/https?:\/\//, "").split("/")[0],
  rpName: "Inovy",
})
```

### 5. Two-Factor Authentication (2FA)

**Implementation**: `apps/web/src/lib/auth.ts`

**Supported Methods**:
- TOTP (Time-based One-Time Password) via authenticator apps
- Backup codes for account recovery

**Features**:
- Optional but strongly recommended
- 10 backup codes generated
- Encrypted secret storage
- Integration with authenticator apps (Google Authenticator, Authy, etc.)

**Configuration**:
```typescript
twoFactor({
  issuer: "Inovy",
  backupCodeLength: 10,
  backupCodeCount: 10,
})
```

---

## Identity Verification Process

### New User Registration

#### Email/Password Registration Flow

1. **User Submits Registration**
   - Email address collected
   - Password validated (minimum requirements)
   - User record created in database

2. **Email Verification Sent**
   - Verification email sent automatically
   - Time-limited verification token generated
   - Token stored securely in database

3. **Email Verification**
   - User clicks verification link
   - Token validated and marked as used
   - `emailVerified` flag set to `true`
   - User automatically signed in

4. **Organization Creation**
   - Personal organization created automatically
   - User assigned as organization owner
   - Organization slug generated from email

5. **Session Establishment**
   - Secure session token generated
   - Session stored in database with:
     - User ID binding
     - IP address
     - User agent
     - Organization context
   - Session cookie set with security flags

#### OAuth Registration Flow

1. **OAuth Redirect**
   - User clicks social provider button
   - Redirected to provider's authentication page
   - State parameter prevents CSRF attacks

2. **Provider Authentication**
   - User authenticates with provider
   - Provider verifies user identity
   - OAuth tokens returned

3. **Account Creation/Linking**
   - Check if account with email exists
   - If exists and trusted provider: link accounts
   - If new: create user account
   - OAuth tokens encrypted and stored

4. **Profile Synchronization**
   - Name and email imported from provider
   - Profile picture URL imported
   - Email automatically verified (trusted provider)

5. **Organization & Session**
   - Same as email/password flow
   - Organization created if needed
   - Session established with context

### Existing User Authentication

#### Email/Password Sign-In

1. **Credential Validation**
   - Email looked up in database
   - Password hash compared
   - Email verification status checked

2. **Anomaly Detection** (see [Anomaly Detection](#anomaly-detection))
   - Login pattern analyzed
   - Risk level calculated
   - Recommended action determined

3. **2FA Challenge** (if enabled)
   - 2FA required for high-risk logins
   - TOTP code requested
   - Backup code accepted as alternative

4. **Session Creation**
   - Session token generated
   - Context captured (IP, user agent, device)
   - Active organization set
   - Audit log entry created

#### OAuth Sign-In

1. **OAuth Flow**
   - User redirects to provider
   - Provider authentication
   - OAuth tokens returned

2. **Account Lookup**
   - Account found by provider ID
   - User identity verified
   - Profile updated if changes detected

3. **Anomaly Detection & Session**
   - Same anomaly detection as email/password
   - Session created with context
   - Audit log entry created

---

## Account Takeover Protection

### Multi-Layer Protection Strategy

#### 1. Email Verification

**Purpose**: Verify email ownership
**Implementation**: Required before first login
**Protection**: Prevents registration with unowned emails

#### 2. Strong Password Requirements

**Purpose**: Prevent weak credentials
**Implementation**: Password validation on client and server
**Protection**: Reduces brute-force attack success

#### 3. Rate Limiting

**Implementation**: `apps/web/src/lib/rate-limit.ts`

**Protection Levels**:
- User tier-based limits
- Request-based limiting
- Cost-based limiting for expensive operations

**Thresholds**:
- Free tier: 100 requests/hour
- Pro tier: 1000 requests/hour
- Enterprise tier: 10000 requests/hour

**Response**: 429 Too Many Requests with retry-after header

#### 4. Session Security

**Implementation**: `apps/web/src/lib/auth.ts`

**Security Measures**:
- Database-backed sessions (not JWT-only)
- Session tokens are cryptographically random
- Sessions store IP address and user agent
- Session expiration: 7 days
- Session refresh: 1 day update age
- Fresh age: 10 minutes for sensitive operations

**Session Revocation**:
- All sessions revoked on password reset
- Individual session revocation supported
- Bulk session revocation available

#### 5. Organization Isolation

**Implementation**: `apps/web/src/lib/rbac/organization-isolation.ts`

**Protection**:
- Every resource scoped to organization
- Cross-organization access prevented
- 404 returned (not 403) to prevent info leakage
- Security violations logged

**Key Functions**:
- `assertOrganizationAccess()`: Validates organization access
- `verifyResourceOrganization()`: Verifies resource ownership
- `validateOrganizationContext()`: Full context validation

#### 6. Anomaly Detection

**Implementation**: `apps/web/src/server/services/auth-anomaly-detection.service.ts`

**Detection Patterns**:

**Location Anomalies**:
- New IP address detection
- Risk level: Medium (if limited IP history)
- Risk level: Low (if multiple known IPs)

**Device Anomalies**:
- New user agent detection
- Risk level: Medium
- Tracks device fingerprint changes

**Rapid Login Attempts**:
- Multiple logins within 5 minutes
- Risk level: High
- Indicates possible credential stuffing

**Failed Login Attempts**:
- 5+ failed attempts in window
- Risk level: High
- Indicates brute force attack

**Inactivity Anomalies**:
- Login after 90+ days inactivity
- Risk level: Medium
- Unusual for compromised accounts

**Risk Scoring**:
- Low: Allow with logging
- Medium: Require 2FA (if available)
- High: Block login and alert

**Recommended Actions**:
- `allow`: Normal login
- `require_2fa`: Challenge with 2FA
- `block`: Prevent login, require verification

#### 7. Audit Logging

**Implementation**: `apps/web/src/server/db/schema/audit-logs.ts`

**Logged Events**:
- All login attempts (success and failure)
- Session creation and revocation
- Password changes and resets
- 2FA enable/disable/verify
- Account linking/unlinking
- Anomaly detection results

**Tamper Protection**:
- Hash chain implementation
- Each log entry hashes previous entry
- Tampering detection through chain validation

**Audit Trail Includes**:
- User ID
- Organization ID
- IP address
- User agent
- Timestamp
- Event metadata (including anomaly data)

#### 8. Two-Factor Authentication

**Purpose**: Add second verification factor
**Implementation**: Optional but recommended
**Protection**: Prevents account access even if password compromised

**User Flow**:
1. User enables 2FA in security settings
2. QR code displayed for authenticator app
3. User scans QR code
4. User enters verification code
5. Backup codes generated and displayed
6. 2FA activated

**Sign-In with 2FA**:
1. User enters email/password
2. If 2FA enabled: code requested
3. User enters TOTP code or backup code
4. Code validated
5. Session created

---

## Session Management

### Active Session Tracking

**Implementation**: Database-backed session storage

**Session Attributes**:
- Unique session ID
- User ID binding
- IP address
- User agent
- Active organization context
- Active team context
- Creation timestamp
- Expiration timestamp
- Token (cryptographically secure)

### Session Management Features

#### View Active Sessions

**Action**: `getActiveSessionsAction`
**File**: `apps/web/src/features/auth/actions/session-management.ts`

**Returns**:
- List of all active sessions for user
- Session details: IP, device, creation time
- Current session indicator

#### Revoke Individual Session

**Action**: `revokeSessionAction`
**File**: `apps/web/src/features/auth/actions/session-management.ts`

**Security**:
- User can only revoke their own sessions
- Cannot revoke current session
- Immediate session termination
- Audit log entry created

#### Revoke All Other Sessions

**Action**: `revokeAllOtherSessionsAction`
**File**: `apps/web/src/features/auth/actions/session-management.ts`

**Use Case**: Suspected account compromise
**Effect**: Logs out all devices except current
**Audit**: Count of revoked sessions logged

### Automatic Session Management

**Password Reset**: All sessions automatically revoked
**Account Deactivation**: All sessions terminated
**Security Violation**: Suspicious sessions can be auto-revoked

---

## Anomaly Detection

### Service Architecture

**Service**: `AuthAnomalyDetectionService`
**File**: `apps/web/src/server/services/auth-anomaly-detection.service.ts`

### Detection Algorithm

#### Analysis Window
- 30 days of historical data analyzed
- Recent sessions examined
- Audit logs reviewed

#### Risk Calculation

Each login attempt is scored across multiple dimensions:

1. **Location Check**
   - Compares IP address with historical IPs
   - New IP = anomaly
   - Risk level based on IP history diversity

2. **Device Check**
   - Compares user agent with historical devices
   - New device = anomaly
   - Medium risk assigned

3. **Rapid Login Check**
   - Detects multiple logins in 5-minute window
   - 3+ attempts = high risk
   - Indicates automated attack

4. **Failed Attempt Check**
   - Counts recent failed login attempts
   - 5+ failures = high risk
   - Indicates brute force or credential guessing

5. **Inactivity Check**
   - Measures days since last login
   - 90+ days = medium risk
   - Unusual for legitimate users

#### Risk Escalation

- Multiple anomalies increase overall risk
- Highest detected risk level applied
- 3+ reasons = automatic block

#### Recommended Actions

**Allow**:
- Risk level: Low
- Action: Normal login flow
- Logging: Standard audit log

**Require 2FA**:
- Risk level: Medium
- Action: Challenge with 2FA if enabled
- Logging: Anomaly details recorded

**Block**:
- Risk level: High
- Action: Prevent login completely
- Logging: Security alert generated
- User Action: Manual verification required

### Integration Points

#### Login Hook

**Implementation**: `apps/web/src/lib/auth/auth-hooks.ts`

**Process**:
1. Intercepts all sign-in attempts
2. Analyzes login pattern
3. Applies recommended action
4. Logs result to audit trail

#### Endpoints Covered
- `/sign-in/email`
- `/sign-in/social`
- `/magic-link/verify`

### Login History

**Action**: `getLoginHistoryAction`
**Access**: Authenticated users (own history only)

**Provides**:
- Last 20 login attempts (configurable)
- Success/failure status
- IP address and device info
- Anomaly detection results
- Timestamp

**Use Cases**:
- User reviewing account activity
- Security incident investigation
- Compliance auditing

---

## Session Management

### Session Lifecycle

#### Creation
1. Successful authentication
2. Cryptographically secure token generated
3. Context captured:
   - IP address
   - User agent
   - Organization ID
   - Team ID (if applicable)
4. Database record created
5. Cookie set with security flags

#### Maintenance
- Session refreshed every 24 hours
- Fresh session required for sensitive operations (10 minutes)
- Cookie cache enabled for performance
- Stateless refresh supported

#### Expiration
- Default: 7 days
- Configurable per deployment
- Automatic cleanup of expired sessions

#### Termination
- Manual sign-out
- Session revocation by user
- Automatic on password reset
- Security-triggered revocation

### Security Features

**Cookie Configuration**:
- HttpOnly: Prevents JavaScript access
- Secure: HTTPS only (production)
- SameSite: CSRF protection
- Path: Limited scope

**Token Security**:
- Random token generation (not predictable)
- Token hashing in database
- One-way validation

**Context Binding**:
- IP address tracked
- User agent tracked
- Organization context enforced
- Changes can trigger re-authentication

---

## Audit Logging

### Comprehensive Audit Trail

**Implementation**: `apps/web/src/server/db/schema/audit-logs.ts`

### Authentication Events Logged

#### User Events
- `user_login`: Successful login
- `user_logout`: User sign-out
- `user_created`: New user registration
- `user_updated`: Profile changes

#### Session Events
- `session_created`: New session established
- `session_revoked`: Individual session terminated
- `session_revoked_all`: All sessions terminated

#### Security Events
- `password_changed`: Password update
- `password_reset`: Password reset flow
- `email_verified`: Email verification completed
- `two_factor_enabled`: 2FA activated
- `two_factor_disabled`: 2FA deactivated
- `two_factor_verified`: 2FA code validated
- `account_linked`: OAuth account linked
- `account_unlinked`: OAuth account unlinked
- `login_anomaly_detected`: Suspicious login pattern

### Audit Log Structure

**Required Fields**:
- Event type
- Resource type
- User ID
- Organization ID
- Action
- Timestamp

**Security Context**:
- IP address
- User agent
- Metadata (flexible JSON)

**Tamper Protection**:
- Previous hash (chain link)
- Current hash (computed)
- Immutable chain
- Tampering detection

### Audit Log Access

**Permissions**: Administrators only
**Export**: Available for compliance
**Retention**: Configurable per requirements
**GDPR**: User data removable with audit trail preserved

---

## Security Best Practices

### Password Security

**Requirements**:
- Minimum length enforced
- Complexity requirements
- Common password prevention
- Secure hashing (Better Auth default)

**Best Practices**:
- Use password manager
- Enable 2FA
- Regular password rotation recommended
- Unique password per service

### Session Security

**User Recommendations**:
- Sign out on shared devices
- Review active sessions regularly
- Revoke unknown sessions immediately
- Use passkeys when available

**System Protections**:
- Automatic session expiration
- Session binding to device
- Anomaly detection
- Activity monitoring

### Account Recovery

**Password Reset**:
- Email-based verification
- Time-limited reset tokens
- All sessions revoked
- New password required

**2FA Recovery**:
- Backup codes provided
- Account recovery process
- Support ticket system

### Monitoring and Alerts

**Suspicious Activity Detection**:
- New device logins
- New location logins
- Rapid login attempts
- Failed authentication attempts
- Account recovery requests

**Security Logging**:
- All authentication events logged
- Anomaly detection results recorded
- Security violations tracked
- Compliance trail maintained

---

## Compliance and Standards

### SSD-5.2.02 Compliance

**Requirement**: Authenticated person is identified person

**Implementation**:
✅ **Strong Authentication**: Multiple authentication methods
✅ **Identity Verification**: Email verification required
✅ **Account Takeover Protection**: Multi-layer security
✅ **Session Binding**: User ID verified per session
✅ **Audit Trail**: Comprehensive logging
✅ **Anomaly Detection**: Suspicious activity monitoring

### NEN 7510 Alignment

**Information Security in Healthcare**:
- Access control: RBAC implemented
- Logging: Comprehensive audit trail
- Encryption: Data at rest and in transit
- Identity management: Strong authentication

### AVG/GDPR Compliance

**Data Protection**:
- Minimal data collection
- Purpose limitation
- User consent tracked
- Right to erasure supported
- Audit trail for compliance

---

## Technical Implementation Details

### Database Schema

**Users Table**: `apps/web/src/server/db/schema/auth.ts`
- ID (primary key)
- Email (unique, indexed)
- Email verified flag
- Password hash
- Role
- Onboarding status

**Sessions Table**: `apps/web/src/server/db/schema/auth.ts`
- ID (primary key)
- User ID (foreign key)
- Token (unique)
- Expiration timestamp
- IP address
- User agent
- Active organization
- Active team

**Two Factor Table**: `apps/web/src/server/db/schema/auth.ts`
- ID (primary key)
- User ID (foreign key)
- Secret (encrypted)
- Backup codes (encrypted)
- Creation timestamp

**Audit Logs Table**: `apps/web/src/server/db/schema/audit-logs.ts`
- ID (UUID)
- Event type
- Resource type
- User ID
- Organization ID
- Action
- IP address
- User agent
- Metadata
- Hash chain (tamper protection)

### API Endpoints

**Better Auth Endpoints**: `/api/auth/*`
- `/sign-in/email`: Email/password authentication
- `/sign-in/social`: OAuth authentication
- `/sign-up/email`: Registration
- `/magic-link/send`: Request magic link
- `/magic-link/verify`: Verify magic link
- `/sign-out`: Logout
- `/two-factor/*`: 2FA management
- `/passkey/*`: WebAuthn operations

### Security Headers

**Implementation**: Middleware layer

**Headers Applied**:
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy

---

## Operational Procedures

### Incident Response

#### Suspected Account Compromise

1. **Detection**: Anomaly detection alerts
2. **Response**: Block high-risk logins
3. **Notification**: Alert user via email
4. **Remediation**: Force password reset
5. **Review**: Audit log analysis
6. **Follow-up**: Security improvements

#### Brute Force Attack

1. **Detection**: Rate limiting triggered
2. **Response**: Temporary IP block
3. **Logging**: Attack pattern recorded
4. **Analysis**: Review audit logs
5. **Mitigation**: Adjust rate limits if needed

### Regular Security Reviews

**Monthly**:
- Review audit logs for patterns
- Check anomaly detection effectiveness
- Update risk thresholds if needed

**Quarterly**:
- Security assessment
- Penetration testing
- Update documentation

**Annually**:
- Full security audit
- Compliance review
- Third-party assessment

---

## User-Facing Documentation

### Enable Two-Factor Authentication

1. Navigate to Security Settings
2. Click "Enable 2FA"
3. Scan QR code with authenticator app
4. Enter verification code
5. Save backup codes securely
6. 2FA activated

### Review Active Sessions

1. Navigate to Security Settings
2. View "Active Sessions" section
3. See list of devices and locations
4. Revoke unknown sessions
5. Use "Sign out all other devices" for security

### Respond to Security Alerts

1. Receive email about suspicious activity
2. Review login history
3. Revoke unknown sessions
4. Change password if compromised
5. Enable 2FA for additional security

---

## Developer Guide

### Adding New Authentication Methods

1. Install plugin: `@better-auth/[plugin-name]`
2. Import in `auth.ts`
3. Add to plugins array
4. Update client in `auth-client.ts`
5. Add database schema if needed
6. Generate migration
7. Update documentation

### Integrating Anomaly Detection

**For New Login Paths**:
1. Add path to `authHooks` middleware
2. Extract login context (IP, user agent)
3. Call `AuthAnomalyDetectionService.analyzeLoginAttempt()`
4. Apply recommended action
5. Log result to audit trail

### Custom Security Rules

**Example: Require 2FA for Admins**:
```typescript
if (user.role === 'admin' && !user.twoFactorEnabled) {
  return ctx.json(
    { error: "2FA required for admin accounts" },
    { status: 403 }
  );
}
```

### Testing Authentication

**Unit Tests**:
- Test anomaly detection logic
- Test session management
- Test organization isolation

**Integration Tests**:
- Test full authentication flows
- Test 2FA workflows
- Test anomaly detection integration

**Security Tests**:
- Penetration testing
- Brute force testing
- Session hijacking testing

---

## Maintenance and Updates

### Dependency Updates

**Better Auth**:
- Monitor for security updates
- Review changelog for breaking changes
- Test in staging before production
- Update documentation as needed

### Security Patches

**Process**:
1. Security advisory received
2. Impact assessment
3. Patch applied in development
4. Testing performed
5. Staged rollout
6. Monitoring increased

### Configuration Changes

**Checklist**:
- Review security implications
- Test in staging
- Document changes
- Update runbooks
- Train support team

---

## Troubleshooting

### User Cannot Log In

**Check**:
1. Email verified?
2. Account active?
3. Rate limit exceeded?
4. Anomaly detection blocking?
5. 2FA configured correctly?

**Resolution**:
- Resend verification email
- Reset password if forgotten
- Review audit logs
- Whitelist IP if needed
- Disable 2FA if locked out (support ticket)

### Session Issues

**Symptoms**:
- Unexpected logouts
- Session not persisting
- Organization context lost

**Check**:
1. Cookie settings
2. Session expiration
3. Database connectivity
4. Redis cache (if applicable)

### Anomaly False Positives

**Adjustment Options**:
- Adjust risk thresholds
- Whitelist trusted IPs
- Extend analysis window
- Reduce sensitivity

**Configuration**: `auth-anomaly-detection.service.ts`

---

## References

### Internal Documentation
- `README.md`: Project overview
- `SSD_REMAINING_USER_STORIES.md`: Security requirements
- Better Auth Configuration: `apps/web/src/lib/auth.ts`

### External Standards
- **SSD-5**: Baseline Informatiebeveiliging Overheid
- **NEN 7510**: Information security in healthcare
- **AVG/GDPR**: Data protection regulations
- **OWASP**: Authentication best practices

### Better Auth Resources
- [Official Documentation](https://better-auth.com/docs)
- [2FA Plugin](https://better-auth.com/docs/plugins/2fa)
- [Passkey Plugin](https://better-auth.com/docs/plugins/passkey)
- [Organization Plugin](https://better-auth.com/docs/plugins/organization)

---

## Change Log

### Version 1.0.0 - 2026-02-24

**Added**:
- Two-factor authentication support
- Anomaly detection service
- Session management actions
- Enhanced audit logging for auth events
- Comprehensive identity verification documentation

**Security Enhancements**:
- Login pattern analysis
- Device fingerprinting
- Location-based risk scoring
- Automatic high-risk login blocking

**Compliance**:
- SSD-5.2.02 compliance achieved
- Documentation updated
- Audit trail enhanced

---

## Contact and Support

### Security Issues

Report security vulnerabilities to: [security contact]

### Documentation Updates

Submit pull requests with documentation improvements

### Questions

Contact the development team for clarification

---

*Last Updated: 2026-02-24*
*Version: 1.0.0*
*Status: Production*
