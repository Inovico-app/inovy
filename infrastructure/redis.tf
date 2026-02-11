# Azure Redis Cache
resource "azurerm_redis_cache" "inovy" {
  name                = "inovy-redis-${var.environment}"
  location            = azurerm_resource_group.inovy.location
  resource_group_name = azurerm_resource_group.inovy.name
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku_name
  minimum_tls_version = var.redis_minimum_tls_version

  subnet_id = azurerm_subnet.redis.id

  redis_configuration {
    maxmemory_reserved = var.redis_maxmemory_reserved
    maxmemory_delta    = var.redis_maxmemory_delta
    maxmemory_policy   = var.redis_maxmemory_policy
  }

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Firewall rule to allow access from Container Apps subnet
resource "azurerm_redis_firewall_rule" "container_apps" {
  name                = "AllowContainerApps"
  redis_cache_name    = azurerm_redis_cache.inovy.name
  resource_group_name = azurerm_resource_group.inovy.name
  start_ip            = cidrhost(var.subnet_container_apps_address_prefix, 0)
  end_ip              = cidrhost(var.subnet_container_apps_address_prefix, -1)
}
