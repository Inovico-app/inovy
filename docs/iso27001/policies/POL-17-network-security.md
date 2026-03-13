# Network Security Policy

| Field              | Value                          |
| ------------------ | ------------------------------ |
| Document ID        | POL-17                         |
| Version            | 1.0                            |
| Classification     | Internal                       |
| Owner              | Information Security Manager   |
| Approved by        | CEO/CTO                        |
| Effective date     | 2026-03-13                     |
| Review date        | 2027-03-13                     |
| ISO 27001 Controls | A.8.20, A.8.21, A.8.22, A.8.23 |

---

## 1. Purpose

This policy establishes Inovy's requirements for protecting its network infrastructure and communications against security threats. Inovy operates exclusively on Microsoft Azure cloud infrastructure in the EU-Central-1 (Frankfurt) region. All network security is implemented through Azure Virtual Networks (VNETs), Network Security Groups (NSGs), and application-level controls. This policy documents the controls in place and the requirements for maintaining network security in this cloud-native operating model.

## 2. Scope

This policy covers:

- Azure Virtual Network (VNET) and subnet configuration for the Inovy production environment
- Network Security Group (NSG) rules controlling traffic between subnets and from the internet
- Azure Container Apps network configuration
- Neon PostgreSQL network connectivity
- Azure Blob Storage network access controls
- Qdrant vector database network connectivity
- Redis (Azure Cache for Redis) network configuration
- All application-level network security controls (TLS, webhook security, API security)
- Employee home network usage for accessing Inovy systems

The development and CI/CD network environment (GitHub Actions) is also in scope for relevant controls.

## 3. Roles and Responsibilities

| Role             | Responsibility                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ISM              | Owns this policy; reviews NSG rules changes; approves network architecture changes; conducts annual network security review  |
| Engineering Lead | Implements network configuration changes via Terraform; reviews network-related PRs; maintains VNET and subnet configuration |
| On-Call Engineer | Responds to network-related availability alerts; escalates to Engineering Lead                                               |
| All Engineers    | Ensure application code uses approved network protocols and ports; report unexpected network behaviour                       |

## 4. Network Security Controls (A.8.20)

### 4.1 Azure VNET Architecture

Inovy's production infrastructure is deployed within a dedicated Azure Virtual Network in the EU-Central-1 region. The VNET provides network isolation from other Azure tenants and from the public internet except through controlled ingress points.

**VNET address space**: Defined in Terraform IaC (`infrastructure/modules/networking/main.tf`). The specific CIDR range is managed as infrastructure configuration and is not documented in policy to avoid creating a security exposure.

Network configuration changes (VNET, subnets, NSGs) must be made via Terraform and reviewed via pull request before deployment. No manual Azure portal changes are permitted.

### 4.2 Subnet Architecture

The production network is segmented into three dedicated subnets, each with its own Network Security Group:

| Subnet      | Name                  | Purpose                                                                 | Key Services                     |
| ----------- | --------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| Application | `snet-container-apps` | Azure Container Apps hosting the Next.js application                    | Azure Container Apps Environment |
| Database    | `snet-postgresql`     | Neon PostgreSQL connectivity (via private endpoint or VNet integration) | Neon PostgreSQL                  |
| Cache       | `snet-redis`          | Redis (Azure Cache for Redis)                                           | Redis Basic B10                  |

**Database subnet**: The `snet-postgresql` subnet is **delegated** to the database service and cannot host other resource types. This ensures that only database traffic flows through this subnet.

### 4.3 Network Security Group Rules

NSGs are applied at the subnet level to control traffic flows. The principle of **default deny** applies: all traffic not explicitly permitted by an NSG rule is denied.

#### NSG: Application Subnet (`snet-container-apps`)

| Priority | Direction | Protocol | Source             | Destination        | Port | Action | Purpose                                         |
| -------- | --------- | -------- | ------------------ | ------------------ | ---- | ------ | ----------------------------------------------- |
| 100      | Inbound   | TCP      | Internet           | Application Subnet | 443  | Allow  | HTTPS traffic from Azure Container Apps ingress |
| 110      | Inbound   | TCP      | AzureLoadBalancer  | Application Subnet | \*   | Allow  | Azure health probes                             |
| 4096     | Inbound   | \*       | \*                 | Application Subnet | \*   | Deny   | Default deny all other inbound                  |
| 100      | Outbound  | TCP      | Application Subnet | Database Subnet    | 5432 | Allow  | PostgreSQL connections to Neon                  |
| 110      | Outbound  | TCP      | Application Subnet | Cache Subnet       | 6380 | Allow  | Redis TLS connections                           |
| 120      | Outbound  | TCP      | Application Subnet | Internet           | 443  | Allow  | Outbound HTTPS to third-party APIs              |
| 4096     | Outbound  | \*       | Application Subnet | \*                 | \*   | Deny   | Default deny all other outbound                 |

**HTTP (port 80) is not permitted inbound.** All web traffic must use HTTPS (port 443). Azure Container Apps handles TLS termination at the ingress level.

