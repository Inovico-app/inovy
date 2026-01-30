terraform {
  # If you store state in Azure Storage, that ALSO needs OIDC config
  backend "azurerm" {
    resource_group_name  = "rg-terraform-states"
    storage_account_name = "sttfprdinovy"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
    use_oidc             = true
  }
}
