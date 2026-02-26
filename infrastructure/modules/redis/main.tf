# Azure Managed Redis
resource "azurerm_managed_redis" "inovy" {
  name                         = "inovy-redis-${var.environment}"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  sku_name                     = var.redis_sku_name
  high_availability_enabled    = var.high_availability_enabled

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Entra authentication: assign container app managed identity to Redis access policy
resource "azurerm_managed_redis_access_policy_assignment" "container_app" {
  count = var.container_app_managed_identity_principal_id != "" ? 1 : 0

  redis_cache_id         = azurerm_managed_redis.inovy.id
  name                   = "container-app-${var.environment}"
  access_policy_name     = "Data Contributor"
  object_id              = var.container_app_managed_identity_principal_id
  object_id_alias        = "container-app-identity"
}
