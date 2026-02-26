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
  description = "ID of the Container App Environment"
  type        = string
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
  default     = 1
}

variable "redis_max_replicas" {
  description = "Maximum number of Redis replicas"
  type        = number
  default     = 1
}

variable "redis_password" {
  description = "Redis password (requirepass)"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
