output "redis_cache_hostname" {
  description = "Hostname/FQDN of the Managed Redis Cache"
  value       = azurerm_managed_redis.inovy.hostname
}

output "redis_cache_id" {
  description = "ID of the Managed Redis Cache"
  value       = azurerm_managed_redis.inovy.id
}

output "redis_cache_name" {
  description = "Name of the Managed Redis Cache"
  value       = azurerm_managed_redis.inovy.name
}

# Note: azurerm_managed_redis doesn't expose port, ssl_port, or access keys directly
# These may need to be retrieved via Azure CLI or data sources, or configured separately
# Default Redis SSL port is typically 6380
