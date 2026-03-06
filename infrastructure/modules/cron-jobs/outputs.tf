output "cron_job_ids" {
  description = "Map of cron job name to resource ID"
  value       = { for k, v in azurerm_container_app_job.cron : k => v.id }
}

output "cron_job_names" {
  description = "Map of cron job name to Azure resource name"
  value       = { for k, v in azurerm_container_app_job.cron : k => v.name }
}
