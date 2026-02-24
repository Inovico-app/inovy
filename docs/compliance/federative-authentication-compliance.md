# Federative Authentication Compliance (SSD-5.3.01)

**Document Version:** 1.0  
**Last Updated:** February 24, 2026  
**Status:** Analysis Complete - Implementation Ready  
**Related SSD Norm:** SSD-5.3.01

## Executive Summary

This document analyzes legal requirements for federative authentication in Dutch healthcare applications and provides an implementation plan for compliance with SSD-5.3.01: "Indien wet- of regelgeving dat voorschrijft wordt gebruik gemaakt van een federatieve voorziening (zoals bijvoorbeeld DigiD)."

**Key Findings:**
- Healthcare providers in the Netherlands are legally obligated to accept federative authentication methods under the Digital Government Act (Wdo) and eIDAS Regulation
- Current implementation uses OAuth providers (Google, Microsoft) but lacks DigiD/eHerkenning integration
- Implementation is required for compliance but can be deferred until the application handles citizen data requiring DigiD access
- Technical implementation requires SAML integration through approved service providers

---

## 1. Legal Requirements Analysis

### 1.1 Dutch Digital Government Act (Wdo)

**Applicable To:** Healthcare institutions designated as covered organizations

**Requirements:**
- Organizations providing digital services must use government-checked authentication methods
- Only authentication systems meeting safety and reliability standards are permitted
- DigiD is the mandated authentication method for citizens accessing government and designated healthcare services

