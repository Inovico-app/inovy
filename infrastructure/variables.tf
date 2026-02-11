variable "environment" {
  description = "Environment name (e.g., prd, dev, staging)"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "westeurope"
}

# Networking variables
variable "vnet_address_space" {
  description = "Address space for the Virtual Network (CIDR notation)"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_container_apps_address_prefix" {
  description = "Address prefix for Container Apps subnet (CIDR notation)"
  type        = string
  default     = "10.0.1.0/24"
}

variable "subnet_postgresql_address_prefix" {
  description = "Address prefix for PostgreSQL subnet (CIDR notation)"
  type        = string
  default     = "10.0.2.0/24"
}

variable "subnet_redis_address_prefix" {
  description = "Address prefix for Redis subnet (CIDR notation)"
  type        = string
  default     = "10.0.3.0/24"
}

# PostgreSQL variables
variable "postgresql_version" {
  description = "PostgreSQL version (e.g., 15, 16)"
  type        = string
  default     = "16"
}

variable "postgresql_admin_login" {
  description = "PostgreSQL administrator login"
  type        = string
  sensitive   = true
}

variable "postgresql_admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

variable "postgresql_sku_name" {
  description = "PostgreSQL SKU name (e.g., Standard_B2s, Standard_D2s_v3)"
  type        = string
  default     = "Standard_B2s"
}

variable "postgresql_storage_mb" {
  description = "PostgreSQL storage size in MB"
  type        = number
  default     = 131072 # 128GB
}

variable "postgresql_zone" {
  description = "Availability zone for PostgreSQL primary server"
  type        = string
  default     = "1"
}

variable "postgresql_high_availability_mode" {
  description = "High availability mode for PostgreSQL (SameZone, ZoneRedundant, or Disabled)"
  type        = string
  default     = "ZoneRedundant"
}

variable "postgresql_standby_zone" {
  description = "Availability zone for PostgreSQL standby server"
  type        = string
  default     = "2"
}

variable "postgresql_geo_redundant_backup" {
  description = "Enable geo-redundant backup for PostgreSQL"
  type        = bool
  default     = true
}

variable "postgresql_maintenance_day" {
  description = "Day of week for PostgreSQL maintenance (0=Sunday, 6=Saturday)"
  type        = number
  default     = 0
}

variable "postgresql_maintenance_hour" {
  description = "Hour of day for PostgreSQL maintenance (0-23)"
  type        = number
  default     = 2
}

# Backup variables
variable "backup_vault_redundancy" {
  description = "Backup vault redundancy (GeoRedundant or LocallyRedundant)"
  type        = string
  default     = "GeoRedundant"
}

# Redis variables
variable "redis_capacity" {
  description = "Redis cache capacity (0, 1, 2, 3, 4, 5, 6 for Basic/Standard)"
  type        = number
  default     = 0 # B10 tier = capacity 0
}

variable "redis_family" {
  description = "Redis family (C for Basic/Standard, P for Premium)"
  type        = string
  default     = "C"
}

variable "redis_sku_name" {
  description = "Redis SKU name (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
}

variable "redis_enable_non_ssl_port" {
  description = "Enable non-SSL port for Redis (required for Basic tier)"
  type        = bool
  default     = true
}

variable "redis_minimum_tls_version" {
  description = "Minimum TLS version for Redis (1.0, 1.1, 1.2)"
  type        = string
  default     = "1.2"
}

variable "redis_maxmemory_reserved" {
  description = "Max memory reserved for Redis in MB"
  type        = number
  default     = 50
}

variable "redis_maxmemory_delta" {
  description = "Max memory delta for Redis in MB"
  type        = number
  default     = 50
}

variable "redis_maxmemory_policy" {
  description = "Max memory policy for Redis (allkeys-lru, volatile-lru, etc.)"
  type        = string
  default     = "allkeys-lru"
}

# Qdrant variables
variable "qdrant_ip_address_type" {
  description = "IP address type for Qdrant Container Group (Public or Private)"
  type        = string
  default     = "Public"
}

variable "qdrant_cpu" {
  description = "CPU cores for Qdrant container"
  type        = number
  default     = 1.0
}

variable "qdrant_memory" {
  description = "Memory in GB for Qdrant container"
  type        = number
  default     = 2.0
}

variable "qdrant_storage_quota_gb" {
  description = "Storage quota in GB for Qdrant file share"
  type        = number
  default     = 100
}

variable "qdrant_api_key" {
  description = "API key for Qdrant (if using cloud-hosted Qdrant)"
  type        = string
  default     = ""
  sensitive   = true
}

# Storage variables
variable "storage_account_tier" {
  description = "Storage account tier (Standard or Premium)"
  type        = string
  default     = "Standard"
}

variable "storage_account_replication_type" {
  description = "Storage account replication type (LRS, GRS, RAGRS, ZRS)"
  type        = string
  default     = "LRS"
}

variable "storage_blob_retention_days" {
  description = "Number of days to retain deleted blobs"
  type        = number
  default     = 7
}

variable "storage_blob_restore_days" {
  description = "Number of days for blob restore policy (must be less than retention days)"
  type        = number
  default     = 6
}

# Container App variables
variable "container_app_image" {
  description = "Container image for the application (e.g., docker.io/username/inovy:latest)"
  type        = string
  default     = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
}

variable "container_app_min_replicas" {
  description = "Minimum number of replicas for Container App"
  type        = number
  default     = 1
}

variable "container_app_max_replicas" {
  description = "Maximum number of replicas for Container App"
  type        = number
  default     = 3
}

variable "container_app_cpu" {
  description = "CPU allocation for Container App (e.g., 0.5, 1.0)"
  type        = number
  default     = 0.5
}

variable "container_app_memory" {
  description = "Memory allocation for Container App in GB (e.g., 1.0, 2.0)"
  type        = string
  default     = "1.0Gi"
}

variable "container_app_target_port" {
  description = "Target port for Container App"
  type        = number
  default     = 3000
}

variable "container_app_external_ingress" {
  description = "Enable external ingress for Container App"
  type        = bool
  default     = true
}

variable "container_app_revision_mode" {
  description = "Revision mode for Container App (Single or Multiple)"
  type        = string
  default     = "Single"
}

variable "container_app_http_scale_concurrent_requests" {
  description = "Concurrent requests threshold for HTTP scale rule"
  type        = number
  default     = 10
}

variable "container_app_additional_env_vars" {
  description = "Additional environment variables for Container App"
  type        = map(string)
  default     = {}
}

variable "log_analytics_retention_days" {
  description = "Log Analytics workspace retention in days"
  type        = number
  default     = 30
}
