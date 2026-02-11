output "redis_cache_hostname" {
  description = "Hostname of the Managed Redis Cache"
  value       = azurerm_managed_redis.inovy.hostname
}

output "redis_cache_port" {
  description = "Port of the Managed Redis Cache"
  value       = azurerm_managed_redis.inovy.port
}

output "redis_cache_ssl_port" {
  description = "SSL port of the Managed Redis Cache"
  value       = azurerm_managed_redis.inovy.ssl_port
}

output "redis_cache_primary_access_key" {
  description = "Primary access key for Managed Redis Cache"
  value       = azurerm_managed_redis.inovy.primary_access_key
  sensitive   = true
}

output "redis_cache_secondary_access_key" {
  description = "Secondary access key for Managed Redis Cache"
  value       = azurerm_managed_redis.inovy.secondary_access_key
  sensitive   = true
}
