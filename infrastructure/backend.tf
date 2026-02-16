terraform {
  # If you store state in Azure Storage, that ALSO needs OIDC config
  # storage_account_name and key must be provided via -backend-config during terraform init
  backend "azurerm" {
    resource_group_name = "rg-terraform-states"
    container_name      = "tfstate"
    use_oidc            = true
    # storage_account_name - Must be provided via -backend-config (e.g., "sttf<env>inovy")
    # key                  - Must be provided via -backend-config (e.g., "<env>/terraform.tfstate")
  }
}
