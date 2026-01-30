terraform {
  # If you store state in Azure Storage, that ALSO needs OIDC config
  backend "azurerm" {
    resource_group_name  = var.resource_group_name
    storage_account_name = "sttf${var.environment}inovy"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
    use_oidc             = true
  }
}
