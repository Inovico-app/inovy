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

variable "managed_identity_id" {
  description = "ID of the user-assigned managed identity (from container-app-identity module)"
  type        = string
}

variable "container_app_image" {
  description = "Container image for the application (same as main app)"
  type        = string
}

variable "acr_login_server" {
  description = "ACR login server for registry authentication"
  type        = string
  default     = ""
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

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
