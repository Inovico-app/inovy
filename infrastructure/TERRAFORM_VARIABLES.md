# Terraform Variables Configuration

This document describes the required GitHub Environment variables and secrets for the Terraform deployment workflow.

## GitHub Environment Variables

Configure these in the GitHub repository's `prd` environment:

### Azure Authentication
- `AZURE_CLIENT_ID` - Service principal client ID for Azure authentication
- `AZURE_TENANT_ID` - Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID

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

- `POSTGRESQL_ADMIN_LOGIN` - PostgreSQL administrator username
- `POSTGRESQL_ADMIN_PASSWORD` - PostgreSQL administrator password

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
