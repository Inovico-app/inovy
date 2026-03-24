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

variable "target" {
  description = "Target platform identifier used to prefix resource names (e.g., 'azure', 'vercel')"
  type        = string
}

variable "app_url" {
  description = "Base URL of the target application (e.g., https://inovy.vercel.app or https://inovy-app-prd.example.com)"
  type        = string
}

variable "jobs" {
  description = <<-EOT
    Map of cron job definitions. Each entry defines path, schedule, timeout, and short_name.
    short_name is used for Azure Container App Job resource names and must keep the full name
    cron-{target}-{short_name}-{environment} at or below 32 characters (Azure limit).
  EOT
  type = map(object({
    short_name         = string
    path               = string
    cron_expression    = string
    timeout_in_seconds = number
  }))
}

variable "cron_secret" {
  description = "Shared secret for authenticating cron job requests"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
