# Azure Infrastructure Deployment Guide

This guide explains how to deploy the Inovy application infrastructure to Azure using Terraform.

## Prerequisites

1. **Azure Subscription** with appropriate permissions
2. **Service Principal** (`app-inovy-gh-infra-prd`) with required permissions (see [WORKFLOWS.md](./WORKFLOWS.md))
3. **GitHub Actions** configured with:
   - Environment: `prd`
   - Variables: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
4. **Terraform Storage Account** created (run `terraform-storage-setup.yml` workflow first)

## Required Permissions

The service principal (`app-inovy-gh-infra-prd`) needs the following Azure RBAC roles:

- **Contributor** (subscription level) - For creating and managing resources
- **Storage Blob Data Contributor** (on Terraform state storage account) - For managing Terraform state
- **User Access Administrator** (optional, for role assignments) - If managing role assignments

## Deployment Steps

### Step 1: Setup Terraform State Storage (One-time per environment)

1. Go to GitHub Actions → **Setup Terraform Storage Account** workflow
2. Click **Run workflow**
3. Configure inputs:
   - `environment`: `prd`
   - `resource_group_name`: `rg-terraform-states`
   - `location`: `westeurope`
   - `storage_account_suffix`: `inovy` (or leave default)
4. Run the workflow
5. Note the storage account name from the output

### Step 2: Configure Terraform Backend

Update `infrastructure/backend.tf` with the correct storage account name:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-states"
    storage_account_name = "sttfprdinovy"  # Update with actual name
    container_name       = "tfstate"
    key                  = "prd/infrastructure.tfstate"
    use_oidc             = true
  }
}
```

### Step 3: Set Required Variables

Create a `terraform.tfvars` file or set variables via GitHub Actions workflow inputs:

```hcl
environment = "prd"
location    = "westeurope"

# PostgreSQL
postgresql_admin_login    = "adminuser"
postgresql_admin_password = "YourSecurePassword123!"

# Optional: Customize other variables
# See variables.tf for all available options
```

**Important**: Never commit `terraform.tfvars` with sensitive values to git. Use GitHub Secrets or environment variables.

### Step 4: Deploy Infrastructure

1. Go to GitHub Actions → **Azure Infrastructure Inovy** workflow
2. Click **Run workflow**
3. Configure inputs:
   - `environment`: `prd`
   - `terraform_action`: `plan` (first run to preview changes)
   - `location`: `westeurope`
   - `resource_group_name`: `rg-terraform-states`
4. Review the plan output
5. Run again with `terraform_action: apply` to deploy

### Step 5: Deploy Container Image

1. Go to GitHub Actions → **Deploy Container to Azure Container Apps** workflow
2. Click **Run workflow**
3. Configure inputs:
   - `environment`: `prd`
   - `build_image`: `true` (to build new image)
   - `acr_name`: (optional) Azure Container Registry name if using ACR
4. The workflow will:
   - Build Docker image
   - Push to registry (ACR or Docker Hub)
   - Update Container App with new image
   - Verify deployment

## Post-Deployment

### Verify Deployment

1. **Check Container App**:
   ```bash
   az containerapp show \
     --name inovy-app-prd \
     --resource-group rg-inovy-prd
   ```

2. **Get Container App URL**:
   ```bash
   az containerapp show \
     --name inovy-app-prd \
     --resource-group rg-inovy-prd \
     --query "properties.configuration.ingress.fqdn" \
     --output tsv
   ```

3. **Check PostgreSQL Connection**:
   ```bash
   az postgres flexible-server show \
     --name inovy-db-prd \
     --resource-group rg-inovy-prd
   ```

### Environment Variables

The Container App is configured with environment variables from Terraform outputs:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection URL (redis://) for ioredis client
- `QDRANT_URL` - Qdrant API endpoint
- `AZURE_STORAGE_ACCOUNT_NAME` - Blob storage account name
- `AZURE_STORAGE_ACCOUNT_KEY` - Blob storage access key (for SAS token generation)
- `AZURE_STORAGE_CONNECTION_STRING` - Blob storage connection string
- `BLOB_STORAGE_PROVIDER` - Set to `azure` to enable Azure blob storage. When set, only storage uses Azure; DB and Redis remain driven by `NEXT_PUBLIC_PLATFORM`. Can be used independently (e.g. `BLOB_STORAGE_PROVIDER=azure` with `NEXT_PUBLIC_PLATFORM=vercel` for Azure blob + Vercel DB/Redis).

### Database Migration

Migrations run automatically when PRs that change `apps/web/src/server/db/migrations/**` are merged to `main`. The `migrate-prod-db.yml` workflow:

1. Builds and pushes the app image to ACR
2. Starts the `db-migrate-prd` Azure Container Apps Job (runs inside the VNet)
3. Waits for the job to complete

The database is private (`public_network_access_enabled = false`), so migrations cannot run from public GitHub runners. The job runs in the same Container Apps environment as the app and can reach PostgreSQL.

## Troubleshooting

### Terraform State Locked

If Terraform state is locked:

1. Get the lock ID from the error message
2. Run workflow with `terraform_unlock` input set to the lock ID
3. Or manually unlock:
   ```bash
   terraform force-unlock -force <LOCK_ID>
   ```

### Container App Not Starting

1. Check Container App logs:
   ```bash
   az containerapp logs show \
     --name inovy-app-prd \
     --resource-group rg-inovy-prd \
     --follow
   ```

2. Verify environment variables are set correctly
3. Check Container App revision status

### PostgreSQL Connection Issues

1. Verify firewall rules allow Container Apps subnet
2. Check Private DNS zone is linked to VNET
3. Verify PostgreSQL is in the correct subnet

### Redis Connection Issues

**Important**: The application uses `@upstash/redis` SDK which expects REST API. Azure Redis Basic tier does not provide REST API. Options:

1. Upgrade to Standard/Premium tier (recommended)
2. Update application code to use Azure Redis SDK instead

## Updating Infrastructure

1. Modify Terraform files in `infrastructure/` directory
2. Run `terraform plan` workflow to preview changes
3. Review the plan output
4. Run `terraform apply` workflow to apply changes

## Destroying Infrastructure

**Warning**: This will delete all resources!

1. Run Terraform destroy:
   ```bash
   terraform destroy \
     -var="environment=prd" \
     -var="location=westeurope"
   ```

2. Or create a destroy workflow (not recommended for production)

## Security Considerations

- All resources use private networking where possible
- PostgreSQL and Redis use private endpoints
- Storage account has public access disabled
- Container App uses Managed Identity for Azure service access
- Network Security Groups restrict traffic between subnets
- TLS/SSL enforced for all connections

## Cost Optimization

- Use appropriate SKU sizes for your workload
- Consider Reserved Instances for long-running resources
- Enable auto-scaling on Container App
- Use Basic tier Redis for development (upgrade for production)
- Monitor resource usage and adjust as needed

## Support

For issues or questions:
1. Check [WORKFLOWS.md](./WORKFLOWS.md) for workflow details
2. Review Terraform documentation
3. Check Azure resource logs
4. Contact the infrastructure team
