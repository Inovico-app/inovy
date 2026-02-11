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

variable "subnet_redis_id" {
  description = "ID of the Redis subnet"
  type        = string
}

variable "subnet_container_apps_address_prefix" {
  description = "Address prefix for Container Apps subnet (CIDR notation)"
  type        = string
}

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

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
