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

variable "container_app_environment_id" {
  description = "ID of the Container App Environment (from container-app-environment module)"
  type        = string
}

variable "container_app_environment_default_domain" {
  description = "Default domain of the Container App Environment (e.g., from data.azurerm_container_app_environment.default_domain). Used to construct app URL without self-reference."
  type        = string
}

variable "managed_identity_id" {
  description = "ID of the user-assigned managed identity for the container app (from container-app-identity module)"
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
  description = "Redis connection URL (redis://:password@host:port) for Azure ioredis client"
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

variable "storage_account_key" {
  description = "Primary access key for the storage account (required for SAS token generation)"
  type        = string
  sensitive   = true
}

variable "storage_container_name" {
  description = "Name of the application storage container"
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
  description = "Platform identifier (e.g., azure, vercel) - sets NEXT_PUBLIC_PLATFORM env var"
  type        = string
  default     = "azure"
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
  description = "Google OAuth redirect URI (optional; derived from NEXT_PUBLIC_APP_URL if empty)"
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

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
