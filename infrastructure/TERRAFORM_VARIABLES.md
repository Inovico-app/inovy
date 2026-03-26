# Terraform Variables Configuration

This document describes the required GitHub Environment variables and secrets for the Terraform deployment workflow.

For a complete environment variables reference (Local, Vercel, Azure), see [docs/ENVIRONMENT_VARIABLES.md](../docs/ENVIRONMENT_VARIABLES.md).

## GitHub Environment Variables

Configure these in the GitHub repository's `prd` environment:

### Azure Authentication

- `AZURE_CLIENT_ID` - Service principal client ID for Azure authentication
- `AZURE_TENANT_ID` - Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID

### Docker Build (NEXT*PUBLIC*\* at build time)

These are passed as Docker build args when building the app image:

- `NEXT_PUBLIC_APP_URL` - Resolved automatically by querying the Azure Container App Environment (`inovy-env-<env>`). Fallback: set `NEXT_PUBLIC_APP_URL` or `APP_URL` as env vars when infra is not deployed yet.
- `NEXT_PUBLIC_PLATFORM` - Platform identifier (`azure` or `vercel`). Defaults to `azure` if unset.
- `NEXT_PUBLIC_WEBHOOK_URL` - (optional) Public webhook URL for Google Drive
- `NEXT_PUBLIC_KVK_NUMBER` - (optional) KVK number for legal pages

`DEEPGRAM_API_KEY` (secret) is also passed as `NEXT_PUBLIC_DEEPGRAM_API_KEY` for client-side live transcription.

### Terraform Variables

- `TF_VARS` - **Required**: GitHub Environment variable that contains either:
  1. **File path** to a Terraform variables file (e.g., `/tmp/terraform.tfvars`), OR
  2. **HCL content** that will be written to a file and used as `-var-file`

  If using HCL content, it should include all non-sensitive variables like:
  - `acr_name` - (optional) Azure Container Registry name; defaults to `inovyacr<env>` when empty
  - `entra_tenant_id` - Microsoft Entra tenant ID for PostgreSQL authentication
  - `entra_administrators` - List of Entra administrators with object IDs and principal names
  - Any other non-sensitive configuration variables

  Example HCL content:

  ```hcl
  entra_tenant_id = "your-tenant-id-here"

  entra_administrators = [
    {
      object_id      = "57774c6c-a23e-4734-82f9-c131a2fe540f"
      principal_name = "admin1@example.com"
      principal_type = "User"
    },
    {
      object_id      = "03aa94f9-e09b-4b66-b89b-9b6a3e30526b"
      principal_name = "admin2@example.com"
      principal_type = "User"
    }
  ]
  ```

## GitHub Secrets

Configure these in the GitHub repository's `prd` environment:

### Core

- `POSTGRESQL_ADMIN_LOGIN` - PostgreSQL administrator username
- `POSTGRESQL_ADMIN_PASSWORD` - PostgreSQL administrator password
- `REDIS_PASSWORD` - Redis password for the Redis Container App
- `BETTER_AUTH_SECRET` - Better Auth secret for the Container App

### API Keys

- `OPENAI_API_KEY` - OpenAI API key for the Container App
- `ANTHROPIC_API_KEY` - Anthropic API key for the Container App
- `DEEPGRAM_API_KEY` - Deepgram API key (server-side)
- `RECALL_API_KEY` - Recall API key
- `RECALL_WEBHOOK_SECRET` - Recall webhook secret
- `RESEND_API_KEY` - Resend API key for email
- `HUGGINGFACE_API_KEY` - Hugging Face API key
- `OAUTH_ENCRYPTION_KEY` - OAuth encryption key for token storage (32 bytes hex)

### OAuth

#### Google

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

#### Microsoft

- `MICROSOFT_CLIENT_ID` - Microsoft OAuth client ID (Azure App Registration)
- `MICROSOFT_CLIENT_SECRET` - Microsoft OAuth client secret (Azure App Registration); may be empty when omitting the env var on the Container App (federated Graph-only); hybrid Better Auth still needs a secret in practice
- `MICROSOFT_TENANT_ID` - (optional) Microsoft tenant ID (defaults to `common`; use `organizations` for work accounts only, or a specific tenant GUID)
- `microsoft_use_federated_credential` - (in `terraform.tfvars` / root module) When `true` with Azure platform and non-empty `microsoft_client_id`, Terraform creates an Entra federated identity credential and sets UAMI-based Graph assertion env vars on the Container App
- `microsoft_entra_oauth_application_object_id` - Entra **object** ID of the same OAuth app registration (not the client ID). Required when federated credential is enabled. Put in `terraform.tfvars` / `TF_VARS`, or set GitHub repository variable `MICROSOFT_ENTRA_OAUTH_APPLICATION_OBJECT_ID` (wired as `TF_VAR_` in **Azure Infrastructure Inovy**). Resolve with `az ad app show --id <MICROSOFT_CLIENT_ID> --query id -o tsv`.

For production Azure (`prd`), use the **`app-inovy-azure-prd`** registration and redirect URIs documented in [docs/MICROSOFT_ENTRA_APP_REGISTRATION.md](../docs/MICROSOFT_ENTRA_APP_REGISTRATION.md). Vercel uses a separate registration (`app-inovy-vercel`).

### Container App (additional)

- `CRON_SECRET` - Secret for authenticating cron job requests
- `RESEND_FROM_EMAIL` - Resend from email (e.g., Inovy <app@inovico.nl>)
- `NEXT_PUBLIC_WEBHOOK_URL` - Public webhook URL for Google Drive (optional; derived from app URL if empty)
- `NEXT_PUBLIC_KVK_NUMBER` - KVK number for legal pages

**Note**: When using GitLab CI, configure these as GitLab CI/CD variables (masked) in your environment.

## How It Works

The GitHub Actions workflow (`.github/workflows/azure-infra.yml`) uses the following approach:

1. **TF_VARS Environment Variable**: Contains the Terraform variables file content (HCL format) with all non-sensitive variables
2. **Workflow Inputs**: `environment` and `location` are passed directly as `-var` flags
3. **GitHub Secrets**: Sensitive values (PostgreSQL credentials) are passed directly as `-var` flags
4. **Variable File**: The `TF_VARS` content is used directly via `-var-file` flag

The workflow executes terraform plan with:

```bash
terraform plan \
  -var="environment=${{ inputs.environment }}" \
  -var="location=${{ inputs.location }}" \
  -var="postgresql_admin_login=${{ secrets.POSTGRESQL_ADMIN_LOGIN }}" \
  -var="postgresql_admin_password=${{ secrets.POSTGRESQL_ADMIN_PASSWORD }}" \
  -var-file="$TF_VARS"
```

**Important Notes**:

- The `TF_VARS` environment variable is set in the workflow step and used directly with `-var-file=$TF_VARS`
- If `TF_VARS` contains HCL content (not a file path), the workflow should write it to a file first, then use that file path
- Sensitive values (PostgreSQL credentials) are passed via `-var` flags from GitHub Secrets
- Workflow inputs (`environment`, `location`) are passed via `-var` flags
- The `TF_VARS` variable should **not** include sensitive values like passwords - those are passed separately via `-var` flags

## Local Development

For local development, copy `terraform.tfvars.example` to `terraform.tfvars` and fill in the values:

```bash
cp infrastructure/terraform.tfvars.example infrastructure/terraform.tfvars
# Edit terraform.tfvars with your values
```

Then run Terraform commands:

```bash
cd infrastructure
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

**Important**: Never commit `terraform.tfvars` to git - it contains sensitive information. It's already in `.gitignore`.
