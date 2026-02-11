# Virtual Network for Inovy infrastructure
resource "azurerm_virtual_network" "inovy" {
  name                = "vnet-inovy-${var.environment}"
  address_space       = [var.vnet_address_space]
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Subnet for Container Apps
resource "azurerm_subnet" "container_apps" {
  name                 = "snet-container-apps"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.inovy.name
  address_prefixes     = [var.subnet_container_apps_address_prefix]

  delegation {
    name = "Microsoft.App/environments"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# Subnet for PostgreSQL Flexible Server
resource "azurerm_subnet" "postgresql" {
  name                 = "snet-postgresql"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.inovy.name
  address_prefixes     = [var.subnet_postgresql_address_prefix]

  delegation {
    name = "Microsoft.DBforPostgreSQL/flexibleServers"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# Subnet for Redis Cache
resource "azurerm_subnet" "redis" {
  name                 = "snet-redis"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.inovy.name
  address_prefixes     = [var.subnet_redis_address_prefix]
}

# Network Security Group for Container Apps subnet
resource "azurerm_network_security_group" "container_apps" {
  name                = "nsg-container-apps-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Allow inbound HTTP/HTTPS from internet (if external ingress)
  security_rule {
    name                       = "AllowHTTP"
    priority                   = 1000
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Allow outbound to Azure services
  security_rule {
    name                       = "AllowAzureServices"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "AzureCloud"
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Associate NSG with Container Apps subnet
resource "azurerm_subnet_network_security_group_association" "container_apps" {
  subnet_id                 = azurerm_subnet.container_apps.id
  network_security_group_id = azurerm_network_security_group.container_apps.id
}

# Network Security Group for PostgreSQL subnet
resource "azurerm_network_security_group" "postgresql" {
  name                = "nsg-postgresql-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Allow PostgreSQL from Container Apps subnet only
  security_rule {
    name                       = "AllowPostgreSQLFromContainerApps"
    priority                   = 1000
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = var.subnet_container_apps_address_prefix
    destination_address_prefix = "*"
  }

  # Allow Azure services
  security_rule {
    name                       = "AllowAzureServices"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "AzureServices"
    destination_address_prefix = "*"
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Associate NSG with PostgreSQL subnet
resource "azurerm_subnet_network_security_group_association" "postgresql" {
  subnet_id                 = azurerm_subnet.postgresql.id
  network_security_group_id = azurerm_network_security_group.postgresql.id
}

# Network Security Group for Redis subnet
resource "azurerm_network_security_group" "redis" {
  name                = "nsg-redis-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Allow Redis from Container Apps subnet only
  security_rule {
    name                       = "AllowRedisFromContainerApps"
    priority                   = 1000
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6379"
    source_address_prefix      = var.subnet_container_apps_address_prefix
    destination_address_prefix = "*"
  }

  # Allow Redis REST API (if using REST)
  security_rule {
    name                       = "AllowRedisREST"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6380"
    source_address_prefix      = var.subnet_container_apps_address_prefix
    destination_address_prefix = "*"
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Application = "inovy"
    ManagedBy   = "terraform"
  })
}

# Associate NSG with Redis subnet
resource "azurerm_subnet_network_security_group_association" "redis" {
  subnet_id                 = azurerm_subnet.redis.id
  network_security_group_id = azurerm_network_security_group.redis.id
}
