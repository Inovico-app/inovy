# Azure Container Registry for hosting Inovy application images
# Container Apps in the same subscription can pull images using managed identity (AcrPull)
resource "azurerm_container_registry" "inovy" {
  name                = var.acr_name
  resource_group_name = var.resource_group_name
  location             = var.location
  sku           = var.acr_sku
  admin_enabled = var.acr_admin_enabled

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}
