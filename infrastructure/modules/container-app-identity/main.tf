# User Assigned Managed Identity for Container App
resource "azurerm_user_assigned_identity" "container_app" {
  name                = "id-container-app-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}
