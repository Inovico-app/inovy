# Redis Container App - internal only, TCP port 6379
# - external_enabled = false: no public access; only reachable from within the Container App Environment VNet
# - Other Container Apps in the same environment can connect via redis_url (internal FQDN)
resource "azurerm_container_app" "redis" {
  name                         = "redis-${var.environment}"
  container_app_environment_id = var.container_app_environment_id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"

  template {
    min_replicas = var.redis_min_replicas
    max_replicas = var.redis_max_replicas

    container {
      name   = "redis"
      image  = var.redis_image
      cpu    = var.redis_cpu
      memory = var.redis_memory

      env {
        name        = "REDIS_PASSWORD"
        secret_name = "redis-password"
      }

      liveness_probe {
        transport        = "TCP"
        port             = 6379
        initial_delay    = 5
        interval_seconds = 10
      }

      command = ["sh", "-c", "redis-server --requirepass $REDIS_PASSWORD"]
    }
  }

  secret {
    name  = "redis-password"
    value = var.redis_password
  }

  # Internal ingress only: no public access; accessible from other apps in same Container App Environment
  ingress {
    external_enabled = false
    target_port      = 6379
    transport        = "tcp"
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}
