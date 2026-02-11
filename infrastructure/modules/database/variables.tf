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

variable "vnet_id" {
  description = "ID of the Virtual Network"
  type        = string
}

variable "subnet_postgresql_id" {
  description = "ID of the PostgreSQL subnet"
  type        = string
}

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
  default     = "Standard_B2s"
}

variable "postgresql_storage_mb" {
  description = "PostgreSQL storage size in MB"
  type        = number
  default     = 131072 # 128GB
}

variable "postgresql_zone" {
  description = "Availability zone for PostgreSQL primary server"
  type        = string
  default     = "1"
}

variable "postgresql_high_availability_mode" {
  description = "High availability mode for PostgreSQL (SameZone, ZoneRedundant, or Disabled)"
  type        = string
  default     = "ZoneRedundant"
}

variable "postgresql_standby_zone" {
  description = "Availability zone for PostgreSQL standby server"
  type        = string
  default     = "2"
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

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
