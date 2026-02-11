provider "azurerm" {
  features {}
  use_oidc = true
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

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
  subnet_redis_address_prefix          = var.subnet_redis_address_prefix

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Database Module
module "database" {
  source = "./modules/database"

  environment                       = var.environment
  location                          = var.location
  resource_group_name               = azurerm_resource_group.inovy.name
  vnet_id                           = module.networking.vnet_id
  subnet_postgresql_id              = module.networking.subnet_postgresql_id
  postgresql_version                = var.postgresql_version
  postgresql_admin_login            = var.postgresql_admin_login
  postgresql_admin_password         = var.postgresql_admin_password
  postgresql_sku_name               = var.postgresql_sku_name
  postgresql_storage_mb             = var.postgresql_storage_mb
  postgresql_zone                   = var.postgresql_zone
  postgresql_high_availability_mode = var.postgresql_high_availability_mode
  postgresql_standby_zone           = var.postgresql_standby_zone
  postgresql_maintenance_day        = var.postgresql_maintenance_day
  postgresql_maintenance_hour       = var.postgresql_maintenance_hour
  entra_tenant_id                   = var.entra_tenant_id
  entra_administrators              = var.entra_administrators

  depends_on = [
    module.networking
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

  environment             = var.environment
  location                = var.location
  resource_group_name     = azurerm_resource_group.inovy.name
  postgresql_server_id    = module.database.postgresql_server_id
  backup_vault_redundancy = var.backup_vault_redundancy

  depends_on = [
    module.database
  ]

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Redis Module
module "redis" {
  source = "./modules/redis"

  environment                          = var.environment
  location                             = var.location
  resource_group_name                  = azurerm_resource_group.inovy.name
  subnet_redis_id                      = module.networking.subnet_redis_id
  subnet_container_apps_address_prefix = var.subnet_container_apps_address_prefix
  redis_capacity                       = var.redis_capacity
  redis_family                         = var.redis_family
  redis_sku_name                       = var.redis_sku_name
  redis_minimum_tls_version            = var.redis_minimum_tls_version
  redis_maxmemory_reserved             = var.redis_maxmemory_reserved
  redis_maxmemory_delta                = var.redis_maxmemory_delta
  redis_maxmemory_policy               = var.redis_maxmemory_policy

  depends_on = [
    module.networking
  ]

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Qdrant Module
module "qdrant" {
  source = "./modules/qdrant"

  environment             = var.environment
  location                = var.location
  resource_group_name     = azurerm_resource_group.inovy.name
  qdrant_ip_address_type  = var.qdrant_ip_address_type
  qdrant_cpu              = var.qdrant_cpu
  qdrant_memory           = var.qdrant_memory
  qdrant_storage_quota_gb = var.qdrant_storage_quota_gb

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}

# Storage Module
module "storage" {
  source = "./modules/storage"

  environment                      = var.environment
  location                         = var.location
  resource_group_name              = azurerm_resource_group.inovy.name
  storage_account_tier             = var.storage_account_tier
  storage_account_replication_type = var.storage_account_replication_type
  storage_blob_retention_days      = var.storage_blob_retention_days
  storage_blob_restore_days        = var.storage_blob_restore_days

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
  subnet_container_apps_id                     = module.networking.subnet_container_apps_id
  storage_account_id                           = module.storage.storage_account_id
  postgresql_admin_login                       = module.database.postgresql_administrator_login
  postgresql_admin_password                    = module.database.postgresql_administrator_password
  postgresql_fqdn                              = module.database.postgresql_server_fqdn
  postgresql_database_name                     = module.database.postgresql_database_name
  redis_hostname                               = module.redis.redis_cache_hostname
  redis_ssl_port                               = module.redis.redis_cache_ssl_port
  redis_primary_access_key                     = module.redis.redis_cache_primary_access_key
  qdrant_url                                   = module.qdrant.qdrant_url
  qdrant_api_key                               = var.qdrant_api_key
  storage_account_name                         = module.storage.storage_account_name
  storage_connection_string                    = module.storage.storage_account_primary_connection_string
  storage_container_name                       = module.storage.storage_container_name
  container_app_image                          = var.container_app_image
  container_app_min_replicas                   = var.container_app_min_replicas
  container_app_max_replicas                   = var.container_app_max_replicas
  container_app_cpu                            = var.container_app_cpu
  container_app_memory                         = var.container_app_memory
  container_app_target_port                    = var.container_app_target_port
  container_app_external_ingress               = var.container_app_external_ingress
  container_app_revision_mode                  = var.container_app_revision_mode
  container_app_http_scale_concurrent_requests = var.container_app_http_scale_concurrent_requests
  container_app_additional_env_vars            = var.container_app_additional_env_vars
  log_analytics_retention_days                 = var.log_analytics_retention_days

  depends_on = [
    module.networking,
    module.database,
    module.redis,
    module.qdrant,
    module.storage
  ]

  tags = {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  }
}
