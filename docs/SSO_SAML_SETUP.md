# SSO/SAML Integration Setup Guide

This guide explains how to configure SSO/SAML authentication for Inovy using Kinde.

## ⚠️ Important Note

**SSO/SAML requires Kinde Enterprise Connections feature, which may require a paid Kinde plan.**

The application code is prepared to handle SSO users, but SSO will not work until:
1. You have access to Kinde Enterprise Connections (check your Kinde plan)
2. Enterprise Connection is configured in Kinde dashboard
3. SSO is enabled for your organization

## Overview

Inovy uses Kinde for authentication. Kinde supports SSO/SAML through **Enterprise Connections**, which must be configured in the Kinde dashboard. Once configured, the application code will automatically detect and handle SSO users.

## Prerequisites

- Kinde account with SSO/SAML feature enabled
- Access to your Identity Provider (IdP) configuration
- SAML metadata or OIDC configuration from your IdP

## Configuration Steps

### 1. Verify Enterprise Connections Access

1. Log in to your Kinde dashboard
2. Check if you have access to **Enterprise Connections** feature
3. If not available, you may need to upgrade your Kinde plan
4. Contact Kinde support if you need Enterprise Connections enabled

### 2. Configure SSO/SAML in Kinde Dashboard

1. Navigate to **Settings** > **Authentication** > **Enterprise Connections**
2. Click **Add Connection**
3. Choose your SSO method:
   - **SAML 2.0**: For enterprise SSO (Azure AD, Okta, etc.)
   - **OIDC**: For OpenID Connect providers

### 2. SAML 2.0 Configuration

1. **Get your Kinde SAML metadata**:
   - In Kinde dashboard, go to **Settings** > **Authentication** > **SAML**
   - Download the SAML metadata XML file
   - Note the ACS URL and Entity ID

2. **Configure your IdP**:
   - Upload Kinde's SAML metadata to your IdP
   - Configure the following:
     - **ACS URL**: `https://your-app.kinde.com/api/auth/saml/acs`
     - **Entity ID**: Your Kinde domain
     - **Name ID Format**: `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`
     - **Attributes**: Map user attributes (email, name, etc.)

3. **Get IdP SAML metadata**:
   - Download SAML metadata from your IdP
   - Upload to Kinde dashboard

4. **Test the connection**:
   - Use Kinde's test feature to verify the SAML connection
   - Ensure user attributes are mapped correctly

### 3. OIDC Configuration

1. **Get OIDC configuration from your IdP**:
   - Client ID
   - Client Secret
   - Authorization Endpoint
   - Token Endpoint
   - User Info Endpoint

2. **Configure in Kinde**:
   - Go to **Settings** > **Authentication** > **OIDC**
   - Enter the OIDC configuration details
   - Map user attributes

### 4. Environment Variables

Add the following to your `.env.local`:

```env
# Enable SSO (set to "true" when SSO is configured)
ENABLE_SSO=true

# Enable SAML (if using SAML 2.0)
ENABLE_SAML=true

# Enable OIDC (if using OpenID Connect)
ENABLE_OIDC=false
```

### 5. Organization SSO Configuration

For organization-specific SSO:

1. In Kinde dashboard, go to **Organizations**
2. Select your organization
3. Go to **Settings** > **SSO**
4. Configure SSO for the organization
5. Users in this organization will use SSO for login

## Application Code

The application automatically detects SSO users and handles them transparently:

```typescript
import { isSSOUser, getSSOProvider, getSAMLAttributes } from "@/lib/sso";

// Check if user logged in via SSO
if (isSSOUser(user)) {
  const provider = getSSOProvider(user);
  const samlAttributes = getSAMLAttributes(user);
  // Handle SSO user
}
```

## Testing

1. **Test SSO Login**:
   - Log out of the application
   - Click "Sign in with SSO" (if configured)
   - Complete SSO authentication flow
   - Verify user is logged in correctly

2. **Verify User Attributes**:
   - Check that user email, name, and roles are mapped correctly
   - Verify organization assignment works

3. **Test Session Management**:
   - Verify SSO sessions are managed correctly
   - Test logout and re-login flows

## Troubleshooting

### SSO Login Not Working

1. Verify SSO is enabled in Kinde dashboard
2. Check environment variables are set correctly
3. Verify SAML/OIDC configuration in Kinde matches your IdP
4. Check browser console for errors
5. Review Kinde logs in dashboard

### User Attributes Not Mapping

1. Verify attribute mapping in Kinde dashboard
2. Check IdP is sending required attributes
3. Review SAML/OIDC response in Kinde logs

### Organization SSO Issues

1. Verify organization has SSO enabled
2. Check user belongs to correct organization
3. Verify organization SSO configuration matches IdP

## Security Considerations

1. **SAML Assertion Signing**: Ensure SAML assertions are signed
2. **Encryption**: Use encrypted SAML assertions for sensitive data
3. **Session Management**: Configure appropriate session timeouts
4. **Attribute Mapping**: Only map necessary user attributes
5. **Audit Logging**: Monitor SSO login attempts and failures

## References

- [Kinde SSO Documentation](https://kinde.com/docs/authentication/sso/)
- [Kinde SAML Documentation](https://kinde.com/docs/authentication/saml/)
- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/v2.0/)

