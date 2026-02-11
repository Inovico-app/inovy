output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.recordings.name
}

output "storage_account_primary_connection_string" {
  description = "Primary connection string for the storage account"
  value       = azurerm_storage_account.recordings.primary_connection_string
  sensitive   = true
}

output "storage_account_primary_access_key" {
  description = "Primary access key for the storage account"
  value       = azurerm_storage_account.recordings.primary_access_key
  sensitive   = true
}

output "storage_container_name" {
  description = "Name of the recordings container"
  value       = azurerm_storage_container.recordings.name
}

output "storage_account_primary_blob_endpoint" {
  description = "Primary blob endpoint URL"
  value       = azurerm_storage_account.recordings.primary_blob_endpoint
}

output "storage_account_id" {
  description = "ID of the storage account"
  value       = azurerm_storage_account.recordings.id
}