#### NSG: Database Subnet (`snet-postgresql`)

| Priority | Direction | Protocol | Source             | Destination     | Port | Action | Purpose                        |
| -------- | --------- | -------- | ------------------ | --------------- | ---- | ------ | ------------------------------ |
| 100      | Inbound   | TCP      | Application Subnet | Database Subnet | 5432 | Allow  | PostgreSQL from application    |
| 4096     | Inbound   | \*       | \*                 | Database Subnet | \*   | Deny   | Default deny all other inbound |
| 4096     | Outbound  | \*       | Database Subnet    | \*              | \*   | Deny   | Default deny all outbound      |

No direct internet access to the database subnet is permitted. Direct access from engineer workstations to the production database is prohibited; all database access must be via the application layer or through a dedicated, approved access mechanism requiring ISM approval.

#### NSG: Cache Subnet (`snet-redis`)

| Priority | Direction | Protocol | Source             | Destination  | Port | Action | Purpose                        |
| -------- | --------- | -------- | ------------------ | ------------ | ---- | ------ | ------------------------------ |
| 100      | Inbound   | TCP      | Application Subnet | Cache Subnet | 6380 | Allow  | Redis TLS from application     |
| 4096     | Inbound   | \*       | \*                 | Cache Subnet | \*   | Deny   | Default deny all other inbound |

### 4.4 Inbound Traffic Filtering

All inbound internet traffic to the Inovy application is routed through **Azure Container Apps** managed ingress, which provides:

- TLS termination (TLS 1.2 minimum, TLS 1.3 preferred)
- Automatic HTTP-to-HTTPS redirect
- Azure-managed DDoS protection (Basic, included with VNET)

Direct internet access to any backend service (database, Redis, Qdrant) is not permitted through the NSG configuration.

## 5. Network Services Security (A.8.21)

### 5.1 Transport Layer Security

**All network communications must use TLS 1.2 or higher.** TLS 1.0 and TLS 1.1 are deprecated and must not be accepted.

| Communication                  | TLS Requirement                  | Enforcement                           |
| ------------------------------ | -------------------------------- | ------------------------------------- |
| Browser to Next.js application | TLS 1.2+                         | Azure Container Apps TLS termination  |
| Next.js to Neon PostgreSQL     | TLS required (`sslmode=require`) | Drizzle ORM connection string         |
| Next.js to Redis               | TLS 1.2+ (port 6380)             | Azure Cache for Redis TLS enforcement |
| Next.js to Qdrant              | HTTPS                            | Qdrant client configuration           |
| Next.js to OpenAI              | HTTPS (TLS 1.2+)                 | OpenAI SDK                            |
| Next.js to Deepgram            | HTTPS (TLS 1.2+)                 | Deepgram SDK                          |
| Next.js to Anthropic           | HTTPS (TLS 1.2+)                 | Anthropic SDK                         |
| Next.js to Recall.ai           | HTTPS (TLS 1.2+)                 | Recall.ai REST API                    |
| Next.js to Stripe              | HTTPS (TLS 1.2+)                 | Stripe SDK (enforced by Stripe)       |
| Next.js to Resend              | HTTPS (TLS 1.2+)                 | Resend SDK                            |
| GitHub Actions to Azure        | HTTPS (TLS 1.2+)                 | Azure SDK, federated identity         |

Non-TLS connections to any of the above services are **prohibited** and will result in application errors that must be treated as configuration defects.

### 5.2 Certificate Management

TLS certificates for the Inovy web application domain are managed by Azure Container Apps through Azure-managed certificates or customer-provided certificates in Azure Key Vault. Certificate renewal is automated. The ISM receives alerts if a certificate is within 30 days of expiry.

### 5.3 OAuth and External Authentication

Authentication flows with Google Workspace and Microsoft OAuth providers are performed over HTTPS using the OAuth 2.0 / OIDC protocol. OAuth tokens (access tokens, refresh tokens) are:

- Transmitted only over HTTPS
- Stored encrypted in the Neon PostgreSQL database
- Never logged (covered by Pino redact configuration)
- Rotated on refresh according to provider-specified expiry

### 5.4 Webhook Security

Inovy receives webhooks from: Stripe (payment events), Recall.ai (meeting bot events), and Deepgram (transcription events). All webhook endpoints implement:

1. **HMAC-SHA256 signature verification**: Each webhook provider sends a signature header computed over the request body using a shared secret. Inovy verifies this signature before processing the event.
2. **Timing-safe comparison**: Signature comparison uses a constant-time comparison function to prevent timing oracle attacks.
3. **Timestamp validation**: Where supported by the provider (e.g., Stripe), the webhook timestamp is validated to be within an acceptable window (typically 5 minutes) to prevent replay attacks.

Webhooks that fail signature validation are **rejected** with a 400 response and the event is logged in the audit log. Webhook secrets are stored in Azure Container Apps environment variables.

## 6. Network Segregation (A.8.22)

### 6.1 Subnet Segregation

