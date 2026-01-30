provider "azurerm" {
  features {}
  use_oidc = true
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0" # or 4.0
    }
  }
}

resource "azurerm_resource_group" "inovy" {
  name     = "rg-inovy-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}
