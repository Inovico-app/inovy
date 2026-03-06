# Database migration job - runs pnpm db:migrate inside the VNet
# Triggered manually via GitHub Actions: az containerapp job start
resource "azurerm_container_app_job" "db_migrate" {
  name                         = "db-migrate-${var.environment}"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  container_app_environment_id = var.container_app_environment_id
  workload_profile_name        = "Consumption"

  replica_timeout_in_seconds = 600 # 10 min for migrations

  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
  }

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

  template {
    container {
      name   = "migrate"
      image  = var.container_app_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${urlencode(var.postgresql_admin_login)}:${urlencode(var.postgresql_admin_password)}@${var.postgresql_fqdn}:5432/${urlencode(var.postgresql_database_name)}?sslmode=verify-full"
      }

      command = ["sh", "-c", "cd apps/web && pnpm db:migrate"]
    }
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}
