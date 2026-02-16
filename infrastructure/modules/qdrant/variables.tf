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

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
