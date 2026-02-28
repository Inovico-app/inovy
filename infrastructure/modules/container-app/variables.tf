variable "environment" {
  description = "Environment name (e.g., prd, dev, staging)"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "subnet_container_apps_id" {
  description = "ID of the Container Apps subnet (required when creating own environment)"
  type        = string
  default     = ""
}

variable "container_app_environment_id" {
  description = "ID of the Container App Environment (use shared environment from container-app-environment module)"
  type        = string
  default     = ""
}

variable "uuid_namespace" {
  description = "UUID namespace for deterministic role assignment names (e.g., RFC 4122 DNS namespace)"
  type        = string
  default     = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}

variable "storage_account_id" {
  description = "ID of the storage account"
  type        = string
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

variable "postgresql_fqdn" {
  description = "FQDN of the PostgreSQL Flexible Server"
  type        = string
}

variable "postgresql_database_name" {
  description = "Name of the PostgreSQL database"
  type        = string
}

variable "redis_url" {
  description = "Redis connection URL (redis://:password@host:port) for standard Redis"
  type        = string
  sensitive   = true
}

variable "qdrant_url" {
  description = "Qdrant API URL"
  type        = string
}

variable "qdrant_api_key" {
  description = "Qdrant API key (if using cloud-hosted Qdrant)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "storage_account_name" {
  description = "Name of the storage account"
  type        = string
}

variable "storage_connection_string" {
  description = "Primary connection string for the storage account"
  type        = string
  sensitive   = true
}

variable "storage_container_name" {
  description = "Name of the recordings container"
  type        = string
}

variable "container_app_image" {
  description = "Container image for the application (e.g., yourregistry.azurecr.io/inovy-app:latest)"
  type        = string
  default     = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
}

variable "acr_login_server" {
  description = "ACR login server for registry authentication (e.g., inovyacrprd.azurecr.io). When set, adds registry block for managed identity pull."
  type        = string
  default     = ""
}

variable "acr_id" {
  description = "ID of the Azure Container Registry. When set with acr_login_server, grants AcrPull to the container app identity."
  type        = string
  default     = ""
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

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
