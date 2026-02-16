# GitHub Actions Workflows for Terraform Infrastructure

This document explains the GitHub Actions workflows used for managing Azure infrastructure with Terraform.

## Overview

There are two main workflows for infrastructure management:

1. **terraform-storage-setup.yml** - One-time setup per environment (creates Terraform state storage)
2. **azure-infra.yml** - Regular infrastructure deployments (plan/apply Terraform changes)

---

## App Registration Requirements

### App Registration: `app-inovy-gh-infra-prd`

The service principal used by both workflows requires specific Azure RBAC permissions and OIDC configuration.

#### Required Azure RBAC Role Assignments

| Role | Scope | Workflow | Purpose |
|------|-------|----------|---------|
| **Contributor** | Subscription or `rg-terraform-states` | terraform-storage-setup.yml | Create resource groups, storage accounts, register resource providers |
| **Storage Blob Data Contributor** | Storage Account (`sttf<env>inovy`) | Both workflows | Read/write Terraform state files and plan files |
| **User Access Administrator** | Subscription or Resource Group | terraform-storage-setup.yml | Assign "Storage Blob Data Contributor" role (if done automatically) |
| **Contributor** | Subscription or `rg-inovy-<env>` | azure-infra.yml | Create/update/delete infrastructure resources via Terraform |

#### OIDC Federated Credential Configuration

The app registration must have a federated credential configured for GitHub Actions:

- **Subject**: `repo:<org>/<repo>:environment:prd`
- **Issuer**: `https://token.actions.githubusercontent.com`
- **Audience**: `api://AzureADTokenExchange`

#### API Permissions

- **Microsoft Graph**: `User.Read` (if needed)
- **Azure Service Management**: `user_impersonation` (for Azure Resource Manager)

#### Verification

To verify permissions are correctly configured:

```bash
# Get service principal object ID
SP_OBJECT_ID=$(az ad sp show --id <client-id> --query id -o tsv)

# Check subscription-level assignments
az role assignment list \
  --assignee $SP_OBJECT_ID \
  --scope /subscriptions/<subscription-id> \
  --output table

# Check storage account assignments
az role assignment list \
  --assignee $SP_OBJECT_ID \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-terraform-states/providers/Microsoft.Storage/storageAccounts/sttfprdinovy \
  --output table
```

---

---

## Workflow 1: Terraform Storage Setup (`terraform-storage-setup.yml`)

### Purpose

This workflow performs a **one-time setup** for each environment to enable Terraform state management. It creates the Azure Storage Account and container that will store Terraform state files.

### When to Run

- **Once per environment** (prd, dev, staging, etc.)
- Before running any Terraform deployments for a new environment
- Only needs to be run again if the storage account needs to be recreated

### What It Does

