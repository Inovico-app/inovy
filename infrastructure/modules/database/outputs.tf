output "postgresql_server_id" {
  description = "ID of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.inovy.id
}

output "postgresql_server_fqdn" {
  description = "FQDN of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.inovy.fqdn
}

output "postgresql_database_name" {
  description = "Name of the PostgreSQL database"
  value       = azurerm_postgresql_flexible_server_database.inovy.name
}

output "postgresql_administrator_login" {
  description = "PostgreSQL administrator login"
  value       = azurerm_postgresql_flexible_server.inovy.administrator_login
  sensitive   = true
}

output "postgresql_administrator_password" {
  description = "PostgreSQL administrator password"
  value       = azurerm_postgresql_flexible_server.inovy.administrator_password
  sensitive   = true
}

output "postgresql_connection_string" {
  description = "PostgreSQL connection string (without password)"
  value       = "postgresql://${azurerm_postgresql_flexible_server.inovy.administrator_login}@${azurerm_postgresql_flexible_server.inovy.fqdn}:5432/${azurerm_postgresql_flexible_server_database.inovy.name}?sslmode=require"
  sensitive   = true
}
