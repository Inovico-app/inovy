# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "inovy" {
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

# Container App Environment
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
  scope                = var.storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

# Container App
resource "azurerm_container_app" "inovy" {
  name                         = "inovy-app-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.inovy.id
  resource_group_name          = var.resource_group_name
  revision_mode                = var.container_app_revision_mode

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_app.id]
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
        name  = "UPSTASH_REDIS_REST_URL"
        value = "https://${var.redis_hostname}:${var.redis_ssl_port}"
      }

      env {
        name  = "UPSTASH_REDIS_REST_TOKEN"
        value = var.redis_primary_access_key
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
