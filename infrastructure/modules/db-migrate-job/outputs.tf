output "job_name" {
  description = "Name of the database migration job"
  value       = azurerm_container_app_job.db_migrate.name
}