1. **Azure Authentication**
   - Authenticates using OIDC with the service principal
   - Uses environment variables: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_SUBSCRIPTION_ID`

2. **Resource Provider Registration**
   - Registers `Microsoft.Storage` resource provider if not already registered
   - Required for creating storage accounts

3. **Storage Account Name Generation**
   - Generates a unique storage account name: `sttf<env><suffix>`
   - Example: `sttfprdinovy` for production environment
   - Ensures Azure naming requirements (3-24 chars, lowercase, alphanumeric)

4. **Resource Group Creation**
   - Creates `rg-terraform-states` resource group if it doesn't exist
   - Default location: `westeurope`

5. **Storage Account Creation**
   - Creates Azure Storage Account with:
     - SKU: Standard_LRS
     - Kind: StorageV2
     - Public blob access: Disabled (security best practice)
     - Minimum TLS version: TLS1_2

6. **Storage Account Features**
   - Enables blob versioning (for state file recovery)
   - Enables soft delete (7 days retention)
   - Enables change feed
   - Enables restore policy (6 days restore window)

7. **Container Creation**
   - Creates `tfstate` container for storing Terraform state files

8. **Role Assignment**
   - Assigns "Storage Blob Data Contributor" role to the service principal
   - Required for Terraform to read/write state files

9. **Output**
   - Displays storage account details and backend configuration example

### Input Parameters

- `environment` (required): Environment name (e.g., "prd", "dev", "staging")
- `resource_group_name` (required): Resource group for state storage (default: "rg-terraform-states")
- `storage_account_suffix` (optional): Suffix for storage account name (default: "inovy")
- `location` (required): Azure region (default: "westeurope")

### Prerequisites

- GitHub environment "prd" configured with:
  - `AZURE_TENANT_ID`
  - `AZURE_CLIENT_ID`
  - `AZURE_SUBSCRIPTION_ID`
- **App Registration**: `app-inovy-gh-infra-prd` must have the following Azure RBAC permissions:

#### Required Azure RBAC Role Assignments

The service principal (`app-inovy-gh-infra-prd`) requires the following role assignments:

1. **Subscription Level** (or Resource Group: `rg-terraform-states`):
   - **Contributor** or **Owner**
     - Required for: Creating resource groups, storage accounts, registering resource providers
     - Scope: Subscription or Resource Group `rg-terraform-states`

2. **Storage Account Level** (on each storage account: `sttf<env>inovy`):
   - **Storage Blob Data Contributor**
     - Required for: Reading/writing Terraform state files and plan files
     - Scope: Storage Account resource
     - Note: This role is automatically assigned by the workflow, but the service principal needs permission to assign roles

3. **User Access Administrator** (optional, for role assignments):
   - Required for: Assigning "Storage Blob Data Contributor" role to itself
   - Scope: Subscription or Resource Group
   - Alternative: Pre-assign "Storage Blob Data Contributor" role manually, or use a separate service principal with User Access Administrator role

#### Minimum Required Permissions Summary

| Permission | Scope | Purpose |
|------------|-------|---------|
| Contributor | Subscription or `rg-terraform-states` | Create/update resource groups and storage accounts |
| Storage Blob Data Contributor | Storage Account (`sttf<env>inovy`) | Read/write Terraform state and plan files |
| User Access Administrator | Subscription or Resource Group | Assign roles (if role assignment is done automatically) |

#### Verification Commands

To verify the permissions are correctly assigned:

```bash
# Check subscription-level role assignments
az role assignment list \
  --assignee <service-principal-object-id> \
  --scope /subscriptions/<subscription-id> \
  --output table

# Check storage account role assignments
az role assignment list \
  --assignee <service-principal-object-id> \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-terraform-states/providers/Microsoft.Storage/storageAccounts/sttfprdinovy \
  --output table
```

#### GitHub OIDC Configuration

The app registration must also be configured for OIDC authentication:

1. **Federated Credential** configured in Azure AD:
   - Subject: `repo:<org>/<repo>:environment:prd`
   - Issuer: `https://token.actions.githubusercontent.com`
   - Audience: `api://AzureADTokenExchange`

2. **API Permissions** in Azure AD:
   - Microsoft Graph: `User.Read` (if needed)
   - Azure Service Management: `user_impersonation` (for Azure Resource Manager)

---

## Workflow 2: Azure Infrastructure Deployment (`azure-infra.yml`)

### Purpose

This workflow manages the actual infrastructure deployments using Terraform. It handles planning and applying infrastructure changes.

### When to Run

- **Whenever infrastructure needs to be updated**
- After making changes to Terraform files in the `infrastructure/` folder
- For planning changes (preview what will be created/modified)
- For applying changes (actually deploy the infrastructure)

### What It Does

#### Step 1: Repository Checkout
- Checks out the repository code
- Makes Terraform files available to the runner

#### Step 2: Azure Authentication
- Authenticates using OIDC with the service principal
- Sets up ARM environment variables for Terraform Azure provider:
  - `ARM_CLIENT_ID`
  - `ARM_SUBSCRIPTION_ID`
  - `ARM_TENANT_ID`
  - `ARM_USE_OIDC` (enables OIDC authentication)

#### Step 3: Terraform Setup
- Installs Terraform version 1.6.0
- Makes `terraform` command available

#### Step 4: Terraform Init
- Initializes Terraform working directory
- Configures backend to use Azure Storage Account:
  - Resource Group: `rg-terraform-states`
  - Storage Account: `sttf<env>inovy`
  - Container: `tfstate`
  - State Key: `<environment>/infrastructure.tfstate`
