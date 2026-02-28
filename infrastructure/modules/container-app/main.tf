# Container App for Inovy application
# Uses shared Container App Environment (from container-app-environment) and managed identity (from container-app-identity)
resource "azurerm_container_app" "inovy" {
  name                         = "inovy-app-${var.environment}"
  container_app_environment_id = var.container_app_environment_id
  resource_group_name          = var.resource_group_name
  revision_mode                = var.container_app_revision_mode

  identity {
    type         = "UserAssigned"
    identity_ids = [var.managed_identity_id]
  }

  dynamic "registry" {
    for_each = var.acr_login_server != "" ? [1] : []
    content {
      server   = var.acr_login_server
      identity = var.managed_identity_id
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

      dynamic "env" {
        for_each = var.container_app_additional_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
    }

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
