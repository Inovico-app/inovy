# Azure Blob Storage Account for recordings
resource "azurerm_storage_account" "recordings" {
  name                     = "inovyblob${replace(var.environment, "-", "")}"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_account_replication_type
  account_kind             = "StorageV2"
  min_tls_version          = "TLS1_2"

  # Disable public blob access for security
  allow_nested_items_to_be_public = false

  # Enable blob versioning and soft delete
  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = var.storage_blob_retention_days
    }
    change_feed_enabled = true
    restore_policy {
      days = var.storage_blob_restore_days
    }
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Container for recordings
resource "azurerm_storage_container" "recordings" {
  name                  = "recordings"
  storage_account_name  = azurerm_storage_account.recordings.name
  container_access_type = "private"
}