- Downloads required providers (azurerm)

#### Step 5: Terraform Force Unlock (Optional)
- Only runs if `terraform_unlock` input is provided
- Unlocks Terraform state if it's stuck in a locked state
- Use when: Previous Terraform operation failed and left state locked

#### Step 6: Terraform Plan (if action = "plan")
- Generates execution plan showing what Terraform will do
- Compares current state with desired state
- Outputs planned changes (create, update, delete)
- Saves plan to `tfplan` file
- **Uploads plan file to Azure Storage** for later use

#### Step 7: Upload Plan to Storage (if action = "plan")
- Uploads `tfplan` file to Azure Storage Account
- Stored at: `<environment>/tfplan` blob
- Allows plan to be reviewed and applied in a separate workflow run

#### Step 8: Download Plan from Storage (if action = "apply")
- Downloads previously saved `tfplan` file from Azure Storage
- Ensures apply uses the exact plan that was reviewed
- Fails if plan file doesn't exist (must run plan first)

#### Step 9: Terraform Apply (if action = "apply")
- Applies the infrastructure changes
- Uses the downloaded `tfplan` file (ensures consistency)
- Creates, updates, or deletes Azure resources as planned
- Updates Terraform state file in Azure Storage

### Input Parameters

- `environment` (required): Environment to deploy to (default: "prd")
- `terraform_action` (required): Action to perform - "plan" or "apply" (default: "plan")
- `resource_group_name` (required): Resource group for state storage (default: "rg-terraform-states")
- `location` (required): Azure region for resources (default: "westeurope")
- `terraform_unlock` (optional): Lock ID to force-unlock state if locked

### Prerequisites

- GitHub environment "prd" configured with:
  - `AZURE_TENANT_ID`
  - `AZURE_CLIENT_ID`
  - `AZURE_SUBSCRIPTION_ID`
- **App Registration**: `app-inovy-gh-infra-prd` must have the following Azure RBAC permissions:

#### Required Azure RBAC Role Assignments

The service principal (`app-inovy-gh-infra-prd`) requires the following role assignments:

1. **Storage Account Level** (on storage account: `sttf<env>inovy`):
   - **Storage Blob Data Contributor**
     - Required for: Reading/writing Terraform state files and plan files
     - Scope: Storage Account resource (`sttfprdinovy` for production)
     - This role is assigned automatically by `terraform-storage-setup.yml` workflow

2. **Subscription Level** (or Resource Group: `rg-inovy-<environment>`):
   - **Contributor** or **Owner**
     - Required for: Creating/updating/deleting Azure resources via Terraform
     - Scope: Subscription or Resource Group `rg-inovy-<environment>`
     - This allows Terraform to manage all infrastructure resources defined in `main.tf`

#### Minimum Required Permissions Summary

| Permission | Scope | Purpose |
|------------|-------|---------|
| Storage Blob Data Contributor | Storage Account (`sttf<env>inovy`) | Read/write Terraform state and plan files |
| Contributor | Subscription or `rg-inovy-<env>` | Create/update/delete infrastructure resources via Terraform |

#### Verification Commands

To verify the permissions are correctly assigned:

```bash
# Check storage account role assignments
az role assignment list \
  --assignee <service-principal-object-id> \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-terraform-states/providers/Microsoft.Storage/storageAccounts/sttfprdinovy \
  --output table

# Check subscription-level role assignments
az role assignment list \
  --assignee <service-principal-object-id> \
  --scope /subscriptions/<subscription-id> \
  --output table
```

### Workflow Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Execution                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  1. Checkout Repository           │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  2. Azure Login (OIDC)            │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  3. Setup Terraform               │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  4. Terraform Init                │
        │     (Configure backend)           │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  5. Force Unlock (if needed)      │
        └───────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌───────────────────┐    ┌───────────────────┐
    │   PLAN PATH      │    │   APPLY PATH      │
    └───────────────────┘    └───────────────────┘
            │                       │
            ▼                       ▼
    ┌───────────────────┐    ┌───────────────────┐
    │  6. Terraform Plan│    │  8. Download Plan │
    └───────────────────┘    └───────────────────┘
            │                       │
            ▼                       ▼
    ┌───────────────────┐    ┌───────────────────┐
    │  7. Upload Plan   │    │  9. Terraform     │
    │      to Storage   │    │      Apply        │
    └───────────────────┘    └───────────────────┘
