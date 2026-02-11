# Backup Vault
resource "azurerm_data_protection_backup_vault" "inovy" {
  name                = "inovy-backup-vault-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  datastore_type      = "VaultStore"
  redundancy          = var.backup_vault_redundancy

  identity {
    type = "SystemAssigned"
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Backup Policy for PostgreSQL Flexible Server
resource "azurerm_data_protection_backup_policy_postgresql_flexible_server" "inovy" {
  name     = "postgresql-backup-policy-${var.environment}"
  vault_id = azurerm_data_protection_backup_vault.inovy.id

  backup_repeating_time_intervals = ["R/2024-01-01T02:00:00+00:00/P7D"]

  default_retention_rule {
    life_cycle {
      duration        = "P30D"
      data_store_type = "VaultStore"
    }
  }

  retention_rule {
    name     = "Weekly"
    priority = 25
    life_cycle {
      duration        = "P30D"
      data_store_type = "VaultStore"
    }
    criteria {
      absolute_criteria = "FirstOfWeek"
    }
  }
}

# Backup Instance for PostgreSQL Flexible Server
resource "azurerm_data_protection_backup_instance_postgresql" "inovy" {
  name     = "postgresql-backup-instance-${var.environment}"
  vault_id = azurerm_data_protection_backup_vault.inovy.id
  location = var.location

  database_id      = var.postgresql_server_id
  backup_policy_id = azurerm_data_protection_backup_policy_postgresql_flexible_server.inovy.id

  depends_on = [
    azurerm_data_protection_backup_policy_postgresql_flexible_server.inovy
  ]
}
