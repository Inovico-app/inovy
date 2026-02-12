# Private DNS Zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgresql" {
  name                = "${var.environment}.postgres.database.azure.com"
  resource_group_name = var.resource_group_name

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Link Private DNS Zone to VNET
resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  name                  = "postgresql-dns-link-${var.environment}"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.postgresql.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "inovy" {
  name                          = "inovy-db-${var.environment}"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  version                       = var.postgresql_version
  delegated_subnet_id           = var.subnet_postgresql_id
  private_dns_zone_id           = azurerm_private_dns_zone.postgresql.id
  public_network_access_enabled = false
  administrator_login           = var.postgresql_admin_login
  administrator_password        = var.postgresql_admin_password

  dynamic "zone" {
    for_each = var.postgresql_zone != "" ? [var.postgresql_zone] : []
    content {
      zone = zone.value
    }
  }

  storage_mb = var.postgresql_storage_mb

  sku_name = var.postgresql_sku_name

  maintenance_window {
    day_of_week  = var.postgresql_maintenance_day
    start_hour   = var.postgresql_maintenance_hour
    start_minute = 0
  }

  # Enable both PostgreSQL and Microsoft Entra authentication
  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = true
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgresql]
}

# Database
resource "azurerm_postgresql_flexible_server_database" "inovy" {
  name      = "inovy"
  server_id = azurerm_postgresql_flexible_server.inovy.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Firewall rule to allow Azure services
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.inovy.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Microsoft Entra Administrators
resource "azurerm_postgresql_flexible_server_active_directory_administrator" "admins" {
  for_each = {
    for idx, admin in var.entra_administrators : admin.object_id => admin
  }

  server_name         = azurerm_postgresql_flexible_server.inovy.name
  resource_group_name = var.resource_group_name
  object_id           = each.value.object_id
  principal_name      = each.value.principal_name
  principal_type      = each.value.principal_type
  tenant_id           = var.entra_tenant_id
}
