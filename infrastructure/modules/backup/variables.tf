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

variable "postgresql_server_id" {
  description = "ID of the PostgreSQL Flexible Server"
  type        = string
}

variable "backup_vault_redundancy" {
  description = "Backup vault redundancy (GeoRedundant or LocallyRedundant)"
  type        = string
  default     = "GeoRedundant"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