```

---

## Terraform Deployment Process Explained

### What Happens During Terraform Operations

#### 1. **Terraform Init**
- Reads `backend.tf` configuration
- Connects to Azure Storage Account backend
- Downloads required provider plugins (azurerm)
- Initializes `.terraform` directory with provider binaries
- Sets up state file location in Azure Storage

#### 2. **Terraform Plan**
- Reads all `.tf` files in the `infrastructure/` directory
- Loads current state from Azure Storage (`<environment>/infrastructure.tfstate`)
- Compares desired state (from `.tf` files) with current state
- Calculates what changes are needed:
  - **+** Resources to create
  - **~** Resources to modify
  - **-** Resources to destroy
- Generates execution plan
- Saves plan to `tfplan` file (binary format)

#### 3. **Terraform Apply**
- Loads the execution plan from `tfplan` file
- Executes the planned changes in order:
  1. Creates new resources
  2. Updates existing resources
  3. Destroys removed resources
- Updates state file after each successful operation
- Handles dependencies automatically (creates resources in correct order)

### State Management

- **State File Location**: Azure Storage Account (`sttf<env>inovy/tfstate/<environment>/infrastructure.tfstate`)
- **State Locking**: Azure backend automatically locks state during operations
- **State Versioning**: Enabled on storage account (can restore previous versions)
- **State Backup**: Soft delete enabled (7 days retention)

### Current Infrastructure Resources

The Terraform configuration currently manages:

- **Resource Group**: `rg-inovy-<environment>`
  - Location: `westeurope` (or specified location)
  - Tags: Environment, Application, ManagedBy

### Adding New Resources

To add new Azure resources:

1. Edit `infrastructure/main.tf` and add resource definitions
2. Add variables to `infrastructure/variables.tf` if needed
3. Add outputs to `infrastructure/outputs.tf` if needed
4. Run workflow with `terraform_action: plan` to preview changes
5. Review the plan output
6. Run workflow with `terraform_action: apply` to deploy changes

### Best Practices

1. **Always Plan First**: Run `plan` before `apply` to review changes
2. **Review Plans Carefully**: Check what resources will be created/modified/deleted
3. **Use Separate Plans**: Plan and apply can run in separate workflow runs
4. **State Locking**: If state is locked, use `terraform_unlock` input with lock ID
5. **Version Control**: Commit Terraform files to Git before applying
6. **Environment Separation**: Each environment has its own state file

### Troubleshooting

#### State Locked Error
- **Symptom**: "Error acquiring the state lock"
- **Solution**: Use `terraform_unlock` input with the lock ID from error message

#### Plan File Not Found
- **Symptom**: "Plan file not found in storage account"
- **Solution**: Run workflow with `terraform_action: plan` first

#### Storage Account Not Found
- **Symptom**: "Storage account not found"
- **Solution**: Run `terraform-storage-setup.yml` workflow first for the environment

#### Authentication Errors
- **Symptom**: "Authentication failed" or "Access denied"
- **Solution**: Verify service principal has required permissions:
  - Storage Blob Data Contributor (on storage account)
  - Contributor or Owner (on subscription/resource group)

---

## Quick Reference

### First-Time Setup (New Environment)

1. Run `terraform-storage-setup.yml` with environment parameter
2. Verify storage account was created
3. Run `azure-infra.yml` with `terraform_action: plan` to initialize state
4. Run `azure-infra.yml` with `terraform_action: apply` to create initial resources

### Regular Infrastructure Updates

1. Make changes to Terraform files in `infrastructure/` folder
2. Commit and push changes to Git
3. Run `azure-infra.yml` with `terraform_action: plan`
4. Review the plan output
5. Run `azure-infra.yml` with `terraform_action: apply`

### Emergency Unlock

1. Get lock ID from error message
2. Run `azure-infra.yml` with `terraform_unlock: <LOCK_ID>`
3. Re-run the original operation
