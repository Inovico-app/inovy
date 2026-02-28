# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "inovy" {
  count               = var.container_app_environment_id == "" ? 1 : 0
  name                = "log-inovy-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days    = var.log_analytics_retention_days

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Container App Environment (only when not using shared environment)
# workload_profile required when infrastructure_resource_group_name is specified
resource "azurerm_container_app_environment" "inovy" {
  count                             = var.container_app_environment_id == "" ? 1 : 0
  name                              = "inovy-env-${var.environment}"
  location                          = var.location
  resource_group_name               = var.resource_group_name
  log_analytics_workspace_id        = azurerm_log_analytics_workspace.inovy[0].id
  infrastructure_subnet_id          = var.subnet_container_apps_id
  infrastructure_resource_group_name = "ME_inovy-env-${var.environment}_${var.resource_group_name}_${replace(lower(var.location), " ", "")}"

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Data source for subscription ID (used for full role definition path to prevent replacement)
data "azurerm_client_config" "current" {}

# Managed Identity for Container App
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

# Role assignment for Managed Identity to access Storage Account
resource "azurerm_role_assignment" "storage_blob_data_contributor" {
  name                 = uuidv5(var.uuid_namespace, "inovy-${var.environment}-container-app-storage-blob")
  scope                = var.storage_account_id
  role_definition_id   = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe" # Storage Blob Data Contributor
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

# Role assignment for Managed Identity to pull images from ACR
resource "azurerm_role_assignment" "acr_pull" {
  count                = var.acr_id != "" ? 1 : 0
  name                 = uuidv5(var.uuid_namespace, "inovy-${var.environment}-container-app-acr-pull")
  scope                = var.acr_id
  role_definition_id   = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/providers/Microsoft.Authorization/roleDefinitions/7f951dda-4ed3-4680-a7ca-43fe172d538d" # AcrPull
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
  skip_service_principal_aad_check = true
}

# Container App
resource "azurerm_container_app" "inovy" {
  name                         = "inovy-app-${var.environment}"
  container_app_environment_id = var.container_app_environment_id != "" ? var.container_app_environment_id : azurerm_container_app_environment.inovy[0].id
  resource_group_name          = var.resource_group_name
  revision_mode                = var.container_app_revision_mode

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_app.id]
  }

  dynamic "registry" {
    for_each = var.acr_login_server != "" ? [1] : []
    content {
      server               = var.acr_login_server
      identity             = azurerm_user_assigned_identity.container_app.id
    }
  }

  ingress {
    external_enabled = var.container_app_external_ingress
    target_port      = var.container_app_target_port
    transport        = "http"
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = var.container_app_min_replicas
    max_replicas = var.container_app_max_replicas

    container {
      name   = "inovy-app"
      image  = var.container_app_image
      cpu    = var.container_app_cpu
      memory = var.container_app_memory

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${var.postgresql_admin_login}:${var.postgresql_admin_password}@${var.postgresql_fqdn}:5432/${var.postgresql_database_name}?sslmode=require"
      }

      env {
        name  = "REDIS_URL"
        value = var.redis_url
      }

      env {
        name  = "QDRANT_URL"
        value = var.qdrant_url
      }

      env {
        name  = "QDRANT_API_KEY"
        value = var.qdrant_api_key
      }

      env {
        name  = "AZURE_STORAGE_ACCOUNT_NAME"
        value = var.storage_account_name
      }

      env {
        name  = "AZURE_STORAGE_CONNECTION_STRING"
        value = var.storage_connection_string
      }

      env {
        name  = "AZURE_STORAGE_CONTAINER_NAME"
        value = var.storage_container_name
      }

      env {
        name  = "BLOB_STORAGE_PROVIDER"
        value = "azure"
      }

      env {
        name  = "NODE_ENV"
        value = var.environment == "prd" ? "production" : var.environment
      }

      env {
        name  = "BETTER_AUTH_URL"
        value = var.container_app_external_ingress ? "https://${azurerm_container_app.inovy.latest_revision_fqdn}" : "http://${azurerm_container_app.inovy.latest_revision_fqdn}"
      }

      env {
        name  = "NEXT_PUBLIC_APP_URL"
        value = var.container_app_external_ingress ? "https://${azurerm_container_app.inovy.latest_revision_fqdn}" : "http://${azurerm_container_app.inovy.latest_revision_fqdn}"
      }

      # Add other environment variables from variables
      dynamic "env" {
        for_each = var.container_app_additional_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
    }

    # Health probe
    http_scale_rule {
      name                = "http-scale"
      concurrent_requests = var.container_app_http_scale_concurrent_requests
    }
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })

  lifecycle {
    ignore_changes = [
      template[0].container[0].image
    ]
  }
}
