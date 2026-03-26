# Microsoft Entra app registrations (Inovy)

This document describes the Entra ID (Azure AD) applications used for **Microsoft sign-in** (Better Auth) and **Microsoft Graph integrations** (calendar, Teams, etc.). Both flows use the same Entra **application (client) ID**. On Azure Container Apps, **Graph token exchange** can use a **federated workload identity** (user-assigned managed identity + client assertion) instead of a client secret; **Better Auth** may still use a client secret until secretless sign-in is implemented (hybrid).

## Summary

| Application (display name)   | Purpose                                      | Typical host                          |
| ---------------------------- | -------------------------------------------- | ------------------------------------- |
| `app-inovy-vercel`           | Production app on Vercel (`app.inovico.nl`)  | `https://app.inovico.nl`              |
| `app-inovy-azure-prd`        | Production app on Azure Container Apps       | `https://inovy-app-prd.<region>.azurecontainerapps.io` |
| `app-inovy-gh-infra-prd`     | GitHub Actions → Terraform (OIDC), **not** SSO | N/A (service principal)               |

Do not confuse **`app-inovy-gh-infra-prd`** with SSO: it is documented in [infrastructure/WORKFLOWS.md](../infrastructure/WORKFLOWS.md) for infrastructure automation only.

## `app-inovy-vercel` (reference configuration)

Captured from Entra ID (live discovery). Use this as the template when creating or auditing other registrations.

| Property | Value |
| -------- | ----- |
| **Application (client) ID** | `88ca475c-1446-4008-9cd9-77b997ebdeed` |
| **Sign-in audience** | `AzureADandPersonalMicrosoftAccount` (work + personal Microsoft accounts) |
| **Publisher domain** | `inovico.nl` |

### Redirect URIs (Web)

- `https://app.inovico.nl/api/auth/callback/microsoft`
- `https://app.inovico.nl/api/integrations/microsoft/callback`
- `http://localhost:3000/api/auth/callback/microsoft`
- `http://localhost:3000/api/integrations/microsoft/callback`

### Microsoft Graph (delegated)

The app requests permissions under **Microsoft Graph** (`00000003-0000-0000-c000-000000000000`). Delegated scope IDs (as assigned in Entra) match the product needs for sign-in, profile/email, calendar read/write, and related flows. Admin consent should be granted for the tenant.

### Discovery commands

```bash
az ad app list --display-name "app-inovy-vercel" --query "[].{appId:appId}" -o tsv
az ad app show --id <app-id> -o json
```

## `app-inovy-azure-prd` (Azure Container Apps production)

| Property | Value |
| -------- | ----- |
| **Application (client) ID** | `646ea5ee-0643-44b7-bc06-fe01ee49b25d` |
| **Display name** | `app-inovy-azure-prd` |
| **Sign-in audience** | `AzureADandPersonalMicrosoftAccount` (same as Vercel) |

### Redirect URIs (Web)

Production (Azure Container Apps FQDN for `prd`):

- `https://inovy-app-prd.purplestone-d21f4e4f.westeurope.azurecontainerapps.io/api/auth/callback/microsoft`
- `https://inovy-app-prd.purplestone-d21f4e4f.westeurope.azurecontainerapps.io/api/integrations/microsoft/callback`

Local development (aligned with `app-inovy-vercel`):

- `http://localhost:3000/api/auth/callback/microsoft`
- `http://localhost:3000/api/integrations/microsoft/callback`

If the Container Apps hostname changes (new environment or region), update these URIs in **Entra ID → App registration → Authentication** and keep [apps/web/src/lib/auth.ts](../apps/web/src/lib/auth.ts) / [microsoft-oauth.ts](../apps/web/src/features/integrations/microsoft/lib/microsoft-oauth.ts) redirect behavior in sync.

### API permissions

`requiredResourceAccess` was copied from `app-inovy-vercel` so behavior matches production on Vercel. **Admin consent** was granted after creation.

### Client secret

For **hybrid** production (Better Auth Microsoft sign-in + federated Graph), repository secrets `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` must match a valid client secret on this app registration. After any rotation, update **both** GitHub Actions secrets and the Container App environment (or run Terraform apply so it applies the same secrets from GitHub).

### Federated identity credential (UAMI → app registration)

Terraform (see `infrastructure/azuread-microsoft-oauth.tf`) can create an **`azuread_application_federated_identity_credential`** on this app registration so the Container App **user-assigned managed identity** is trusted for OAuth client authentication:

| Field | Value |
| ----- | ----- |
| **Issuer** | `https://login.microsoftonline.com/<tenant-id>/v2.0` |
| **Subject** | UAMI **principal (object) ID** (must match the `sub` claim in the MI token) |
| **Audience** | `api://AzureADTokenExchange` |

