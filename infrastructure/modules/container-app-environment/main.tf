# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "inovy" {
  name                = "log-inovy-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_analytics_retention_days

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Container App Environment (shared by Redis and main app)
resource "azurerm_container_app_environment" "inovy" {
  name                       = "inovy-env-${var.environment}"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.inovy.id
  infrastructure_subnet_id   = var.subnet_container_apps_id

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}
