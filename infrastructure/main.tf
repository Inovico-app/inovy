terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Add your Azure infrastructure resources here
# Example:
# resource "azurerm_resource_group" "example" {
#   name     = "rg-example-${var.environment}"
#   location = var.location
# }
