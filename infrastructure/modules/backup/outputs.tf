output "backup_vault_id" {
  description = "ID of the Backup Vault"
  value       = azurerm_data_protection_backup_vault.inovy.id
}

output "backup_vault_name" {
  description = "Name of the Backup Vault"
  value       = azurerm_data_protection_backup_vault.inovy.name
}

output "backup_vault_identity_principal_id" {
  description = "Principal ID of the Backup Vault identity"
  value       = azurerm_data_protection_backup_vault.inovy.identity[0].principal_id
}