**Reference:** [Digital Government Act (Wdo)](https://www.nldigitalgovernment.nl/overview/legislation/digital-government-act-wdo/)

**Application Timeline:** Currently in effect

### 1.2 eIDAS Regulation

**Applicable To:** Service providers with public tasks, including university hospitals and health insurers

**Requirements:**
- Must accept European approved login means for digital services (in effect since September 29, 2018)
- Required for services at "substantial" (EH3) or "high" (EH4) assurance levels
- Must accept eIDAS authentication even if offered at lower assurance levels

**Reference:** eIDAS Regulation Article 6

**Application Timeline:** Currently in effect

### 1.3 EU Digital Identity (EUDI) Regulation

**Applicable To:** All service providers legally obliged to identify customers, including healthcare

**Requirements:**
- Must accept EU Digital Identity Wallets for authentication
- Mandatory interoperability with EU Member State digital identity systems
- Common technical standards for cross-border authentication

**Reference:** [European Digital Identity Regulation](https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation)

**Application Timeline:** Mandatory by December 2027

### 1.4 Compliance Determination for Inovy

**Assessment:**

The application is being developed for use in healthcare (dental practices, as indicated by project context). The following factors determine when federative authentication becomes mandatory:

#### Required When:
1. **Processing citizen health data** that requires authenticated access under Wdo
2. **Providing services to Dutch citizens** requiring substantial or high assurance
3. **Operating as a designated healthcare provider** under Wdo
4. **After December 2027** for EUDI Wallet acceptance (if offering regulated services)

#### Not Immediately Required If:
- Application is B2B only (dentist-to-system, not patient-facing)
- No citizen authentication needed
- Operating as pure SaaS without patient portal features

#### Current Status:
**Recommendation:** Given the healthcare context and SSD compliance requirements, federative authentication capability should be **planned and architectured now**, with implementation triggered when:
- Patient portal features are added
- Direct citizen authentication is needed
- Client requirements mandate DigiD/eHerkenning

---

## 2. Federative Authentication Options

### 2.1 DigiD (Citizen Authentication)

**Purpose:** Authentication for Dutch citizens accessing government and designated services

**Assurance Levels:**
- **DigiD Basis:** Basic assurance (username/password)
- **DigiD Midden:** Medium assurance (SMS verification)
- **DigiD Substantieel (EH3):** Substantial assurance (app-based authentication)
- **DigiD Hoog (EH4):** High assurance (hardware tokens, smartcards)

**Technical Protocol:** SAML 2.0

**Data Provided:**
- BSN (Burgerservicenummer) - Dutch citizen service number
- Authentication level achieved
- Optional attributes (requires RvIG registration)

**Integration Requirements:**
- Organization must have public task designation
- Integration through approved SAML broker (e.g., Signicat, Logius)
- PKIoverheid certificates for production
- Annual ICT security assessment
- External audit within 2 months of production launch

**Use Case for Inovy:**
- Patient portal access
- Appointment booking by patients
- Medical record access by patients
- Consent management interfaces

### 2.2 eHerkenning (Business Authentication)

**Purpose:** Authentication for businesses and professionals accessing services

**Assurance Levels:**
- **EH1:** Low assurance
- **EH2:** Basic assurance
- **EH3:** Substantial assurance (mapped to eIDAS Substantial)
- **EH4:** High assurance (mapped to eIDAS High)

**Technical Protocol:** SAML 2.0

**Data Provided:**
- KVK number (Chamber of Commerce)
- Organization details
- Representative authorization
- Service restrictions (if applicable)

**Integration Requirements:**
- Same technical interface as DigiD (version 1.11+)
- Integration through approved brokers
- eIDAS interoperability included

**Use Case for Inovy:**
- Dental practice staff authentication
- Practice administrator access
- Inter-organizational data exchange
- Third-party integrations with healthcare institutions

### 2.3 eIDAS (European Cross-Border)

**Purpose:** Cross-border authentication for EU citizens using national eID schemes

**Assurance Levels:**
- **Low:** Basic identity verification
- **Substantial:** Medium assurance (mapped to EH3/DigiD Substantieel)
- **High:** Strong assurance (mapped to EH4/DigiD Hoog)

**Technical Protocol:** SAML 2.0 (through eIDAS nodes)

**Data Provided:**
- PersonIdentifier (unique European identifier)
- Given name, family name
- Date of birth
- Country-specific attributes

**Integration Requirements:**
- Integrated via eHerkenning interface (version 1.11+)
- Automatic acceptance if eHerkenning/DigiD implemented
- No additional integration needed

**Use Case for Inovy:**
- EU healthcare professional access
- Cross-border patient data access
- International dental practice chains

### 2.4 EU Digital Identity Wallet (EUDI)

**Purpose:** Next-generation European digital identity (mandatory by December 2027)

**Assurance Levels:**
- **High:** Default assurance level for EUDI Wallet

**Technical Protocol:** OpenID4VP (OpenID for Verifiable Presentations) / SD-JWT

**Data Provided:**
- PID (Person Identification Data)
- Verifiable credentials
- Selective disclosure of attributes
- Digital signatures

**Integration Requirements:**
- Accept EUDI Wallet by December 2027
- OpenID4VP protocol support
- Verifiable credential validation

**Use Case for Inovy:**
- Future-proof citizen authentication
- Cross-EU interoperability
- Modern privacy-preserving authentication

---

## 3. Current Implementation Status

### 3.1 Authentication Framework

**Current Solution:** Better Auth (migration from Kinde completed)

**Supported Methods:**
- Email/password with email verification
- OAuth 2.0: Google, Microsoft
- Magic link authentication
- Passkey/WebAuthn support
- Multi-tenant organization management
- Role-based access control (RBAC)

**Configuration Location:** `/workspace/apps/web/src/lib/auth.ts`

### 3.2 Gaps for Federative Authentication

**Missing Capabilities:**
1. ❌ No SAML 2.0 support (required for DigiD/eHerkenning)
2. ❌ No DigiD integration
3. ❌ No eHerkenning integration
4. ❌ No BSN attribute handling
5. ❌ No KVK number processing
6. ❌ No OpenID4VP support (for future EUDI Wallet)

**Existing Capabilities:**
1. ✅ OAuth 2.0 framework (extensible)
2. ✅ Multi-provider architecture
3. ✅ Encrypted token storage (AES-256-GCM)
4. ✅ Session management
5. ✅ Multi-tenancy ready
6. ✅ RBAC implementation

### 3.3 Architecture Assessment

**Strengths:**
- Better Auth is extensible with custom providers
- Existing OAuth infrastructure can be adapted
- Secure token handling already implemented
- Multi-tenant architecture supports organization isolation

**Limitations:**
- Better Auth does not natively support SAML 2.0
- Would require custom SAML plugin or middleware
- Additional broker service likely needed

---

## 4. Implementation Plan

### 4.1 Recommended Approach

Given the current architecture and requirements, we recommend a **phased approach**:

#### Phase 1: Architecture Preparation (Current)
**Status:** ✅ Ready

- Document requirements (this document)
- Identify integration partners
- Evaluate technical approaches
- Budget allocation

#### Phase 2: Integration Partner Selection (When Required)
**Trigger:** When citizen or business authentication is needed

**Options:**
1. **Signicat** (Recommended)
   - Approved DigiD/eHerkenning broker
   - SAML metadata management
   - Developer-friendly dashboard
   - Handles PKIoverheid certificates
   - Pre-production testing environment

2. **Logius Direct Integration**
   - Direct connection to government systems
   - More complex setup
   - Requires internal SAML expertise
   - Full control over implementation

3. **Other Approved Brokers**
   - Surfconext (education sector focus)
   - Keycloak with SAML bridge (self-hosted)

**Recommendation:** Use Signicat for faster time-to-market and reduced maintenance burden.

#### Phase 3: Technical Implementation
**Estimated Effort:** 3-4 weeks with broker, 8-12 weeks for direct integration

**Components to Develop:**

1. **SAML Service Provider (SP) Implementation**
   - SAML authentication request generation
   - SAML response validation
   - Signature verification
   - Attribute extraction

2. **Better Auth SAML Plugin**
   ```typescript
   // apps/web/src/lib/auth/plugins/saml-plugin.ts
   // Custom SAML provider for Better Auth
   ```

3. **DigiD Provider Configuration**
   ```typescript
   // apps/web/src/lib/auth/providers/digid-provider.ts
   // DigiD-specific SAML configuration
   ```

4. **eHerkenning Provider Configuration**
   ```typescript
   // apps/web/src/lib/auth/providers/eherkenning-provider.ts
   // eHerkenning-specific SAML configuration
   ```

5. **BSN/KVK Attribute Handler**
   ```typescript
   // apps/web/src/lib/auth/attributes/identity-attributes.ts
   // Handle BSN, KVK, and other identity attributes
   ```

6. **Database Schema Extensions**
   ```typescript
   // Add to apps/web/src/server/db/schema/auth.ts
   - bsn (encrypted) to users table
   - kvk to organizations table
   - assurance_level to sessions table
   - saml_attributes JSONB column
   ```

#### Phase 4: Compliance & Security
**Duration:** 2-3 weeks

1. **PKIoverheid Certificate Setup**
   - Purchase certificates
   - Install in broker/infrastructure
   - Configure certificate renewal

2. **Security Assessment**
   - NEN 7510 compliance review
   - Penetration testing
   - Security audit by external party

3. **Logius Approval Process**
   - Submit SAML metadata
   - Pre-production testing
   - Production approval request

4. **DigiD External Audit**
   - Schedule within 2 months of launch
   - Compliance verification
   - Annual re-certification

#### Phase 5: Production Deployment
**Duration:** 1-2 weeks

1. Production configuration
2. Monitoring setup
3. Incident response procedures
4. User documentation

### 4.2 Alternative: Defer Implementation

**Rationale:**
If the application does NOT require citizen authentication (patient portal features), federative authentication can be deferred.

**Conditions for Deferral:**
- Application remains B2B (dentist practices only)
- No patient-facing authentication needed
- No services requiring DigiD by law
- OAuth (Google/Microsoft) sufficient for staff access

**Compliance Status:**
- SSD-5.3.01 is satisfied by documenting that:
  1. Legal requirements have been identified
  2. Federative options have been evaluated
  3. Implementation plan exists for when required
  4. Current OAuth implementation meets existing needs

**Monitoring:**
- Review quarterly if requirements change
- Implement when patient portal is added
- Stay updated on EUDI Wallet developments

---

## 5. Technical Architecture Options

### Option A: SAML Broker Integration (Recommended)

**Architecture:**
```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ (1) Initiate Auth
         ▼
┌─────────────────┐      (2) SAML AuthRequest      ┌──────────────────┐
│  Inovy Next.js  │─────────────────────────────▶│  Signicat Broker │
│   Application   │                                └────────┬─────────┘
└─────────────────┘                                         │ (3) Forward
         ▲                                                  │
         │ (5) SAML Response                                ▼
         │                                          ┌───────────────┐
         └──────────────────────────────────────────│ DigiD/eHerk.  │
                                                    └───────────────┘
```

**Implementation Steps:**
1. Register with Signicat
2. Configure SAML metadata in Signicat dashboard
3. Download Signicat metadata
4. Submit to Logius for approval
5. Implement SAML SP in Next.js
6. Create Better Auth SAML plugin
7. Test in pre-production
8. Production deployment

**Pros:**
- ✅ Faster implementation (3-4 weeks)
- ✅ Managed certificate handling
- ✅ Pre-production testing environment
- ✅ Handles Logius communication
- ✅ Reduced operational burden
- ✅ Compliance support included

**Cons:**
- ⚠️ Additional service provider cost
- ⚠️ Third-party dependency
- ⚠️ Less control over SAML flow

**Cost Estimate:** €500-2000/month depending on transaction volume

### Option B: Direct Logius Integration

**Architecture:**
```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ (1) Initiate Auth
         ▼
┌─────────────────┐      (2) SAML AuthRequest      ┌──────────────────┐
│  Inovy Next.js  │─────────────────────────────▶│  Logius DigiD    │
│   Application   │◀─────────────────────────────┤  Identity Provider│
│ (SAML SP)       │      (3) SAML Response         └──────────────────┘
└─────────────────┘
```

**Implementation Steps:**
1. Set up SAML Service Provider
2. Generate SAML metadata
3. Submit metadata to Logius
4. Obtain PKIoverheid certificates
5. Configure certificate in application
6. Implement SAML authentication flow
7. Build attribute processing
8. Test with Logius pre-production
9. External audit
10. Production deployment

**Pros:**
- ✅ Full control over authentication flow
- ✅ No third-party service costs
- ✅ Direct Logius relationship
- ✅ Customizable attribute handling

**Cons:**
- ⚠️ Longer implementation (8-12 weeks)
- ⚠️ Complex certificate management
- ⚠️ Internal SAML expertise required
- ⚠️ More maintenance overhead
- ⚠️ Manual Logius coordination

**Cost Estimate:** Higher development cost, lower operational cost

### Option C: Hybrid Approach

**Architecture:**
Use existing OAuth for staff authentication + SAML broker for citizen authentication

**Rationale:**
- Keep simple OAuth for dental practice staff (Google Workspace integration valuable)
- Add DigiD only for patient portal features
- Separate authentication contexts reduce complexity

**Implementation:**
- Configure multiple authentication providers in Better Auth
- Route selection based on user type (staff vs. patient)
- Different login pages for different contexts

**Pros:**
- ✅ Optimal user experience per context
- ✅ Lower complexity for staff authentication
- ✅ Compliance where required
- ✅ Gradual implementation possible

**Cons:**
- ⚠️ Multiple authentication systems to maintain
- ⚠️ More complex routing logic

### Recommendation

**Start with Option C (Hybrid) + Option A (Broker):**
1. Keep existing OAuth for practice staff
2. Add DigiD via Signicat when patient portal is needed
3. Provides flexibility and optimal user experience
4. Minimizes disruption to current implementation

---

## 6. Implementation Roadmap

### Immediate Actions (This Sprint)

- [x] **Document legal requirements** ✅ This document
- [x] **Evaluate federative options** ✅ Analysis complete
- [x] **Create implementation plan** ✅ Documented below
- [ ] **Update README with compliance status**
- [ ] **Add environment variable placeholders**

### When Patient Portal is Needed (Future Sprint)

#### Prerequisites
1. **Register with Signicat**
   - Create account at developer.signicat.com
   - Set up pre-production environment
   - Configure organization details

2. **Install SAML Dependencies**
   ```bash
   pnpm add @node-saml/node-saml
   pnpm add @node-saml/passport-saml
   pnpm add -D @types/passport-saml
   ```

3. **Environment Configuration**
   ```env
   # DigiD/SAML Configuration
   DIGID_ENABLED=true
   DIGID_ENTITY_ID=https://inovy.nl/saml/metadata
   DIGID_CALLBACK_URL=https://inovy.nl/api/auth/saml/callback
   DIGID_ISSUER=https://preprod.signicat.com/saml
   DIGID_ENTRY_POINT=https://preprod.signicat.com/saml/sso
   DIGID_CERT=<Signicat certificate>
   DIGID_PRIVATE_KEY=<Private key for signing>
   
   # eHerkenning Configuration
   EHERKENNING_ENABLED=false
   EHERKENNING_ENTITY_ID=https://inovy.nl/saml/metadata/eherkenning
   EHERKENNING_CALLBACK_URL=https://inovy.nl/api/auth/saml/eherkenning/callback
   EHERKENNING_ISSUER=https://preprod.signicat.com/eherkenning
   EHERKENNING_ENTRY_POINT=https://preprod.signicat.com/eherkenning/sso
   EHERKENNING_CERT=<Certificate>
   
   # BSN Encryption (in addition to OAuth encryption key)
   BSN_ENCRYPTION_KEY=<64 character hex for AES-256-GCM>
   ```

#### Development Tasks

1. **Create SAML Service Provider Module**
   ```
   apps/web/src/lib/auth/saml/
   ├── saml-config.ts          # SAML configuration
   ├── saml-provider.ts        # SAML SP implementation
   ├── metadata.ts             # Metadata generation
   ├── signature-validator.ts  # Signature verification
   └── attribute-parser.ts     # SAML attribute extraction
   ```

2. **Create Better Auth SAML Plugin**
   ```typescript
   // apps/web/src/lib/auth/plugins/saml-plugin.ts
   import { createAuthPlugin } from 'better-auth';
   
   export const samlPlugin = createAuthPlugin({
     id: 'saml',
     endpoints: {
       '/saml/login': {
         method: 'GET',
         handler: async (request) => {
           // Generate SAML AuthRequest
           // Redirect to IdP
         }
       },
       '/saml/callback': {
         method: 'POST',
         handler: async (request) => {
           // Validate SAML response
           // Extract attributes
           // Create/update user
           // Create session
         }
       },
       '/saml/metadata': {
         method: 'GET',
         handler: async () => {
           // Return SP metadata XML
         }
       }
     },
     hooks: {
       after: {
         signIn: async (user) => {
           // Post-authentication logic
         }
       }
     }
   });
   ```

3. **Update Database Schema**
   ```typescript
   // apps/web/src/server/db/schema/auth.ts
   
   // Add columns to users table:
   export const users = pgTable('users', {
     // ... existing fields
     bsn: text('bsn'),                          // Encrypted BSN
     bsnEncryptionIv: text('bsn_encryption_iv'), // IV for BSN encryption
     identityProvider: text('identity_provider'), // 'digid', 'eherkenning', 'oauth'
     assuranceLevel: text('assurance_level'),    // 'basic', 'substantial', 'high'
     identityVerifiedAt: timestamp('identity_verified_at', { 
       withTimezone: true, 
       mode: 'date' 
     }),
   });
   
   // Add columns to organizations table:
   export const organizations = pgTable('organizations', {
     // ... existing fields
     kvkNumber: text('kvk_number'),              // Chamber of Commerce number
     eherkenningLevel: text('eherkenning_level'), // Required eHerkenning level
   });
   ```

4. **Create API Routes**
   ```
   apps/web/src/app/api/auth/saml/
   ├── login/route.ts           # Initiate SAML login
   ├── callback/route.ts        # Handle SAML response
   ├── metadata/route.ts        # Serve SP metadata
   └── logout/route.ts          # SAML single logout
   ```

5. **Create Patient Login UI**
   ```
   apps/web/src/app/(auth)/login/patient/
   └── page.tsx                 # Patient login page with DigiD button
   ```

6. **BSN Encryption Service**
   ```typescript
   // apps/web/src/server/services/bsn-encryption.service.ts
   // Secure BSN encryption/decryption using AES-256-GCM
   // Separate key from OAuth encryption
   // Audit logging for BSN access
   ```

7. **Compliance Logging**
   ```typescript
   // apps/web/src/server/services/compliance-audit.service.ts
   // Log all DigiD authentications
   // Track assurance levels
   // BSN access audit trail
   ```

### 4.2 Testing Strategy

#### Pre-Production Testing
1. Signicat pre-production environment setup
2. Test SAML authentication flow
3. Verify attribute extraction
4. Test session management
5. Security testing (SAML injection, signature validation)
6. Load testing

#### Production Validation
1. Logius production approval
2. External DigiD audit (within 2 months)
3. Penetration testing
4. Annual ICT security assessment
5. Compliance monitoring

### 4.3 Compliance Checklist

#### Legal Compliance
- [ ] Determine if application requires DigiD (patient portal?)
- [ ] Register as service provider with Logius (if direct integration)
- [ ] Obtain PKIoverheid certificates
- [ ] Complete security assessment (NEN 7510)
- [ ] Privacy Impact Assessment (DPIA) for BSN processing
- [ ] Register with RvIG if requesting BSN attribute
- [ ] External audit scheduled

#### Technical Compliance
- [ ] SAML 2.0 Service Provider implemented
- [ ] Signature verification enabled
- [ ] BSN encryption implemented
- [ ] Audit logging for all authentications
- [ ] Session management compliant
- [ ] Metadata published at standardized endpoint
- [ ] Error handling without information leakage

#### Operational Compliance
- [ ] Certificate renewal process documented
- [ ] Incident response plan updated
- [ ] Annual security assessment scheduled
- [ ] Audit log retention policy (7 years minimum)
- [ ] Staff training on BSN handling

---

## 7. Cost Analysis

### One-Time Costs

| Item | Option A (Broker) | Option B (Direct) |
|------|------------------|-------------------|
| Development | €15,000 - €25,000 | €40,000 - €60,000 |
| PKIoverheid Certificates | €500 - €1,500 | €500 - €1,500 |
| Security Assessment | €5,000 - €10,000 | €5,000 - €10,000 |
| External Audit | €3,000 - €7,000 | €3,000 - €7,000 |
| **Total** | **€23,500 - €43,500** | **€48,500 - €78,500** |

### Recurring Costs

| Item | Option A (Broker) | Option B (Direct) |
|------|------------------|-------------------|
| Broker Service | €500 - €2,000/month | €0 |
| Certificate Renewal | €500/year | €500/year |
| Annual Security Assessment | €5,000/year | €5,000/year |
| Maintenance | €2,000/year | €10,000/year |
| **Annual Total** | **€13,000 - €31,500** | **€15,500** |

**Recommendation:** Option A (Broker) provides better ROI for most use cases due to faster implementation and reduced maintenance.

---

## 8. Security Considerations

### 8.1 BSN Handling

The BSN (Burgerservicenummer) is classified as **special category personal data** under GDPR Article 9.

**Requirements:**
- Encrypt BSN in database using AES-256-GCM with dedicated encryption key
- Separate encryption key from general OAuth encryption
- Implement key rotation mechanism
- Audit all BSN access
- Minimum 7-year retention for audit logs
- Document legal basis for BSN processing
- Conduct DPIA before BSN collection

**Implementation:**
```typescript
// Dedicated BSN encryption (separate from OAuth tokens)
// Use BSN_ENCRYPTION_KEY environment variable
// Store encrypted BSN + IV in database
// Log all decrypt operations
// Implement access controls limiting BSN visibility
```

### 8.2 SAML Security

**Critical Security Measures:**
1. **Signature Verification:** Always validate SAML response signatures
2. **Replay Prevention:** Validate NotOnOrAfter, NotBefore conditions
3. **Certificate Validation:** Verify IdP certificate chain
4. **Audience Restriction:** Validate AudienceRestriction matches entity ID
5. **InResponseTo:** Validate InResponseTo matches original request ID
6. **TLS/HTTPS:** All SAML traffic over HTTPS only
7. **XML External Entity (XXE):** Disable external entity processing (SSD-32)

### 8.3 Session Management

**Requirements for DigiD Sessions:**
- Maximum session duration: Configurable based on assurance level
- Re-authentication required for sensitive operations
- Session binding to IP/device recommended
- Logout propagation to DigiD (Single Logout)
- Audit logging of all session events

---

## 9. Privacy & GDPR Compliance

### 9.1 Data Processing

**Personal Data Collected via DigiD:**
- BSN (optional, requires registration)
- Authentication timestamps
- Assurance level achieved
- IP address (for security)

**Legal Basis:**
- Legitimate interest (healthcare service delivery)
- Legal obligation (Wdo compliance)
- Explicit consent (for BSN processing if not legally required)

### 9.2 Data Protection Impact Assessment (DPIA)

**Required:** Yes, for BSN processing

**DPIA Scope:**
- Purpose of BSN collection
- Necessity assessment
- Risk to individual rights
- Mitigation measures
- Data retention period
- Access controls

**Timeline:** Complete before implementing BSN storage

### 9.3 Privacy Statement Updates

**Required Disclosures:**
- DigiD authentication process
- BSN usage and retention
- Data sharing with Logius/brokers
- User rights (access, rectification, erasure)
- Security measures

**Action:** Update privacy policy before DigiD launch

---

## 10. Alternative Authentication Methods

### 10.1 IRMA (I Reveal My Attributes)

**Purpose:** Privacy-preserving attribute-based authentication

**Characteristics:**
- Dutch privacy-by-design authentication system
- Attribute-based disclosure (share only what's needed)
- User controls their own data
- No central identity provider

**Use Case:** Optional privacy-enhancing alternative for certain workflows

**Status:** Not legally required but may enhance privacy compliance

### 10.2 UZI-pas (Healthcare Professional Card)

**Purpose:** Authentication for healthcare professionals

**Characteristics:**
- Smart card-based authentication
- PKI certificates
- Role and organization attributes
- Industry-standard for healthcare

**Use Case:** Authentication for dental professionals in hospital settings

**Status:** Consider for future if integrating with hospital systems

### 10.3 iDIN (Banking Authentication)

**Purpose:** Bank-based identity verification

**Characteristics:**
- Leverage existing bank authentication
- Identity verification to DigiD Midden level
- Operated by Dutch banks

**Use Case:** Alternative to DigiD for identity verification

**Status:** Not required, but could supplement authentication options

---

## 11. Monitoring & Compliance Maintenance

### 11.1 Key Metrics

**Authentication Metrics:**
- DigiD authentication success/failure rate
- Average authentication time
- Assurance level distribution
- Error rate by type

**Security Metrics:**
- SAML signature validation failures
- Certificate expiration warnings (90, 60, 30 days)
- Suspicious authentication patterns
- Failed authentication attempts

**Compliance Metrics:**
- BSN access audit log completeness
- Security assessment status
- Certificate validity status
- Broker service availability

### 11.2 Alerting

**Critical Alerts:**
- Certificate expiring within 30 days
- SAML signature validation failures > 1%
- Broker service outage
- Logius connectivity issues

**Warning Alerts:**
- Authentication success rate < 95%
- Unusual authentication pattern
- Audit log gaps

### 11.3 Annual Compliance Activities

**Q1 (January-March):**
- Review authentication logs
- Security assessment planning

**Q2 (April-June):**
- External security assessment
- Certificate renewal (if needed)
- DPIA review

**Q3 (July-September):**
- DigiD audit (if required)
- Penetration testing

**Q4 (October-December):**
- Compliance documentation review
- Staff training updates
- Incident response drill

---

## 12. Decision Matrix

Use this matrix to determine when to implement federative authentication:

| Scenario | DigiD Required? | eHerkenning Required? | Priority | Timeline |
|----------|----------------|----------------------|----------|----------|
| Practice staff only (current) | ❌ No | ❌ No | Low | Deferred |
| Patient appointment booking | ✅ Yes | ❌ No | High | Before patient portal |
| Patient medical record access | ✅ Yes | ❌ No | Critical | Before data access |
| Inter-practice data exchange | ❌ No | ✅ Yes | Medium | When B2B features added |
| Hospital integration | ❌ No | ✅ Yes (or UZI) | Medium | When hospital integration |
| EU cross-border patients | ✅ Yes (eIDAS) | ❌ No | Medium | When EU expansion |

**Current Status:** Practice staff only → DigiD NOT immediately required

---

## 13. Conclusion & Recommendations

### 13.1 Compliance Status

**SSD-5.3.01 Acceptance Criteria:**
- ✅ **Legal requirements identified:** Dutch Wdo, eIDAS, EUDI Regulation
- ✅ **Federative options evaluated:** DigiD, eHerkenning, eIDAS, EUDI Wallet
- ✅ **Implementation plan documented:** Complete technical and operational plan

**Current Compliance:** **SATISFIED** for current application scope (B2B practice management)

### 13.2 Immediate Recommendations

1. **Accept this analysis** as completion of SSD-5.3.01 requirements
2. **Monitor product roadmap** for patient-facing features
3. **Maintain architecture readiness** for SAML integration
4. **Budget for implementation** when patient portal is planned
5. **Review quarterly** to assess if requirements have changed

### 13.3 Future Trigger Points

**Implement DigiD When:**
- Patient portal feature is added to roadmap
- Client contracts require citizen authentication
- Regulatory audit identifies the requirement
- Competitive positioning demands it

**Implement eHerkenning When:**
- B2B dental practice authentication needed
- Hospital system integration planned
- Inter-organizational workflows added
- Practice staff prefer business authentication

**Implement EUDI Wallet When:**
- December 2027 deadline approaches
- Patient-facing services are active
- EU expansion requires cross-border authentication

### 13.4 Next Steps

**For Project Manager:**
1. Review this analysis
2. Determine if patient portal is on roadmap
3. If yes: Budget for implementation (€25k-45k + €1-2k/month)
4. If no: Mark SSD-5.3.01 as complete with documentation

**For Development Team:**
1. No immediate implementation required
2. Familiarize with SAML concepts
3. Keep Better Auth updated for extensibility
4. Maintain OAuth implementation quality

**For Compliance:**
1. Add this document to compliance evidence
2. Schedule quarterly review
3. Update compliance matrix
4. Track EUDI Wallet regulation developments

---

## 14. References

### Legal & Regulatory
- [Digital Government Act (Wdo)](https://www.nldigitalgovernment.nl/overview/legislation/digital-government-act-wdo/)
- [eIDAS Regulation](https://eur-lex.europa.eu/eli/reg/2014/910/oj)
- [EUDI Regulation](https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation)
- [DigiD Information](https://www.digid.nl/en/about-digid/)
- [eHerkenning for Service Providers](https://www.eherkenning.nl/en/service-providers)

### Technical Documentation
- [Signicat DigiD Integration Guide](https://developer.signicat.com/identity-methods/digid/integration/)
- [SAML 2.0 Technical Overview](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [PKIoverheid Information](https://www.logius.nl/diensten/pkioverheid)

### Standards
- NEN 7510: Information Security in Healthcare
- ISO 27001: Information Security Management
- eIDAS Cryptographic Requirements v1.4.1

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-24 | Cloud Agent | Initial analysis and implementation plan |

---

## Appendix A: SAML Flow Diagram

### DigiD Authentication Flow

```
┌─────────┐                                                         ┌─────────┐
│ Patient │                                                         │  DigiD  │
│ Browser │                                                         │   IdP   │
└────┬────┘                                                         └────┬────┘
     │                                                                   │
     │ 1. Click "Login with DigiD"                                      │
     │────────────────────────────────▶┌────────────────┐              │
     │                                  │  Inovy App     │              │
     │                                  │  (Service      │              │
     │                                  │   Provider)    │              │
     │                                  └───────┬────────┘              │
     │                                          │                       │
     │                                          │ 2. Generate SAML      │
     │                                          │    AuthRequest        │
     │                                          │                       │
     │                                          │ 3. Sign Request       │
     │                                          │                       │
     │ 4. Redirect with SAMLRequest             │                       │
     │◀─────────────────────────────────────────┤                       │
     │                                                                  │
     │ 5. SAMLRequest in URL                                            │
     │──────────────────────────────────────────────────────────────────▶
     │                                                                  │
     │                                          6. DigiD Login Page     │
     │◀──────────────────────────────────────────────────────────────────
     │                                                                  │
     │ 7. User enters credentials                                       │
     │──────────────────────────────────────────────────────────────────▶
     │                                                                  │
     │                                          8. Verify credentials   │
     │                                             & generate SAML      │
     │                                             Response             │
     │                                                                  │
     │ 9. Redirect with SAMLResponse                                    │
     │◀──────────────────────────────────────────────────────────────────
     │                                                                  │
     │ 10. POST SAMLResponse                                            │
     │────────────────────────────────▶┌────────────────┐              │
     │                                  │  Inovy App     │              │
     │                                  │  (Callback)    │              │
     │                                  └───────┬────────┘              │
     │                                          │                       │
     │                                          │ 11. Verify signature  │
     │                                          │                       │
     │                                          │ 12. Extract BSN &     │
     │                                          │     attributes        │
     │                                          │                       │
     │                                          │ 13. Create/update     │
     │                                          │     user & session    │
     │                                          │                       │
     │ 14. Redirect to application              │                       │
     │◀─────────────────────────────────────────┤                       │
     │                                                                  │
     │ 15. Access application (authenticated)                           │
     │                                                                  │
```

---

## Appendix B: Sample SAML Metadata

### Service Provider Metadata (Inovy)

```xml
<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="https://inovy.nl/saml/metadata">
  <md:SPSSODescriptor 
      AuthnRequestsSigned="true" 
      WantAssertionsSigned="true"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate><!-- PKIoverheid certificate --></ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    
    <md:KeyDescriptor use="encryption">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate><!-- PKIoverheid certificate --></ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    
    <md:SingleLogoutService 
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        Location="https://inovy.nl/api/auth/saml/logout"/>
    
    <md:AssertionConsumerService 
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://inovy.nl/api/auth/saml/callback"
        index="0"
        isDefault="true"/>
    
    <md:AttributeConsumingService index="0">
      <md:ServiceName xml:lang="en">Inovy Dental Management</md:ServiceName>
      <md:RequestedAttribute 
          Name="urn:nl:bvn:bsn" 
          NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"
          isRequired="false"/>
    </md:AttributeConsumingService>
    
  </md:SPSSODescriptor>
  
  <md:Organization>
    <md:OrganizationName xml:lang="en">Inovico</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">Inovy</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">https://inovy.nl</md:OrganizationURL>
  </md:Organization>
  
  <md:ContactPerson contactType="technical">
    <md:EmailAddress>security@inovico.nl</md:EmailAddress>
  </md:ContactPerson>
  
</md:EntityDescriptor>
```

---

## Appendix C: Environment Configuration Template

```env
# =============================================================================
# Federative Authentication Configuration (SSD-5.3.01)
# =============================================================================
# Status: Not yet implemented - for future patient portal
# Requirements: DigiD/eHerkenning integration when patient authentication needed
# Documentation: docs/compliance/federative-authentication-compliance.md
# =============================================================================

# -----------------------------------------------------------------------------
# DigiD Configuration (for citizen/patient authentication)
# -----------------------------------------------------------------------------
# Enable when: Patient portal features are added
# Provider: Signicat (recommended) or direct Logius integration
# Documentation: https://developer.signicat.com/identity-methods/digid/

DIGID_ENABLED=false
DIGID_ENTITY_ID=https://inovy.nl/saml/metadata
DIGID_CALLBACK_URL=https://inovy.nl/api/auth/saml/digid/callback
DIGID_LOGOUT_URL=https://inovy.nl/api/auth/saml/digid/logout

# Signicat Integration (recommended)
DIGID_ISSUER=https://preprod.signicat.com/saml/digid
DIGID_ENTRY_POINT=https://preprod.signicat.com/saml/digid/sso
DIGID_LOGOUT_ENDPOINT=https://preprod.signicat.com/saml/digid/slo
DIGID_IDP_CERT=<Signicat public certificate>

# OR Direct Logius Integration
# DIGID_ISSUER=https://was-preprod1.digid.nl/saml/idp/metadata
# DIGID_ENTRY_POINT=https://was-preprod1.digid.nl/saml/idp/sso
# DIGID_LOGOUT_ENDPOINT=https://was-preprod1.digid.nl/saml/idp/slo
# DIGID_IDP_CERT=<Logius public certificate>

# Service Provider Keys (PKIoverheid certificates required for production)
DIGID_SP_PRIVATE_KEY=<Private key for signing SAML requests>
DIGID_SP_CERT=<Public certificate for SAML>

# BSN Attribute (requires RvIG registration)
DIGID_REQUEST_BSN=false
DIGID_BSN_ATTRIBUTE_NAME=urn:nl:bvn:bsn

# -----------------------------------------------------------------------------
# eHerkenning Configuration (for business/professional authentication)
# -----------------------------------------------------------------------------
# Enable when: B2B authentication or practice staff prefer business login
# Provider: Same broker as DigiD (Signicat supports both)

EHERKENNING_ENABLED=false
EHERKENNING_ENTITY_ID=https://inovy.nl/saml/metadata/eherkenning
EHERKENNING_CALLBACK_URL=https://inovy.nl/api/auth/saml/eherkenning/callback
EHERKENNING_LOGOUT_URL=https://inovy.nl/api/auth/saml/eherkenning/logout

# Signicat Integration
EHERKENNING_ISSUER=https://preprod.signicat.com/saml/eherkenning
EHERKENNING_ENTRY_POINT=https://preprod.signicat.com/saml/eherkenning/sso
EHERKENNING_LOGOUT_ENDPOINT=https://preprod.signicat.com/saml/eherkenning/slo
EHERKENNING_IDP_CERT=<Certificate>

# Service Provider Keys
EHERKENNING_SP_PRIVATE_KEY=<Private key>
EHERKENNING_SP_CERT=<Public certificate>

# Service Catalog & Authorization
EHERKENNING_REQUIRED_LEVEL=EH3  # EH1, EH2, EH3, or EH4
EHERKENNING_REQUEST_KVK=true

# -----------------------------------------------------------------------------
# BSN Encryption (separate from OAuth encryption)
# -----------------------------------------------------------------------------
# Critical: BSN is special category personal data - requires dedicated encryption
# Algorithm: AES-256-GCM
# Key length: 64 hexadecimal characters (256 bits)
# Generate: openssl rand -hex 32

BSN_ENCRYPTION_KEY=<64 character hex key>
BSN_ENCRYPTION_ALGORITHM=aes-256-gcm

# -----------------------------------------------------------------------------
# SAML Security Settings
# -----------------------------------------------------------------------------

SAML_VALIDATE_SIGNATURE=true
SAML_VALIDATE_AUDIENCE=true
SAML_VALIDATE_TIMESTAMPS=true
SAML_CLOCK_SKEW=300  # seconds (5 minutes tolerance)
SAML_SESSION_TIMEOUT=3600  # seconds (1 hour for DigiD sessions)
SAML_REQUIRE_ASSERTION_ENCRYPTION=true

# -----------------------------------------------------------------------------
# Compliance Audit Configuration
# -----------------------------------------------------------------------------

AUDIT_DIGID_AUTHENTICATIONS=true
AUDIT_BSN_ACCESS=true
AUDIT_RETENTION_DAYS=2555  # 7 years minimum for healthcare

# -----------------------------------------------------------------------------
# Broker Service Configuration (if using Signicat)
# -----------------------------------------------------------------------------

SIGNICAT_API_KEY=<API key from Signicat dashboard>
SIGNICAT_ENVIRONMENT=preprod  # preprod or production
SIGNICAT_WEBHOOK_SECRET=<Webhook signature verification>

# -----------------------------------------------------------------------------
# Certificate Management
# -----------------------------------------------------------------------------

# PKIoverheid Certificate Expiration Alerts
CERT_EXPIRY_WARNING_DAYS=90,60,30
CERT_EXPIRY_ALERT_EMAIL=security@inovico.nl

# =============================================================================
# End of Federative Authentication Configuration
# =============================================================================
```

---

## Appendix D: Code Scaffolding

### Sample SAML Plugin Structure

```typescript
// apps/web/src/lib/auth/plugins/saml-plugin.ts
import { createAuthPlugin } from 'better-auth';
import { SAML } from '@node-saml/node-saml';

interface SAMLPluginOptions {
  enabled: boolean;
  entityId: string;
  callbackUrl: string;
  entryPoint: string;
  issuer: string;
  cert: string;
  privateKey: string;
  validateSignature?: boolean;
}

export const samlPlugin = (options: SAMLPluginOptions) => 
  createAuthPlugin({
    id: 'saml',
    endpoints: {
      '/saml/login': {
        method: 'GET',
        handler: async (request) => {
          if (!options.enabled) {
            return new Response('DigiD not enabled', { status: 404 });
          }

          const saml = new SAML({
            entryPoint: options.entryPoint,
            issuer: options.issuer,
            callbackUrl: options.callbackUrl,
            cert: options.cert,
            privateKey: options.privateKey,
            // ... additional SAML config
          });

          const loginUrl = await saml.getAuthorizeUrlAsync();
          
          return Response.redirect(loginUrl);
        }
      },
      
      '/saml/callback': {
        method: 'POST',
        handler: async (request) => {
          // Validate SAML response
          // Extract attributes (BSN, assurance level)
          // Create or update user
          // Create session
          // Redirect to application
        }
      },
      
      '/saml/metadata': {
        method: 'GET',
        handler: async () => {
          // Generate and return SP metadata XML
        }
      }
    }
  });
```

---

## Appendix E: Migration Impact Assessment

### Impact on Current Codebase

**Files to Modify:**
- `/workspace/apps/web/src/lib/auth.ts` - Add SAML plugin
- `/workspace/apps/web/src/server/db/schema/auth.ts` - Add BSN fields
- `/workspace/apps/web/src/app/(auth)/login/page.tsx` - Add DigiD button
- `/workspace/apps/web/package.json` - Add SAML dependencies

**Files to Create:**
- SAML plugin and provider modules
- BSN encryption service
- Compliance audit logging
- Patient login pages

**Database Migrations:**
- Add identity provider columns
- Add encrypted BSN storage
- Add assurance level tracking

**Breaking Changes:** None expected - additive changes only

**Rollback Plan:**
- Feature flagged (DIGID_ENABLED=false)
- Can disable without code changes
- Existing OAuth unaffected

---

**End of Document**
