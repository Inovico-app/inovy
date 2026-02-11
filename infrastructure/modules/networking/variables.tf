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

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