At runtime the app obtains a managed-identity token for `api://AzureADTokenExchange/.default` and sends it as **`client_assertion`** (JWT bearer) to the Microsoft token endpoint for **Graph integration** flows (`microsoft-oauth.ts`). This removes the need to pass `client_secret` for those requests when `MICROSOFT_USE_FEDERATED_CREDENTIAL=true` and `MICROSOFT_ASSERTION_IDENTITY_CLIENT_ID` is set.

The Entra app’s Terraform/OIDC principal needs permission to manage app credentials (e.g. Application Administrator), or apply this resource with an admin account.

Rotate and sync (example — replace resource group/name if yours differ):

```bash
APP_ID="646ea5ee-0643-44b7-bc06-fe01ee49b25d"
CRED=$(az ad app credential reset --id "$APP_ID" --display-name "rotation-$(date +%Y%m%d)" --years 2 -o json)
SECRET=$(echo "$CRED" | jq -r '.password')
echo "$SECRET" | gh secret set MICROSOFT_CLIENT_SECRET -R Inovico-app/inovy
echo "$APP_ID" | gh secret set MICROSOFT_CLIENT_ID -R Inovico-app/inovy
az containerapp update --name inovy-app-prd --resource-group rg-inovy-prd \
  --set-env-vars "MICROSOFT_CLIENT_ID=$APP_ID" "MICROSOFT_CLIENT_SECRET=$SECRET" "MICROSOFT_TENANT_ID=common"
```

Alternatively, update GitHub secrets only and run **Azure Infrastructure Inovy** (plan + apply) so Terraform pushes the values to the Container App.

### Code alignment (Graph scopes)

Incremental OAuth tiers are defined in [apps/web/src/features/integrations/microsoft/lib/scope-constants.ts](../apps/web/src/features/integrations/microsoft/lib/scope-constants.ts). If you add new delegated permissions in Entra, ensure they correspond to the scopes used in authorization URLs.

## Deploying `MICROSOFT_*` to the Container App

Terraform passes `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID`, optional `MICROSOFT_CLIENT_SECRET` (omitted when empty), plus `MICROSOFT_USE_FEDERATED_CREDENTIAL` and `MICROSOFT_ASSERTION_IDENTITY_CLIENT_ID` into the Container App module ([infrastructure/modules/container-app/main.tf](../infrastructure/modules/container-app/main.tf)). Values come from GitHub Actions secrets during **Azure Infrastructure Inovy** workflow runs.

After changing `MICROSOFT_CLIENT_ID` or `MICROSOFT_CLIENT_SECRET` (when used):

1. Run **Azure Infrastructure Inovy** with **Terraform Plan**, then allow **Terraform Apply** to run (workflow uploads the plan to storage, then applies it).
2. Confirm the new revision shows the updated environment variables (Container App may show empty values in CLI for secrets; verify behavior by testing sign-in).

Do not commit client secrets to the repository.

## Managed identity (Container App UAMI)

The user-assigned managed identity (`id-container-app-<env>`) is used for **Azure RBAC** (ACR pull, storage, PostgreSQL Entra admin, etc.). When **federated identity** is configured on the Entra app registration, the same UAMI is also the **workload identity** used to mint **`client_assertion`** tokens for the Microsoft OAuth client (app registration client ID) in Graph integration flows—not a separate “OAuth app,” but a trusted federated credential on that registration.

Delegated user consent and sign-in still use the Entra **application** client ID; **Better Auth** continues to use `MICROSOFT_CLIENT_SECRET` in hybrid mode.

If you store `MICROSOFT_CLIENT_SECRET` in **Azure Key Vault**, grant the Container App identity **Key Vault Secrets User** on that vault (Azure RBAC), not “permissions on the app registration.”

## Verification checklist

1. **HTTPS**: Open the Azure app URL; use **Sign in with Microsoft** and complete the flow.
2. **Connect Microsoft**: In app settings, run **Connect Microsoft** and confirm calendar/Teams features as needed.
3. **Tenant**: `MICROSOFT_TENANT_ID` defaults to `common` in Terraform; use a specific tenant GUID if you restrict sign-in to one organization.

Optional CLI checks:

```bash
az ad app permission list --id 646ea5ee-0643-44b7-bc06-fe01ee49b25d -o table
curl -sI "https://inovy-app-prd.purplestone-d21f4e4f.westeurope.azurecontainerapps.io/" | head -5
```

## Related documentation

- [docs/ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- [infrastructure/DEPLOYMENT.md](../infrastructure/DEPLOYMENT.md)
- [infrastructure/TERRAFORM_VARIABLES.md](../infrastructure/TERRAFORM_VARIABLES.md)
