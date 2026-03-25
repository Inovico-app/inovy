# Cron Jobs for Inovy application
# Uses Azure Container App Jobs with schedule triggers to call the app's cron API endpoints.
# Each job runs a lightweight Alpine/curl container that hits the endpoint with the CRON_SECRET.
# The module is target-agnostic: pass any app_url (Azure Container App, Vercel, etc.)
# and a target prefix to avoid name collisions when calling the module multiple times.
#
# Azure Container App Job names must be <= 32 characters. We use each job's short_name (not the
# map key) in the resource name: cron-{target}-{short_name}-{environment}.

locals {
  cron_job_resource_name = {
    for k, j in var.jobs : k => "cron-${var.target}-${j.short_name}-${var.environment}"
  }
  # Mirrored into ACR via CI (az acr import) — see .github/workflows/azure-infra.yml
  cron_curl_image = "${var.acr_login_server}/curlimages/curl:8.5.0"
}

resource "azurerm_container_app_job" "cron" {
  for_each = var.jobs

  name                         = local.cron_job_resource_name[each.key]
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
      name   = "cron-${each.value.short_name}"
      image  = local.cron_curl_image
      cpu    = 0.25
      memory = "0.5Gi"

      command = [
        "/bin/sh", "-c",
        "curl -sS -H 'Authorization: Bearer $${CRON_SECRET}' $${APP_URL}${each.value.path}"
      ]

      env {
        name  = "APP_URL"
        value = var.app_url
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
    Component = "cron-${var.target}-${each.key}"
  })

  lifecycle {
    precondition {
      condition = length(local.cron_job_resource_name[each.key]) <= 32
      error_message = "Container App Job name must be <= 32 characters (Azure limit). Actual length ${length(local.cron_job_resource_name[each.key])}: ${local.cron_job_resource_name[each.key]}"
    }
  }
}
