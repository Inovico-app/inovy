output "resource_group_name" {
  description = "Name of the Inovy application resource group"
  value       = azurerm_resource_group.inovy.name
}

output "resource_group_id" {
  description = "ID of the Inovy application resource group"
  value       = azurerm_resource_group.inovy.id
}

output "resource_group_location" {
  description = "Location of the Inovy application resource group"
  value       = azurerm_resource_group.inovy.location
}
