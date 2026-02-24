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

variable "redis_sku_name" {
  description = "Redis SKU name"
  type        = string
  default     = "Balanced_B0"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "high_availability_enabled" {
  description = "Enable high availability for Redis"
  type        = bool
}

variable "container_app_managed_identity_principal_id" {
  description = "Principal ID of the Container App managed identity for Entra authentication (optional)"
  type        = string
  default     = ""
}