The three-subnet architecture (application, database, cache) ensures that:

- The database cannot be directly accessed from the internet
- The cache cannot be directly accessed from the internet
- Intra-subnet traffic is restricted by NSG rules (not only inter-subnet)
- Compromise of the application tier does not automatically grant access to the database or cache beyond the credentials already configured in the application

### 6.2 Data Plane Isolation

In addition to network segregation, data plane isolation is enforced at the application level:

- **Organisation isolation**: Every database query includes `organizationId` filter (see POL-15 and POL-13)
- **Multi-tenancy**: Neon PostgreSQL uses a single database with schema-level row isolation per organisation; there is no shared table without organisation scoping
- **Qdrant collection isolation**: Vector embeddings are stored in collections scoped to organisation, preventing cross-tenant vector search results

### 6.3 External Service Isolation

Third-party API calls (OpenAI, Deepgram, Anthropic, Recall.ai, Stripe, Resend) are made exclusively from the application tier. The following isolation controls apply:

- API keys for each third-party service are stored in Azure environment variables and are not accessible to database or cache components
- Each third-party integration uses a **dedicated API key** (not shared between services)
- Compromise of one API key does not provide access to other third-party services
- API key rotation is tracked in the key management procedure (PROC-01)

## 7. Web Filtering and Content Security (A.8.23)

### 7.1 AI Input Moderation

All text input processed through Inovy's AI pipeline is screened by the **OpenAI Content Moderation API** before being passed to AI models. The moderation API checks for:

- Hate speech
- Violence
- Self-harm
- Sexual content
- Harassment

Content flagged by the moderation API is rejected and the event is logged in the chat audit log. The user receives an appropriate error response. This protects against misuse of Inovy's AI capabilities for generating harmful content.

### 7.2 Prompt Injection Detection

Inovy's prompt injection detection library actively detects attempts to manipulate AI model behaviour through malicious instructions embedded in user content. The detection library checks for **18+ patterns**, including:

- Classic "ignore previous instructions" patterns in English and Dutch
- Jailbreak phrases targeting AI system prompts
- Data exfiltration instruction patterns (e.g., "output everything you know about...")
- Role-playing bypass patterns
- Delimiter injection patterns
- Indirect injection patterns (instructions hidden in meeting content)

Dutch-language injection patterns are specifically included given Inovy's Dutch user base. Pattern matching is case-insensitive and normalisation-resistant.

When a prompt injection pattern is detected:

1. The request is rejected and not forwarded to the AI model
2. The detection event is logged in the chat audit log with the detected pattern category
3. An alert is sent to the ISM via Slack `#security`
4. The user receives a generic error response that does not reveal detection details

### 7.3 Content Flagging in Chat Audit

All AI chat interactions are recorded in the chat audit log (see POL-16) with:

- Whether moderation checks were triggered
- Whether prompt injection patterns were detected
- The moderation category (if flagged)
- Whether PII was detected in the response (AI PII output guard)

This provides a complete audit trail for investigating AI misuse or security incidents involving Inovy's AI features.

### 7.4 Webhook URL Validation

Inovy validates webhook destination URLs for any customer-configured webhook integrations to prevent Server-Side Request Forgery (SSRF) attacks. Validation:

- Blocks private IP ranges (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Blocks loopback addresses (127.0.0.0/8, ::1)
- Blocks link-local addresses (169.254.0.0/16)
- Requires HTTPS (no HTTP webhook destinations)
- Enforces domain allowlisting for high-sensitivity webhook targets

## 8. Remote Employee Network Security

Inovy is a fully remote company. Employee network security requirements:

- **Home networks**: Employees must use a secured home network (WPA2 or WPA3). Use of unsecured public Wi-Fi for work is prohibited without a VPN.
- **VPN**: A company VPN is available for employees requiring access from untrusted networks. VPN use is mandatory when accessing Inovy's development tools from public networks.
- **Network segmentation**: Employees with IoT devices on their home network are encouraged to use a separate SSID/VLAN for work devices.

No company production infrastructure is accessible via VPN; production access is exclusively via the application layer with appropriate authentication.

## 9. Network Architecture Reference

The Terraform configuration for all network resources is maintained in `infrastructure/modules/networking/main.tf`. This file is the authoritative source for:

- VNET address space and subnet CIDR allocations
- NSG rules and their priorities
- Service endpoint and private endpoint configuration
- VNet peering (if any)

Network architecture diagrams are maintained in the ISMS documentation and updated when infrastructure changes are made.

## 10. Related Documents

| Document                            | Reference                                 |
| ----------------------------------- | ----------------------------------------- |
| Information Security Policy         | POL-01                                    |
| Secure Development Lifecycle Policy | POL-13                                    |
| Data Protection & Privacy Policy    | POL-15                                    |
| Logging & Monitoring Policy         | POL-16                                    |
| Vulnerability Management Policy     | POL-18                                    |
| Terraform Networking Module         | infrastructure/modules/networking/main.tf |

## 11. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
