# Infrastructure as Code

This directory contains Terraform configuration files for managing Azure infrastructure.

**Provider Version**: Uses `azurerm` provider version `~> 4.0`

## Documentation

- **[WORKFLOWS.md](./WORKFLOWS.md)** - Detailed explanation of GitHub Actions workflows and Terraform deployment process
- **[README.md](./README.md)** - This file (quick reference)

## Structure

### Root Configuration Files
- `main.tf` - Main Terraform configuration, provider setup, and module calls
- `variables.tf` - Input variables for all modules
- `outputs.tf` - Output values aggregating module outputs
- `backend.tf` - Backend configuration for Terraform state storage
- `DEPLOYMENT.md` - Deployment guide
- `WORKFLOWS.md` - Workflow documentation

### Modules (`modules/`)

The infrastructure is organized into reusable modules:

- **`modules/networking/`** - Virtual Network, Subnets, and Network Security Groups
  - `main.tf` - VNET, subnets, NSGs, and associations
  - `variables.tf` - Networking-specific variables
  - `outputs.tf` - Network resource IDs and names

- **`modules/database/`** - PostgreSQL Flexible Server and database
  - `main.tf` - PostgreSQL server, database, DNS zone, firewall rules
  - `variables.tf` - Database configuration variables
  - `outputs.tf` - Database connection strings and server details

- **`modules/backup/`** - Backup Vault and backup policies
  - `main.tf` - Backup vault, policy, and instance
  - `variables.tf` - Backup configuration variables
  - `outputs.tf` - Backup vault details

- **`modules/redis/`** - Azure Redis Cache
  - `main.tf` - Redis cache and firewall rules
  - `variables.tf` - Redis configuration variables
  - `outputs.tf` - Redis connection details

- **`modules/qdrant/`** - Qdrant Vector Database (Container Instances)
  - `main.tf` - Qdrant container group and storage
  - `variables.tf` - Qdrant configuration variables
  - `outputs.tf` - Qdrant endpoint URLs

- **`modules/storage/`** - Azure Blob Storage for recordings
  - `main.tf` - Storage account and container
  - `variables.tf` - Storage configuration variables
  - `outputs.tf` - Storage connection strings and endpoints

- **`modules/container-app/`** - Container App Environment and Container App
  - `main.tf` - Container App Environment, Container App, Log Analytics, Managed Identity
  - `variables.tf` - Container App configuration variables
  - `outputs.tf` - Container App URLs and identity details

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

## Architecture

The infrastructure uses a modular architecture where each major component is a separate Terraform module. This provides:

- **Reusability**: Modules can be reused across environments
- **Maintainability**: Each module is self-contained with its own variables and outputs
- **Separation of Concerns**: Related resources are grouped logically
- **Dependency Management**: Modules declare dependencies through variable passing

### Module Dependencies

```
networking (no dependencies)
    ├── database (depends on networking)
    ├── redis (depends on networking)
    └── container-app (depends on networking, database, redis, qdrant, storage)

backup (depends on database)
qdrant (no dependencies)
storage (no dependencies)
```

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

To add new Azure resources, you have two options:

### Option 1: Add to Existing Module

If the resource fits logically into an existing module:

1. Add resource definitions to the module's `main.tf`
2. Add any required variables to the module's `variables.tf`
3. Add outputs to the module's `outputs.tf`
4. Update root `variables.tf` if new root-level variables are needed
5. Update root `outputs.tf` to expose module outputs if needed
6. Update root `main.tf` to pass new variables to the module
7. Test locally with `terraform plan` before deploying

### Option 2: Create New Module

If the resource warrants its own module:

1. Create a new directory in `modules/` (e.g., `modules/new-resource/`)
2. Create `main.tf`, `variables.tf`, and `outputs.tf` in the new module
3. Add module call to root `main.tf`
4. Add any required variables to root `variables.tf`
5. Add outputs to root `outputs.tf` if needed
6. Test locally with `terraform plan` before deploying

## State Management

- State is stored remotely in Azure Blob Storage
- Each environment has its own state file
- State locking is handled automatically by Azure backend
