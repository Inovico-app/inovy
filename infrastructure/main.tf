provider "azurerm" {
  features {}
  use_oidc = true
}

# RFC 4122 DNS namespace for deterministic UUID v5 generation (role assignment names)
locals {
  uuid_namespace_dns = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

data "azurerm_client_config" "current" {}

# Resource Group
resource "azurerm_resource_group" "inovy" {
  name     = "rg-inovy-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Networking Module
module "networking" {
  source = "./modules/networking"

  environment                          = var.environment
  location                             = var.location
  resource_group_name                  = azurerm_resource_group.inovy.name
  vnet_address_space                   = var.vnet_address_space
  subnet_container_apps_address_prefix = var.subnet_container_apps_address_prefix
  subnet_postgresql_address_prefix     = var.subnet_postgresql_address_prefix

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Container App Managed Identity Module (must be created first)
module "container_app_identity" {
  source = "./modules/container-app-identity"

  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.inovy.name

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Database Module
module "database" {
  source = "./modules/database"

  environment                                 = var.environment
  location                                    = var.location
  resource_group_name                         = azurerm_resource_group.inovy.name
  vnet_id                                     = module.networking.vnet_id
  subnet_postgresql_id                        = module.networking.subnet_postgresql_id
  postgresql_version                          = var.postgresql_version
  postgresql_admin_login                      = var.postgresql_admin_login
  postgresql_admin_password                   = var.postgresql_admin_password
  postgresql_sku_name                         = var.postgresql_sku_name
  postgresql_storage_mb                       = var.postgresql_storage_mb
  postgresql_zone                             = var.postgresql_zone
  postgresql_maintenance_day                  = var.postgresql_maintenance_day
  postgresql_maintenance_hour                 = var.postgresql_maintenance_hour
  entra_tenant_id                             = var.entra_tenant_id
  entra_administrators                        = var.entra_administrators
  container_app_managed_identity_principal_id = module.container_app_identity.managed_identity_principal_id
  container_app_managed_identity_client_id    = module.container_app_identity.managed_identity_client_id

  depends_on = [
    module.networking,
    module.container_app_identity
  ]

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Backup Module
module "backup" {
  source = "./modules/backup"

  environment                     = var.environment
  location                        = var.location
  resource_group_name             = azurerm_resource_group.inovy.name
  postgresql_server_id            = module.database.postgresql_server_id
  postgresql_server_name          = module.database.postgresql_server_name
  backup_vault_redundancy         = var.backup_vault_redundancy
  backup_repeating_time_intervals = var.backup_repeating_time_intervals
  backup_time_zone                = var.backup_time_zone
  uuid_namespace                  = local.uuid_namespace_dns

  depends_on = [
    module.database
  ]

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Container App Environment (shared by Redis and main app)
module "container_app_environment" {
  source = "./modules/container-app-environment"

  environment                  = var.environment
  location                     = var.location
  resource_group_name          = azurerm_resource_group.inovy.name
  subnet_container_apps_id     = module.networking.subnet_container_apps_id
  log_analytics_retention_days  = var.log_analytics_retention_days

  depends_on = [
    module.networking
  ]

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Look up Container App Environment by name to get a stable ID.
# Using a data source avoids "known after apply" when the managed resource is replaced,
# preventing unnecessary replacement of dependent resources (Redis, container app).
data "azurerm_container_app_environment" "current" {
  name                = "inovy-env-${var.environment}"
  resource_group_name = azurerm_resource_group.inovy.name

  depends_on = [module.container_app_environment]
}

# Redis Container App Module
module "redis" {
  source = "./modules/redis-container-app"

  environment                    = var.environment
  location                       = var.location
  resource_group_name            = azurerm_resource_group.inovy.name
  container_app_environment_id   = data.azurerm_container_app_environment.current.id
  redis_password                 = var.redis_password
  redis_image                    = var.redis_image
  redis_cpu                      = var.redis_cpu
  redis_memory                   = var.redis_memory
  redis_min_replicas             = var.redis_min_replicas
  redis_max_replicas             = var.redis_max_replicas

  depends_on = [
    module.container_app_environment
  ]

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Qdrant Container App Module
module "qdrant" {
  source = "./modules/qdrant-container-app"

  environment                    = var.environment
  location                       = var.location
  resource_group_name            = azurerm_resource_group.inovy.name
  container_app_environment_id   = data.azurerm_container_app_environment.current.id
  qdrant_image                   = var.qdrant_image
  qdrant_cpu                     = var.qdrant_cpu
  qdrant_memory                  = var.qdrant_memory
  qdrant_min_replicas            = var.qdrant_min_replicas
  qdrant_max_replicas            = var.qdrant_max_replicas
  qdrant_storage_quota_gb        = var.qdrant_storage_quota_gb

  depends_on = [
    module.container_app_environment
  ]

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Azure Container Registry for Inovy application images
module "container_registry" {
  source = "./modules/container-registry"

  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.inovy.name
  acr_name            = var.acr_name != "" ? var.acr_name : "inovyacr${replace(var.environment, "-", "")}"

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Grant Container App managed identity AcrPull on ACR so it can pull images
resource "azurerm_role_assignment" "container_app_acr_pull" {
  name                             = uuidv5(local.uuid_namespace_dns, "inovy-${var.environment}-container-app-acr-pull")
  scope                            = module.container_registry.acr_id
  role_definition_id                = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/providers/Microsoft.Authorization/roleDefinitions/7f951dda-4ed3-4680-a7ca-43fe172d538d" # AcrPull
  principal_id                     = module.container_app_identity.managed_identity_principal_id
  skip_service_principal_aad_check = true

  depends_on = [
    module.container_registry,
    module.container_app_identity
  ]
}

# Storage Module
module "storage" {
  source = "./modules/storage"

  environment                         = var.environment
  location                            = var.location
  resource_group_name                 = azurerm_resource_group.inovy.name
  storage_account_tier                 = var.storage_account_tier
  storage_account_replication_type    = var.storage_account_replication_type
  storage_blob_retention_days          = var.storage_blob_retention_days
  storage_blob_restore_days           = var.storage_blob_restore_days
  managed_identity_principal_id       = module.container_app_identity.managed_identity_principal_id
  uuid_namespace                      = local.uuid_namespace_dns

  depends_on = [
    module.container_app_identity
  ]

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Container App Module
module "container_app" {
  source = "./modules/container-app"

  environment                                  = var.environment
  location                                     = var.location
  resource_group_name                          = azurerm_resource_group.inovy.name
  container_app_environment_id                  = data.azurerm_container_app_environment.current.id
  managed_identity_id                          = module.container_app_identity.managed_identity_id
  postgresql_admin_login                       = module.database.postgresql_administrator_login
  postgresql_admin_password                    = var.postgresql_admin_password
  postgresql_fqdn                              = module.database.postgresql_server_fqdn
  postgresql_database_name                     = module.database.postgresql_database_name
  redis_url                                    = module.redis.redis_url
  qdrant_url                                   = module.qdrant.qdrant_url
  qdrant_api_key                               = var.qdrant_api_key
  storage_account_name                         = module.storage.storage_account_name
  storage_connection_string                    = module.storage.storage_account_primary_connection_string
  storage_container_name                       = module.storage.storage_container_name
  container_app_image                          = "${module.container_registry.acr_login_server}/inovy-app:latest"
  acr_login_server                             = module.container_registry.acr_login_server
  container_app_min_replicas                   = var.container_app_min_replicas
  container_app_max_replicas                   = var.container_app_max_replicas
  container_app_cpu                            = var.container_app_cpu
  container_app_memory                         = var.container_app_memory
  container_app_target_port                    = var.container_app_target_port
  container_app_external_ingress               = var.container_app_external_ingress
  container_app_revision_mode                  = var.container_app_revision_mode
  container_app_http_scale_concurrent_requests = var.container_app_http_scale_concurrent_requests
  container_app_additional_env_vars            = var.container_app_additional_env_vars

  depends_on = [
    module.networking,
    module.database,
    module.redis,
    module.qdrant,
    module.storage,
    module.container_registry
  ]

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}
