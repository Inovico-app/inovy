# Storage account for Qdrant data persistence
resource "azurerm_storage_account" "qdrant" {
  name                     = "qdrant${replace(var.environment, "-", "")}${substr(md5(var.resource_group_name), 0, 8)}"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# File share for Qdrant storage
resource "azurerm_storage_share" "qdrant" {
  name               = "qdrant-storage"
  storage_account_id = azurerm_storage_account.qdrant.id
  quota              = var.qdrant_storage_quota_gb
}

# Qdrant Vector Database
# Deploy Qdrant via Azure Container Instances (ACI)
resource "azurerm_container_group" "qdrant" {
  name                = "qdrant-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  ip_address_type     = var.qdrant_ip_address_type
  os_type             = "Linux"
  dns_name_label      = "qdrant-${var.environment}"

  container {
    name   = "qdrant"
    image  = "qdrant/qdrant:v1.11.1"
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

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}
