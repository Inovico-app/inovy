# Enterprise Authentication Guide

This document provides comprehensive instructions for implementing enterprise-wide authentication, SAML/SSO integration, and user provisioning in Inovy.

## Table of Contents

- [Overview](#overview)
- [Supported Authentication Methods](#supported-authentication-methods)
- [SSO/SAML Integration](#ssosaml-integration)
- [Enterprise Directory Integration](#enterprise-directory-integration)
- [User Provisioning](#user-provisioning)
- [Configuration Examples](#configuration-examples)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Inovy supports multiple enterprise authentication methods to integrate with your organization's existing identity infrastructure:

- **OAuth 2.0 / OpenID Connect**: For Microsoft Azure AD, Google Workspace, and other identity providers
- **SAML 2.0**: For enterprise Single Sign-On (SSO) integration
- **Directory Integration**: Automatic user synchronization with Azure AD and Google Workspace
- **Multi-Factor Authentication (MFA)**: Inherited from your identity provider
- **Just-in-Time (JIT) Provisioning**: Automatic user creation on first login

## Supported Authentication Methods

### 1. Email/Password Authentication

Basic authentication with email verification:

- Email verification required before first sign-in
- Password reset functionality via email
- Password strength requirements enforced

### 2. OAuth 2.0 Providers

#### Microsoft Azure AD

Azure AD OAuth provides enterprise authentication for Microsoft 365 organizations:

**Features:**
- Single Sign-On with Microsoft accounts
- Support for Azure AD tenants
- Multi-tenant or single-tenant configuration
- Integration with Microsoft 365 services

**Configuration:**
```env
MICROSOFT_CLIENT_ID=your-azure-app-client-id
MICROSOFT_CLIENT_SECRET=your-azure-app-client-secret
MICROSOFT_TENANT_ID=common  # or your specific tenant ID
```

**Setup Instructions:**
1. Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory > App Registrations
2. Create a new app registration or use an existing one
3. Add redirect URI: `https://your-domain.com/api/auth/callback/microsoft`
4. Generate a client secret in "Certificates & secrets"
5. Configure API permissions: `User.Read`, `email`, `openid`, `profile`
6. Copy the Application (client) ID and Directory (tenant) ID

**Tenant Configuration:**
- `common`: Supports both personal Microsoft accounts and work/school accounts (multi-tenant)
- `organizations`: Supports only work/school accounts from any Azure AD tenant
- `consumers`: Supports only personal Microsoft accounts
- `{tenant-id}`: Supports only accounts from a specific Azure AD tenant

#### Google Workspace

Google OAuth provides authentication for Google Workspace organizations:

**Features:**
- Single Sign-On with Google accounts
- Google Workspace domain restriction
- Integration with Google Calendar, Gmail, and Drive
- Automatic profile synchronization

**Configuration:**
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Setup Instructions:**
1. Go to [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
4. Enable required APIs: Google Calendar API, Gmail API, Google Drive API
5. Configure OAuth consent screen with your organization's information
6. Copy the Client ID and Client Secret

### 3. SAML 2.0 Single Sign-On

SAML 2.0 enables enterprise SSO with any SAML-compliant Identity Provider (IdP):

**Supported Identity Providers:**
- Okta
- OneLogin
- Auth0
- Azure AD (via SAML)
- Google Workspace (via SAML)
- Ping Identity
- ADFS (Active Directory Federation Services)
- Any SAML 2.0 compliant IdP

**Configuration:**
The SSO plugin is enabled in the Better Auth configuration:

```typescript
import { sso } from "@better-auth/sso";

export const auth = betterAuth({
  plugins: [
    sso({
      tenantId: process.env.MICROSOFT_TENANT_ID,
    }),
    // ... other plugins
  ],
});
```

### 4. Magic Link Authentication

Passwordless authentication via email:

**Features:**
- One-click sign-in via email link
- No password required
- Expires after single use or timeout
- Secure token generation

### 5. Passkey/WebAuthn

Modern passwordless authentication using device biometrics:

**Features:**
- Biometric authentication (fingerprint, face recognition)
- Hardware security keys (YubiKey, etc.)
- Phishing-resistant authentication
- Cross-platform device support

## SSO/SAML Integration

### Architecture

The SSO plugin provides a centralized interface for managing enterprise authentication:

```
┌──────────────────────────────────────────────────────┐
│                  User Browser                        │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│              Inovy Application                       │
│          (Better Auth with SSO Plugin)               │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│           Identity Provider (IdP)                    │
│   (Azure AD, Okta, Google Workspace, etc.)          │
└──────────────────────────────────────────────────────┘
```

### Registering a SAML Provider

Use the Better Auth API to register a SAML provider:

```typescript
// Server-side registration
import { auth } from "@/lib/auth";

await auth.api.registerSSOProvider({
  body: {
    providerId: "your-company-okta",
    type: "saml",
    issuer: "http://www.okta.com/exkxxxxxxxxxxxx",
    domain: "yourcompany.com",
    certificate: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    entityId: "https://your-app.com/api/auth/sso/metadata/your-company-okta",
    mapping: {
      email: "email",
      name: "firstName lastName",
      id: "nameID",
    },
    organizationId: "org_123456", // Optional: link to specific organization
  },
});
```

### SAML Metadata

Inovy automatically generates Service Provider (SP) metadata at:
```
https://your-domain.com/api/auth/sso/metadata/{providerId}
```

Provide this URL to your IdP administrator for configuration.

### SAML Configuration Parameters

| Parameter | Description | Required |
|-----------|-------------|----------|
| `providerId` | Unique identifier for the SSO provider | Yes |
| `type` | Provider type: `saml`, `oidc`, or `oauth2` | Yes |
| `issuer` | IdP issuer URL (from IdP metadata) | Yes (SAML) |
| `domain` | Email domain for automatic provider detection | No |
| `certificate` | IdP signing certificate (X.509 format) | Yes (SAML) |
| `entityId` | SP entity ID (your application identifier) | Yes (SAML) |
| `organizationId` | Link provider to specific organization | No |
| `mapping` | Field mapping between IdP and application | No |

### Sign-In with SAML

#### By Email Domain
```typescript
import { authClient } from "@/lib/auth-client";

await authClient.signIn.sso({
  email: "user@yourcompany.com", // Domain matches registered provider
});
```

#### By Provider ID
```typescript
await authClient.signIn.sso({
  providerId: "your-company-okta",
});
```

#### By Organization Slug
```typescript
await authClient.signIn.sso({
  organizationSlug: "your-company",
});
```

### OIDC/OAuth2 SSO Providers

For OpenID Connect or OAuth2 providers (Azure AD, Okta, Auth0):

```typescript
await auth.api.registerSSOProvider({
  body: {
    providerId: "your-company-azure",
    type: "oidc",
    issuer: "https://login.microsoftonline.com/{tenant-id}/v2.0",
    clientId: "your-azure-app-client-id",
    clientSecret: "your-azure-app-client-secret",
    scopes: "openid email profile",
    domain: "yourcompany.com",
    discoveryUrl: "https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration",
    mapping: {
      email: "email",
      name: "name",
      id: "sub",
    },
  },
});
```

## Enterprise Directory Integration

### Microsoft Azure AD Integration

Azure AD integration provides:
- User authentication via Microsoft accounts
- Automatic profile synchronization
- Group and role mapping
- Microsoft 365 service integration

**Features Enabled:**
- Azure AD OAuth 2.0 authentication
- Single Sign-On for Microsoft 365 users
- Tenant-specific or multi-tenant support
- Conditional Access policies (enforced by Azure AD)
- Multi-Factor Authentication (MFA) support

**Integration Services:**
- **Outlook Calendar**: Automatic event creation and management
- **Outlook Email**: Draft creation from meeting summaries
- **Microsoft Teams**: Future integration for meeting bots
- **OneDrive**: Document storage and retrieval

**Configuration:**
```typescript
// In auth.ts
socialProviders: {
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
  },
}
```

**User Provisioning:**
1. User signs in with Microsoft account
2. Profile data synced from Azure AD
3. User automatically added to organization
4. Roles assigned based on invitation or default role
5. Access to Microsoft 365 integration services

### Google Workspace Integration

Google Workspace integration provides:
- User authentication via Google accounts
- Automatic profile synchronization
- Google services integration
- Workspace domain restriction

**Features Enabled:**
- Google OAuth 2.0 authentication
- Single Sign-On for Google Workspace users
- Domain verification and restriction
- Google Workspace admin directory sync

**Integration Services:**
- **Google Calendar**: Event creation and management
- **Gmail**: Draft creation and email automation
- **Google Drive**: Document indexing and search
- **Google Meet**: Future integration for meeting bots

**Configuration:**
```typescript
// In auth.ts
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    prompt: "select_account consent",
  },
}
```

**User Provisioning:**
1. User signs in with Google Workspace account
2. Profile data synced from Google Directory
3. Domain verified against allowed workspace domains
4. User automatically added to organization
5. Roles assigned based on invitation or default role
6. Access to Google services integration

### Directory Synchronization

**Just-in-Time (JIT) Provisioning:**
When a user signs in for the first time via SSO:
1. User identity verified with IdP
2. User profile created in Inovy database
3. User automatically added to appropriate organization
4. Default role assigned (configurable)
5. Session created and user redirected to application

**Automatic Profile Updates:**
User profile data is synchronized on each sign-in:
- Name and email updated from IdP
- Profile picture refreshed
- Group memberships reflected in roles
- Access tokens refreshed for service integrations

## User Provisioning

### Manual User Provisioning

Invite users via the admin interface:

1. Go to Organization Settings > Members
2. Click "Invite Member"
3. Enter email address
4. Select role: Owner, Admin, Manager, User, or Viewer
5. Optionally assign to teams
6. Send invitation

**Invitation Process:**
- Invitation email sent with unique link
- 7-day expiration for security
- User creates account or signs in with existing account
- User automatically added to organization with specified role
- Pending team assignments applied on acceptance

### API-Based Provisioning

Use Better Auth organization APIs for programmatic user management:

```typescript
import { auth } from "@/lib/auth";

// Create invitation
await auth.api.createInvitation({
  body: {
    organizationId: "org_123456",
    email: "newuser@yourcompany.com",
    role: "user",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
});
```

### SSO-Based Provisioning

**Just-in-Time (JIT) Provisioning:**
Users are automatically provisioned on first SSO sign-in:

1. User initiates SSO sign-in
2. IdP authenticates user
3. SAML assertion or OIDC token received
4. User profile extracted from assertion/token
5. User account created in Inovy
6. User added to organization (based on domain or provider)
7. Default role assigned
8. User signed in and redirected

**Configuration:**
```typescript
// In auth.ts SSO plugin configuration
sso({
  // Default role for new SSO users
  defaultRole: "user",
  
  // Auto-assign to organization based on domain
  autoAssignOrganization: true,
  
  // Tenant ID for Azure AD integration
  tenantId: process.env.MICROSOFT_TENANT_ID,
})
```

### SCIM Provisioning

Better Auth SSO plugin supports SCIM 2.0 for automatic user provisioning and de-provisioning:

**Features:**
- Automatic user creation from IdP
- User profile synchronization
- Group membership management
- User de-provisioning (account suspension)

**SCIM Endpoints:**
```
POST   /api/auth/scim/v2/Users          # Create user
GET    /api/auth/scim/v2/Users          # List users
GET    /api/auth/scim/v2/Users/{id}     # Get user
PATCH  /api/auth/scim/v2/Users/{id}     # Update user
DELETE /api/auth/scim/v2/Users/{id}     # Deactivate user
```

**SCIM Configuration in IdP:**
1. Set SCIM endpoint URL: `https://your-domain.com/api/auth/scim/v2`
2. Generate SCIM API token (via admin interface)
3. Configure user attributes mapping
4. Enable automatic provisioning

### Role Mapping

Map IdP groups or roles to Inovy roles:

```typescript
// In SSO provider registration
mapping: {
  email: "email",
  name: "name",
  id: "sub",
  roles: {
    // Map IdP groups to Inovy roles
    "Admin Group": "admin",
    "Manager Group": "manager",
    "User Group": "user",
  },
}
```

**Available Roles:**
- **Superadmin**: Full system access (platform-level)
- **Owner**: Full organization access
- **Admin**: Organization administration
- **Manager**: Team management and moderate permissions
- **User**: Standard user with read/write access
- **Viewer**: Read-only access

## Configuration Examples

### Complete Azure AD SSO Setup

1. **Azure AD Configuration:**
   ```bash
   # Create Azure AD app registration
   az ad app create \
     --display-name "Inovy SSO" \
     --sign-in-audience "AzureADMyOrg" \
     --web-redirect-uris "https://your-domain.com/api/auth/callback/microsoft"
   
   # Add API permissions
   az ad app permission add \
     --id <app-id> \
     --api 00000003-0000-0000-c000-000000000000 \
     --api-permissions \
       e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope \ # User.Read
       37f7f235-527c-4136-accd-4a02d197296e=Scope \ # openid
       64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0=Scope   # email
   ```

2. **Environment Configuration:**
   ```env
   # .env.local
   MICROSOFT_CLIENT_ID=your-app-client-id
   MICROSOFT_CLIENT_SECRET=your-app-client-secret
   MICROSOFT_TENANT_ID=your-tenant-id  # or "common" for multi-tenant
   ```

3. **Register OIDC Provider:**
   ```typescript
   await auth.api.registerSSOProvider({
     body: {
       providerId: "yourcompany-azure",
       type: "oidc",
       issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
       clientId: process.env.MICROSOFT_CLIENT_ID!,
       clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
       scopes: "openid email profile User.Read",
       domain: "yourcompany.com",
       discoveryUrl: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
     },
   });
   ```

### Complete Okta SAML Setup

1. **Okta Configuration:**
   - Create new SAML 2.0 app in Okta admin
   - Set Single Sign-On URL: `https://your-domain.com/api/auth/sso/callback/{providerId}`
   - Set Audience URI: `https://your-domain.com/api/auth/sso/metadata/{providerId}`
   - Configure attribute statements:
     - `email` → `user.email`
     - `firstName` → `user.firstName`
     - `lastName` → `user.lastName`
   - Download signing certificate

2. **Register SAML Provider:**
   ```typescript
   await auth.api.registerSSOProvider({
     body: {
       providerId: "yourcompany-okta",
       type: "saml",
       issuer: "http://www.okta.com/exkxxxxxxxxxxxx",
       domain: "yourcompany.com",
       certificate: `-----BEGIN CERTIFICATE-----
MIIDpDCCAoygAwIBAgIGAXoKg...
-----END CERTIFICATE-----`,
       entityId: "https://your-domain.com/api/auth/sso/metadata/yourcompany-okta",
       mapping: {
         email: "email",
         name: "firstName lastName",
         id: "nameID",
       },
     },
   });
   ```

3. **Test SAML Connection:**
   ```bash
   # Verify metadata endpoint
   curl https://your-domain.com/api/auth/sso/metadata/yourcompany-okta
   ```

### Google Workspace SAML Setup

1. **Google Workspace Admin Console:**
   - Go to Apps > Web and mobile apps > Add app > Add custom SAML app
   - Download IdP metadata or copy SSO URL and certificate
   - Set ACS URL: `https://your-domain.com/api/auth/sso/callback/{providerId}`
   - Set Entity ID: `https://your-domain.com/api/auth/sso/metadata/{providerId}`
   - Map attributes:
     - `email` → Basic Information > Primary email
     - `firstName` → Basic Information > First name
     - `lastName` → Basic Information > Last name

2. **Register Provider:**
   ```typescript
   await auth.api.registerSSOProvider({
     body: {
       providerId: "yourcompany-google",
       type: "saml",
       issuer: "https://accounts.google.com/o/saml2?idpid=xxxxxxxxx",
       domain: "yourcompany.com",
       certificate: googleCertificate,
       entityId: "https://your-domain.com/api/auth/sso/metadata/yourcompany-google",
     },
   });
   ```

## Security Best Practices

### 1. Secret Management

- Store all secrets in environment variables
- Use a secrets manager (AWS Secrets Manager, Azure Key Vault, Google Secret Manager)
- Rotate secrets regularly (every 90 days)
- Never commit secrets to version control
- Use different secrets for development, staging, and production

### 2. SAML Security

- Always validate SAML signatures
- Use strong signing algorithms (SHA-256 or higher)
- Implement assertion expiration checks
- Verify audience restrictions
- Enable encrypted assertions when supported

### 3. OAuth Security

- Use PKCE (Proof Key for Code Exchange) for public clients
- Implement state parameter for CSRF protection
- Validate redirect URIs strictly
- Use short-lived access tokens
- Implement token refresh rotation

### 4. Network Security

- Enforce HTTPS for all authentication endpoints
- Use TLS 1.2 or higher
- Implement rate limiting on authentication endpoints
- Use HSTS headers
- Enable certificate pinning for mobile apps

### 5. Session Security

- Use secure, httpOnly, sameSite cookies
- Implement session timeout (7 days default)
- Enable session refresh on activity
- Implement concurrent session limits
- Log all authentication events

### 6. Multi-Factor Authentication

- Encourage or enforce MFA for all users
- Support multiple MFA methods (TOTP, WebAuthn, SMS)
- Inherit MFA from IdP when using SSO
- Implement backup codes
- Log MFA enrollment and usage

### 7. Audit Logging

- Log all authentication attempts (success and failure)
- Log SSO provider registrations and changes
- Log user provisioning events
- Monitor for suspicious activity
- Implement alerting for security events

## Troubleshooting

### Common SSO Issues

#### 1. SAML Signature Validation Failure

**Error:** "Invalid SAML signature"

**Solutions:**
- Verify certificate matches IdP configuration
- Check certificate format (PEM, X.509)
- Ensure certificate is not expired
- Validate clock synchronization between IdP and SP

#### 2. Attribute Mapping Issues

**Error:** "Required attribute missing"

**Solutions:**
- Check attribute mapping configuration
- Verify IdP sends all required attributes
- Review SAML assertion in browser dev tools
- Update mapping configuration to match IdP attribute names

#### 3. Redirect URI Mismatch

**Error:** "Redirect URI mismatch"

**Solutions:**
- Verify redirect URI in IdP configuration exactly matches
- Check for trailing slashes
- Ensure HTTPS is used in production
- Verify baseURL configuration in auth.ts

#### 4. Token Expiration

**Error:** "SAML assertion expired"

**Solutions:**
- Check clock synchronization between servers
- Increase assertion validity period in IdP
- Implement clock skew tolerance (±5 minutes)

### Common OAuth Issues

#### 1. Client Secret Invalid

**Error:** "invalid_client"

**Solutions:**
- Verify client ID and secret are correct
- Check for whitespace in secrets
- Ensure secrets haven't been rotated in IdP
- Verify environment variables are loaded correctly

#### 2. Scope Not Granted

**Error:** "insufficient_scope"

**Solutions:**
- Request additional scopes in IdP configuration
- Verify user has granted consent
- Check IdP admin has approved app scopes
- Re-authenticate user to request new scopes

#### 3. Refresh Token Expired

**Error:** "invalid_grant"

**Solutions:**
- Re-authenticate user to get new refresh token
- Check refresh token expiration policy in IdP
- Implement refresh token rotation
- Store refresh tokens securely

### Debugging Tools

#### Enable Debug Logging

```typescript
// In auth.ts
export const auth = betterAuth({
  advanced: {
    debug: process.env.NODE_ENV === "development",
  },
  // ...
});
```

#### Check SAML Assertions

Use browser developer tools to inspect SAML POST data:
1. Open browser dev tools (F12)
2. Go to Network tab
3. Initiate SSO login
4. Find POST request to callback endpoint
5. View form data containing SAML assertion
6. Decode base64 assertion to view XML

#### Verify JWT Tokens

For OIDC/OAuth2, decode JWT tokens:
```bash
# Decode JWT token
echo "eyJhbGciOiJ..." | base64 -d | jq .
```

#### Test SSO Endpoints

```bash
# Test metadata endpoint
curl -v https://your-domain.com/api/auth/sso/metadata/{providerId}

# Test health endpoint
curl https://your-domain.com/api/auth/health
```

## Support and Resources

### Documentation
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth SSO Plugin](https://www.better-auth.com/docs/plugins/sso)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Google Workspace Admin](https://support.google.com/a/answer/6087519)

### SSD Compliance
This implementation satisfies:
- **SSD-5.3.02**: Enterprise-wide authentication
- Centralized identity management
- Single Sign-On (SSO) support
- Enterprise directory integration

### Contact
For enterprise authentication support, contact your system administrator or Inovy support team.
