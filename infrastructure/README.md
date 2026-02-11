# Infrastructure as Code

This directory contains Terraform configuration files for managing Azure infrastructure.

## Documentation

- **[WORKFLOWS.md](./WORKFLOWS.md)** - Detailed explanation of GitHub Actions workflows and Terraform deployment process
- **[README.md](./README.md)** - This file (quick reference)

## Structure

- `main.tf` - Main Terraform configuration and provider setup
- `variables.tf` - Input variables
- `outputs.tf` - Output values
- `backend.tf` - Backend configuration for Terraform state storage
- `networking.tf` - Virtual Network, Subnets, and Network Security Groups
- `database.tf` - PostgreSQL Flexible Server and database
- `backup.tf` - Backup Vault and backup policies
- `redis.tf` - Azure Redis Cache
- `qdrant.tf` - Qdrant Vector Database (Container Instances)
- `storage.tf` - Azure Blob Storage for recordings
- `container-app.tf` - Container App Environment and Container App
- `WORKFLOWS.md` - Workflow documentation

## Resources Deployed

### Networking
- **Virtual Network** (`vnet-inovy-<env>`) - Main VNET for all resources
- **Subnets**:
  - `snet-container-apps` - For Container Apps (with delegation)
  - `snet-postgresql` - For PostgreSQL Flexible Server (with delegation)
  - `snet-redis` - For Redis Cache
- **Network Security Groups** - Applied to each subnet with appropriate rules

### Database
- **PostgreSQL Flexible Server** (`inovy-db-<env>`) - Managed PostgreSQL database
  - Version: 15 or 16 (configurable)
  - High Availability: Zone Redundant
  - Private endpoint in dedicated subnet
- **Database** (`inovy`) - Application database
- **Private DNS Zone** - For PostgreSQL private endpoint resolution

### Backup
- **Backup Vault** (`inovy-backup-vault-<env>`) - Centralized backup management
- **Backup Policy** - Daily backups with 30-day retention
- **Backup Instance** - Links PostgreSQL to backup vault

### Cache
- **Azure Redis Cache** (`inovy-redis-<env>`) - Managed Redis cache
  - SKU: Basic B10 (1GB cache)
  - VNET integration
  - **Note**: Application uses `@upstash/redis` SDK which expects REST API. Azure Redis Basic tier does not provide REST API. Consider upgrading to Standard/Premium tier or updating application code.

### Vector Database
- **Qdrant** (`qdrant-<env>`) - Deployed via Azure Container Instances
  - HTTP API on port 6333
  - gRPC API on port 6334
  - Persistent storage via Azure File Share

### Storage
- **Azure Blob Storage** (`inovyblob<env>`) - For recording file storage
  - Container: `recordings`
  - Blob versioning enabled
  - Soft delete enabled (7 days)
  - Restore policy enabled (6 days)

### Container Apps
- **Container App Environment** (`inovy-env-<env>`) - Managed environment for containers
  - VNET integration
  - Log Analytics workspace integration
- **Container App** (`inovy-app-<env>`) - Application container
  - Scaling: 1-3 replicas (configurable)
  - Resources: 0.5-1 CPU, 1-2GB RAM (configurable)
  - Managed Identity for Azure service access
  - Environment variables configured from Terraform outputs

## Backend Configuration

Terraform state is stored in Azure Blob Storage:
- **Resource Group**: `rg-terraform-states`
- **Storage Account**: `sttf<env><suffix>` (generated per environment)
- **Container**: `tfstate`
- **State Key**: `<environment>/infrastructure.tfstate`

## Usage

### Local Development

1. **Initialize Terraform with backend**:
   ```bash
   terraform init \
     -backend-config="resource_group_name=rg-terraform-states" \
     -backend-config="storage_account_name=sttfprd<your-suffix>" \
     -backend-config="container_name=tfstate" \
     -backend-config="key=prd/infrastructure.tfstate"
   ```

2. **Plan changes**:
   ```bash
   terraform plan \
     -var="environment=prd" \
     -var="location=westeurope" \
     -var="resource_group_name=rg-terraform-states"
   ```

3. **Apply changes**:
   ```bash
   terraform apply \
     -var="environment=prd" \
     -var="location=westeurope" \
     -var="resource_group_name=rg-terraform-states"
   ```

### GitHub Actions

The infrastructure is deployed via GitHub Actions workflow (`.github/workflows/azure-infra.yml`):

1. **Plan**: Run workflow with `terraform_action: plan` to preview changes
2. **Apply**: Run workflow with `terraform_action: apply` to deploy changes

## Adding Resources

To add new Azure resources:

1. Add resource definitions to `main.tf`
2. Add any required variables to `variables.tf`
3. Add outputs to `outputs.tf` if needed
4. Test locally with `terraform plan` before deploying

## State Management

- State is stored remotely in Azure Blob Storage
- Each environment has its own state file
- State locking is handled automatically by Azure backend
