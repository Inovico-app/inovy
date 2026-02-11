# Qdrant Vector Database
# Note: Qdrant may be available via Azure Marketplace as a managed service
# or may need to be deployed via Container Instances or VM
# This configuration provides flexibility for different deployment methods

# Option 1: If Qdrant is available as Azure Marketplace managed service
# Uncomment and configure the marketplace resource below if available

# resource "azurerm_marketplace_agreement" "qdrant" {
#   publisher = "qdrant"
#   offer     = "qdrant"
#   plan      = "qdrant-plan"
# }

# Option 2: Deploy Qdrant via Azure Container Instances (ACI)
# This is a common approach for Qdrant on Azure
resource "azurerm_container_group" "qdrant" {
  name                = "qdrant-${var.environment}"
  location            = azurerm_resource_group.inovy.location
  resource_group_name = azurerm_resource_group.inovy.name
  ip_address_type     = var.qdrant_ip_address_type
  os_type             = "Linux"
  dns_name_label      = "qdrant-${var.environment}"

  container {
    name   = "qdrant"
    image  = "qdrant/qdrant:latest"
    cpu    = var.qdrant_cpu
    memory = var.qdrant_memory

    ports {
      port     = 6333
      protocol = "TCP"
    }

    ports {
      port     = 6334
      protocol = "TCP"
    }

    environment_variables = {
      QDRANT__SERVICE__GRPC_PORT = "6334"
      QDRANT__LOG_LEVEL          = "INFO"
    }

    volume {
      name                 = "qdrant-storage"
      mount_path           = "/qdrant/storage"
      storage_account_name = azurerm_storage_account.qdrant.name
      storage_account_key  = azurerm_storage_account.qdrant.primary_access_key
      share_name           = azurerm_storage_share.qdrant.name
    }
  }

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Storage account for Qdrant data persistence
resource "azurerm_storage_account" "qdrant" {
  name                     = "qdrant${replace(var.environment, "-", "")}${substr(md5(azurerm_resource_group.inovy.name), 0, 8)}"
  resource_group_name      = azurerm_resource_group.inovy.name
  location                 = azurerm_resource_group.inovy.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# File share for Qdrant storage
resource "azurerm_storage_share" "qdrant" {
  name                 = "qdrant-storage"
  storage_account_name = azurerm_storage_account.qdrant.name
  quota                = var.qdrant_storage_quota_gb
}
