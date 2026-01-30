terraform {
  backend "azurerm" {
    # These values will be provided via backend config file or command line
    # resource_group_name  = "rg-terraform-states"
    # storage_account_name = "sttfprd<unique-suffix>"
    # container_name       = "tfstate"
    # key                  = "prd/infrastructure.tfstate"
  }
}
