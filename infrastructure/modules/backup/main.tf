# Backup Vault
resource "azurerm_data_protection_backup_vault" "inovy" {
  name                = "inovy-backup-vault-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  datastore_type      = "VaultStore"
  redundancy          = var.backup_vault_redundancy

  # Enable system assigned managed identity
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

  backup_repeating_time_intervals = var.backup_repeating_time_intervals
  time_zone                       = var.backup_time_zone

  default_retention_rule {
    life_cycle {
      duration        = "P30D"
      data_store_type = "VaultStore"
    }
  }

  # Weekly retention rule - keeps first backup of each week for 30 days
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

# Role Assignment: Grant backup vault identity permission to backup PostgreSQL Flexible Server
resource "azurerm_role_assignment" "backup_vault_postgresql" {
  scope                            = var.postgresql_server_id
  role_definition_id               = "c088a766-074b-43ba-90d4-1fb21feae531" # PostgreSQL Flexible Server Long Term Retention Backup Role
  principal_id                     = azurerm_data_protection_backup_vault.inovy.identity[0].principal_id
  skip_service_principal_aad_check = true

  depends_on = [
    data.azurerm_data_protection_backup_vault.inovy
  ]
}

# Backup Instance for PostgreSQL Flexible Server
resource "azurerm_data_protection_backup_instance_postgresql_flexible_server" "inovy" {
  name     = "postgresql-backup-instance-${var.environment}"
  vault_id = azurerm_data_protection_backup_vault.inovy.id
  location = var.location

  server_id        = var.postgresql_server_id
  backup_policy_id = azurerm_data_protection_backup_policy_postgresql_flexible_server.inovy.id

  depends_on = [
    azurerm_data_protection_backup_policy_postgresql_flexible_server.inovy,
    azurerm_role_assignment.backup_vault_postgresql
  ]
}
