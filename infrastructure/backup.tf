# Backup Vault
resource "azurerm_data_protection_backup_vault" "inovy" {
  name                = "inovy-backup-vault-${var.environment}"
  resource_group_name = azurerm_resource_group.inovy.name
  location            = azurerm_resource_group.inovy.location
  datastore_type      = "VaultStore"
  redundancy          = var.backup_vault_redundancy

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Backup Policy for PostgreSQL
resource "azurerm_data_protection_backup_policy_postgresql" "inovy" {
  name                = "postgresql-backup-policy-${var.environment}"
  resource_group_name = azurerm_resource_group.inovy.name
  vault_name          = azurerm_data_protection_backup_vault.inovy.name

  backup_repeating_time_intervals = ["R/2024-01-01T02:00:00+00:00/P1D"]
  default_retention_duration      = "P30D"
  retention_rule {
    name     = "Daily"
    duration = "P30D"
    priority = 25
    criteria {
      absolute_criteria = "FirstOfDay"
    }
  }
}

# Backup Instance for PostgreSQL Flexible Server
resource "azurerm_data_protection_backup_instance_postgresql" "inovy" {
  name     = "postgresql-backup-instance-${var.environment}"
  vault_id = azurerm_data_protection_backup_vault.inovy.id
  location = azurerm_resource_group.inovy.location

  database_id      = azurerm_postgresql_flexible_server.inovy.id
  backup_policy_id = azurerm_data_protection_backup_policy_postgresql.inovy.id

  depends_on = [
    azurerm_postgresql_flexible_server.inovy,
    azurerm_data_protection_backup_policy_postgresql.inovy
  ]
}
