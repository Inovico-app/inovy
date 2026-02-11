# Azure Managed Redis
resource "azurerm_managed_redis" "inovy" {
  name                = "inovy-redis-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku_name            = "EnterpriseFlash_F300" # Cheapest SKU: 300MB flash-based cache

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}
