# Cron Jobs for Inovy application
# Uses Azure Container App Jobs with schedule triggers to call the app's cron API endpoints.
# Each job runs a lightweight Alpine/curl container that hits the endpoint with the CRON_SECRET.

locals {
  cron_jobs = {
    renew-drive-watches = {
      path                = "/api/cron/renew-drive-watches"
      cron_expression     = "0 0 * * *" # Daily at midnight UTC
      timeout_in_seconds  = 300
    }
    monitor-calendar = {
      path                = "/api/cron/monitor-calendar"
      cron_expression     = "*/5 * * * *" # Every 5 minutes
      timeout_in_seconds  = 120
    }
    poll-bot-status = {
      path                = "/api/cron/poll-bot-status"
      cron_expression     = "*/1 * * * *" # Every 1 minute
      timeout_in_seconds  = 60
    }
  }
}

resource "azurerm_container_app_job" "cron" {
  for_each = local.cron_jobs

  name                         = "inovy-cron-${each.key}-${var.environment}"
  location                     = var.location
  resource_group_name          = var.resource_group_name
  container_app_environment_id = var.container_app_environment_id

  replica_timeout_in_seconds = each.value.timeout_in_seconds
  replica_retry_limit        = 1

  schedule_trigger_config {
    cron_expression          = each.value.cron_expression
    parallelism              = 1
    replica_completion_count = 1
  }

  template {
    container {
      name   = "cron-${each.key}"
      image  = "curlimages/curl:8.5.0"
      cpu    = 0.25
      memory = "0.5Gi"

      command = [
        "/bin/sh", "-c",
        "curl -sf -H 'Authorization: Bearer $${CRON_SECRET}' $${APP_URL}${each.value.path}"
      ]

      env {
        name        = "APP_URL"
        value       = var.app_url
      }

      env {
        name        = "CRON_SECRET"
        secret_name = "cron-secret"
      }
    }
  }

  secret {
    name  = "cron-secret"
    value = var.cron_secret
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
    Component   = "cron-${each.key}"
  })
}
