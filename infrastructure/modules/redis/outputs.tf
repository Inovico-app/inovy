output "redis_cache_hostname" {
  description = "Hostname of the Redis Cache"
  value       = azurerm_redis_cache.inovy.hostname
}

output "redis_cache_port" {
  description = "Port of the Redis Cache"
  value       = azurerm_redis_cache.inovy.port
}

output "redis_cache_ssl_port" {
  description = "SSL port of the Redis Cache"
  value       = azurerm_redis_cache.inovy.ssl_port
}

output "redis_cache_primary_access_key" {
  description = "Primary access key for Redis Cache"
  value       = azurerm_redis_cache.inovy.primary_access_key
  sensitive   = true
}

output "redis_cache_secondary_access_key" {
  description = "Secondary access key for Redis Cache"
  value       = azurerm_redis_cache.inovy.secondary_access_key
  sensitive   = true
}
