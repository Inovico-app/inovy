output "redis_hostname" {
  description = "Hostname/FQDN of the Redis Container App (use for internal connections)"
  value       = azurerm_container_app.redis.latest_revision_fqdn
}

output "redis_port" {
  description = "Redis port"
  value       = 6379
}

output "redis_url" {
  description = "Redis connection URL (redis://:password@host:port)"
  value       = "redis://:${var.redis_password}@${azurerm_container_app.redis.latest_revision_fqdn}:6379"
  sensitive   = true
}

