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
  default     = 1
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

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
