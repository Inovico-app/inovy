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
- `WORKFLOWS.md` - Workflow documentation

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
