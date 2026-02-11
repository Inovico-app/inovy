# Container App Environment
resource "azurerm_container_app_environment" "inovy" {
  name                       = "inovy-env-${var.environment}"
  location                   = azurerm_resource_group.inovy.location
  resource_group_name        = azurerm_resource_group.inovy.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.inovy.id
  infrastructure_subnet_id   = azurerm_subnet.container_apps.id

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "inovy" {
  name                = "log-inovy-${var.environment}"
  location            = azurerm_resource_group.inovy.location
  resource_group_name = azurerm_resource_group.inovy.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_analytics_retention_days

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Managed Identity for Container App
resource "azurerm_user_assigned_identity" "container_app" {
  name                = "id-container-app-${var.environment}"
  location            = azurerm_resource_group.inovy.location
  resource_group_name = azurerm_resource_group.inovy.name

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Role assignment for Managed Identity to access Storage Account
resource "azurerm_role_assignment" "storage_blob_data_contributor" {
  scope                = azurerm_storage_account.recordings.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

# Container App
resource "azurerm_container_app" "inovy" {
  name                         = "inovy-app-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.inovy.id
  resource_group_name          = azurerm_resource_group.inovy.name
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
        value = "postgresql://${azurerm_postgresql_flexible_server.inovy.administrator_login}:${azurerm_postgresql_flexible_server.inovy.administrator_password}@${azurerm_postgresql_flexible_server.inovy.fqdn}:5432/${azurerm_postgresql_flexible_server_database.inovy.name}?sslmode=require"
      }

      env {
        name  = "UPSTASH_REDIS_REST_URL"
        value = "https://${azurerm_redis_cache.inovy.hostname}:${azurerm_redis_cache.inovy.ssl_port}"
      }

      env {
        name  = "UPSTASH_REDIS_REST_TOKEN"
        value = azurerm_redis_cache.inovy.primary_access_key
      }

      env {
        name  = "QDRANT_URL"
        value = var.qdrant_ip_address_type == "Public" ? "http://${azurerm_container_group.qdrant.fqdn}:6333" : "http://${azurerm_container_group.qdrant.ip_address}:6333"
      }

      env {
        name  = "QDRANT_API_KEY"
        value = var.qdrant_api_key
      }

      env {
        name  = "AZURE_STORAGE_ACCOUNT_NAME"
        value = azurerm_storage_account.recordings.name
      }

      env {
        name  = "AZURE_STORAGE_CONNECTION_STRING"
        value = azurerm_storage_account.recordings.primary_connection_string
      }

      env {
        name  = "AZURE_STORAGE_CONTAINER_NAME"
        value = azurerm_storage_container.recordings.name
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

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image
    ]
  }
}
