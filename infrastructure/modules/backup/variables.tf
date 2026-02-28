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

variable "postgresql_server_name" {
  description = "Name of the PostgreSQL Flexible Server"
  type        = string
}

variable "backup_vault_redundancy" {
  description = "Backup vault redundancy (GeoRedundant or LocallyRedundant)"
  type        = string
  default     = "GeoRedundant"
}

variable "backup_repeating_time_intervals" {
  description = "List of backup repeating time intervals in ISO 8601 format (e.g., [\"R/2024-04-07T13:00:00+00:00/P1W\"])"
  type        = list(string)
  default     = ["R/2024-04-07T13:00:00+00:00/P1W"]
}

variable "backup_time_zone" {
  description = "Time zone for backup schedule (e.g., UTC, America/New_York)"
  type        = string
  default     = "UTC"
}

variable "uuid_namespace" {
  description = "UUID namespace for deterministic role assignment names (e.g., RFC 4122 DNS namespace)"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
