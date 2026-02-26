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

# Register storage with Container App Environment (required for volume mount)
resource "azurerm_container_app_environment_storage" "qdrant" {
  name                         = "qdrant-storage-${var.environment}"
  container_app_environment_id  = var.container_app_environment_id
  account_name                 = azurerm_storage_account.qdrant.name
  access_key                   = azurerm_storage_account.qdrant.primary_access_key
  share_name                   = azurerm_storage_share.qdrant.name
  access_mode                  = "ReadWrite"
}

# Qdrant Container App - internal only, HTTP port 6333 (REST API)
# - external_enabled = false: no public access; only reachable from within the Container App Environment VNet
# - Other Container Apps in the same environment can connect via qdrant_url (internal FQDN)
resource "azurerm_container_app" "qdrant" {
  name                         = "qdrant-${var.environment}"
  container_app_environment_id  = var.container_app_environment_id
  resource_group_name           = var.resource_group_name
  revision_mode                 = "Single"

  template {
    min_replicas = var.qdrant_min_replicas
    max_replicas = var.qdrant_max_replicas

    container {
      name   = "qdrant"
      image  = var.qdrant_image
      cpu    = var.qdrant_cpu
      memory = var.qdrant_memory

      env {
        name  = "QDRANT__SERVICE__GRPC_PORT"
        value = "6334"
      }

      env {
        name  = "QDRANT__LOG_LEVEL"
        value = "INFO"
      }

      volume_mounts {
        volume_name = "qdrant-storage"
        mount_path  = "/qdrant/storage"
      }

      liveness_probe {
        transport        = "HTTP"
        path             = "/healthz"
        port             = 6333
        initial_delay    = 10
        interval_seconds = 10
      }
    }

    volume {
      name         = "qdrant-storage"
      storage_type = "AzureFile"
      storage_name = azurerm_container_app_environment_storage.qdrant.name
    }
  }

  # Internal ingress only: no public access; accessible from other apps in same Container App Environment
  # HTTP on 6333 (REST API) - Container App forwards port 80 to target_port 6333
  ingress {
    external_enabled = false
    target_port      = 6333
    transport        = "http"
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })

  depends_on = [azurerm_container_app_environment_storage.qdrant]
}
