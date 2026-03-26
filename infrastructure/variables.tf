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
  default     = "10.0.0.0/20"
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
  default     = "B_Standard_B1ms"
}

variable "postgresql_storage_mb" {
  description = "PostgreSQL storage size in MB"
  type        = number
  default     = 32768 # 32GB
}

variable "postgresql_zone" {
  description = "Availability zone for PostgreSQL primary server, optional (empty string to let Azure choose)"
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

# Microsoft Entra (Azure AD) authentication variables
variable "entra_tenant_id" {
  description = "Microsoft Entra (Azure AD) tenant ID for PostgreSQL authentication"
  type        = string
}

variable "entra_administrators" {
  description = "List of Microsoft Entra administrators for PostgreSQL. Each entry should have object_id and principal_name (email/UPN)"
  type = list(object({
    object_id      = string
    principal_name = string
    principal_type = optional(string, "User")
  }))
}

# Backup variables
variable "backup_vault_redundancy" {
  description = "Backup vault redundancy (GeoRedundant or LocallyRedundant)"
  type        = string
  default     = "GeoRedundant"
}

variable "backup_repeating_time_intervals" {
  description = "List of backup repeating time intervals in ISO 8601 format (e.g., [\"R/2024-04-07T13:00:00+00:00/P1W\"])"
  type        = list(string)
  default     = ["R/2024-04-07T13:00:00+00:00/P1W"]
}

variable "backup_time_zone" {
  description = "Time zone for backup schedule (e.g., UTC, America/New_York)"
  type        = string
  default     = "UTC"
}

# Redis variables (Container App)
variable "redis_password" {
  description = "Redis password (requirepass) for the Redis Container App"
  type        = string
  sensitive   = true
}

variable "redis_image" {
  description = "Redis container image"
  type        = string
  default     = "redis:7-alpine"
}

variable "redis_cpu" {
  description = "CPU cores for Redis container"
  type        = number
  default     = 0.25
}

variable "redis_memory" {
  description = "Memory for Redis container (e.g., 0.5Gi)"
  type        = string
  default     = "0.5Gi"
}

variable "redis_min_replicas" {
  description = "Minimum number of Redis replicas"
  type        = number
  default     = 0
}

variable "redis_max_replicas" {
  description = "Maximum number of Redis replicas"
  type        = number
  default     = 1
}

# Qdrant variables (Container App)
variable "qdrant_image" {
  description = "Qdrant container image (use stable version tag)"
  type        = string
  default     = "qdrant/qdrant:v1.17.0"
}

variable "qdrant_cpu" {
  description = "CPU cores for Qdrant container"
  type        = number
  default     = 0.5
}

variable "qdrant_memory" {
  description = "Memory for Qdrant container (e.g., 1Gi)"
  type        = string
  default     = "1Gi"
}

variable "qdrant_min_replicas" {
  description = "Minimum number of Qdrant replicas"
  type        = number
  default     = 0
}

variable "qdrant_max_replicas" {
  description = "Maximum number of Qdrant replicas"
  type        = number
  default     = 1
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

# Azure Container Registry variables
variable "acr_name" {
  description = "Name of the Azure Container Registry (must be globally unique, 5-50 alphanumeric characters). Defaults to inovyacr<env> when empty."
  type        = string
  default     = ""
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
  default     = 0
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
  default     = "1Gi"
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

variable "container_app_http_scale_concurrent_requests" {
  description = "Concurrent requests threshold for HTTP scale rule"
  type        = number
  default     = 10
}

variable "next_public_platform" {
  description = "Platform identifier (e.g., azure, vercel) - sets NEXT_PUBLIC_PLATFORM env var for container app"
  type        = string
  default     = "azure"
}

variable "container_app_additional_env_vars" {
  description = "Additional environment variables for Container App"
  type        = map(string)
  default     = {}
}

variable "openai_api_key" {
  description = "OpenAI API key (provided as GitLab/GitHub secret)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key (provided as GitLab/GitHub secret)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "deepgram_api_key" {
  description = "Deepgram API key (provided as GitHub secret)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "recall_api_key" {
  description = "Recall API key (provided as GitHub secret)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "recall_webhook_secret" {
  description = "Recall webhook secret (provided as GitHub secret)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "resend_api_key" {
  description = "Resend API key (provided as GitHub secret)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "huggingface_api_key" {
  description = "Hugging Face API key (provided as GitHub secret)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "oauth_encryption_key" {
  description = "OAuth encryption key for token storage (32 bytes hex, provided as GitHub secret)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "better_auth_secret" {
  description = "Better Auth secret (provided as GitLab/GitHub secret)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cron_secret" {
  description = "Secret for authenticating cron job requests"
  type        = string
  default     = ""
  sensitive   = true
}

variable "resend_from_email" {
  description = "Resend from email address (e.g., Inovy <app@inovico.nl>)"
  type        = string
  default     = "app@inovico.nl"
}

variable "resend_reply_to_email" {
  description = "Resend reply-to email (optional, defaults to resend_from_email)"
  type        = string
  default     = "app@inovico.nl"
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_redirect_uri" {
  description = "Google OAuth redirect URI (optional; derived from app URL if empty)"
  type        = string
  default     = ""
}

variable "microsoft_client_id" {
  description = "Microsoft OAuth client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "microsoft_client_secret" {
  description = "Microsoft OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "microsoft_tenant_id" {
  description = "Microsoft OAuth tenant ID (default: common)"
  type        = string
  default     = "common"
}

variable "microsoft_use_federated_credential" {
  description = "When true (Azure + non-empty microsoft_client_id), create Entra federated identity credential so the Container App UAMI can use client assertions for Microsoft token exchange. Better Auth sign-in may still use MICROSOFT_CLIENT_SECRET (hybrid) until full secretless sign-in."
  type        = bool
  default     = true
}

variable "next_public_webhook_url" {
  description = "Public webhook URL for Google Drive (optional; derived from app URL if empty)"
  type        = string
  default     = ""
}

variable "next_public_kvk_number" {
  description = "KVK number for legal pages (terms of service, privacy policy)"
  type        = string
  default     = ""
}

variable "log_analytics_retention_days" {
  description = "Log Analytics workspace retention in days"
  type        = number
  default     = 30
}

variable "vercel_url" {
  description = "Vercel deployment URL. Used as the target for Vercel cron jobs."
  type        = string
  default     = "https://app.inovico.nl"
}
