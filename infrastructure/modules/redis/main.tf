# Azure Managed Redis
resource "azurerm_managed_redis" "inovy" {
  name                = "inovy-redis-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku_name            = var.redis_sku_name

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}
