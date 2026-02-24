# Data Classification Framework

## Overview

This document specifies the data classification framework for all exchanged data within the Inovy platform. The classification system ensures that appropriate security controls, including encryption, are applied based on the sensitivity of the data.

**Compliance Reference:** SSD-4.2.01 - Specifying data classification for exchanged data

## Classification Levels

The Inovy platform uses a four-tier classification system:

### 1. Public
**Definition:** Non-sensitive information that can be publicly shared without risk.

**Characteristics:**
- No PII, PHI, or confidential business information
- Can be shared externally without authorization
- No legal or regulatory restrictions

**Encryption Requirements:**
- At Rest: Not required
- In Transit: TLS 1.3 (standard HTTPS)

**Examples:**
- Public marketing materials
- Published research findings
- Publicly available user guides

**Retention:** No specific retention requirement

---

### 2. Internal
**Definition:** Information intended for internal use only, with no direct patient or sensitive personal data.

**Characteristics:**
- Business operational data
- Non-sensitive system logs
- Aggregated, anonymized statistics
- No PII or PHI content

**Encryption Requirements:**
- At Rest: Required
- In Transit: TLS 1.3
- Algorithm: AES-256-GCM

**Examples:**
- Audit logs (anonymized)
- API response metadata
- System performance metrics
- Internal documentation

**Retention:** 10 years (3650 days)

---

### 3. Confidential
**Definition:** Sensitive information that contains PII or confidential business data, requiring strong protection.

**Characteristics:**
- Contains Personally Identifiable Information (PII)
- Healthcare consultation recordings (without specific diagnoses)
- User profile data
- Transcriptions of consultations
- AI-generated summaries

**Encryption Requirements:**
- At Rest: **Required** (AES-256-GCM)
- In Transit: TLS 1.3
- Algorithm: AES-256-GCM with PBKDF2-SHA256 key derivation (100,000 iterations)

**Examples:**
- Recording files
- Transcription text
- User email addresses and contact information
- Chat conversations
- GDPR export data

**Retention:** 7 years (2555 days) - meets healthcare record retention requirements

**Auto-Classification Triggers:**
- Detection of email addresses
- Detection of phone numbers
- Detection of names with contact information
- Any recording or transcription data by default

---

### 4. Restricted
**Definition:** Highly sensitive information containing Protected Health Information (PHI) or requiring the highest level of protection.

**Characteristics:**
- Contains Protected Health Information (PHI)
- Medical diagnoses and treatment information
- Sensitive medical procedures or conditions
- Consent records with legal implications
- Combination of PII + medical context

**Encryption Requirements:**
- At Rest: **Required** (AES-256-GCM)
- In Transit: TLS 1.3
- Algorithm: AES-256-GCM with PBKDF2-SHA256 key derivation (100,000 iterations)
- Additional: Encrypted backups, secure deletion procedures

**Examples:**
- Recordings mentioning specific diagnoses or treatments
- Medical record numbers combined with health information
- BSN (Burger Service Nummer) in medical context
- Consent records and legal documentation

**Retention:** 10 years (3650 days) for consent records, 7 years for other PHI

**Auto-Classification Triggers:**
- Detection of medical keywords (diagnose, behandeling, medicijn, patiënt, etc.)
- Detection of BSN or medical record numbers
- Detection of PII + medical context
- Explicit classification by healthcare provider

---

## Automatic Classification Logic

### Recording Classification Algorithm

The system automatically classifies recordings using the following logic:

```
1. Check for explicit classification (user-specified)
   └─> If present, use explicit classification

2. Check organization-specific classification policy
   └─> If policy exists, use policy default

3. Analyze content (if available):
   a. Run PII detection
   b. Run PHI detection (medical keywords + context)
   c. Run financial data detection
   
4. Apply classification rules:
   - If PHI detected → RESTRICTED
   - If PII detected and current level < CONFIDENTIAL → CONFIDENTIAL
   - If financial data detected and current level < CONFIDENTIAL → CONFIDENTIAL
   - If recording/transcription type → minimum CONFIDENTIAL
   
5. Default fallback:
   - Recording/Transcription → CONFIDENTIAL
   - User Profile → CONFIDENTIAL
   - Chat Message → CONFIDENTIAL
   - Consent Record → RESTRICTED
   - API Response → INTERNAL
   - Audit Log → INTERNAL
   - Export Data → CONFIDENTIAL
```

### PII Detection

The system detects the following types of PII:
- Email addresses
- Phone numbers (Dutch formats: +31 or 0 prefix)
- BSN (Burger Service Nummer) with elfproef validation
- Credit card numbers
- Medical record numbers
- Dates of birth
- Dutch addresses
- IP addresses

### PHI Detection

PHI is identified through:
1. **Medical keyword detection** (Dutch & English):
   - Diagnose, behandeling, medicijn, patiënt, arts, tandarts
   - Medical procedures and terminology
   - Healthcare facility names (ziekenhuis, kliniek, apotheek)

2. **Medical PII types:**
   - BSN in medical context
   - Medical record numbers
   - Combination of PII + medical keywords

### Financial Data Detection

Financial data is identified through:
- IBAN numbers (Dutch format: NL + account numbers)
- Account numbers
- Currency amounts (EUR, €)
- Financial keywords (betaling, factuur, rekening)

---

## Encryption Implementation

### Encryption at Rest

**Algorithm:** AES-256-GCM (Galois/Counter Mode)
**Key Derivation:** PBKDF2-SHA256 with 100,000 iterations
**Master Key:** Stored in `ENCRYPTION_MASTER_KEY` environment variable

**Process:**
1. Generate random salt (32 bytes)
2. Derive encryption key from master key using PBKDF2
3. Generate random IV (initialization vector, 16 bytes)
4. Encrypt data using AES-256-GCM
5. Generate authentication tag for integrity verification
6. Combine: salt + IV + encrypted data + auth tag
7. Encode result as base64

**Storage:**
- Encrypted files stored in Vercel Blob with private access
- Encryption metadata stored in database
- `isEncrypted` flag indicates encryption status

### Encryption in Transit

**Protocol:** TLS 1.3 (minimum TLS 1.2)
**Coverage:** All API endpoints and data transfers

---

## Classification Policies

### Policy Structure

Classification policies define default behaviors for each data type:

```typescript
interface ClassificationPolicy {
  name: string;
  description: string;
  dataType: DataType;
  defaultClassificationLevel: DataClassificationLevel;
  requiresEncryptionAtRest: boolean;
  requiresEncryptionInTransit: boolean;
  encryptionAlgorithm: string;
  retentionPeriodDays?: number;
  policyRules: Record<string, unknown>;
  isActive: boolean;
  organizationId?: string; // null for global policies
}
```

### Default Policies

#### Recording Data Policy
- **Classification:** Confidential
- **Encryption at Rest:** Required (AES-256-GCM)
- **Encryption in Transit:** Required (TLS 1.3)
- **Retention:** 7 years (2555 days)
- **Special Rules:**
  - Auto-classify on upload
  - Require consent
  - Automatic PII/PHI detection
  - Escalate to Restricted if PHI detected

#### Transcription Data Policy
- **Classification:** Confidential
- **Encryption at Rest:** Required (AES-256-GCM)
- **Encryption in Transit:** Required (TLS 1.3)
- **Retention:** 7 years (2555 days)
- **Special Rules:**
  - Auto-classify on creation
  - PII detection required
  - Escalate to Restricted if PHI detected

#### User Profile Policy
- **Classification:** Confidential
- **Encryption at Rest:** Required (AES-256-GCM)
- **Encryption in Transit:** Required (TLS 1.3)
- **Retention:** 7 years (2555 days)
- **Special Rules:**
  - Require consent
  - GDPR compliant handling

#### Consent Record Policy
- **Classification:** Restricted
- **Encryption at Rest:** Required (AES-256-GCM)
- **Encryption in Transit:** Required (TLS 1.3)
- **Retention:** 10 years (3650 days)
- **Special Rules:**
  - Immutable records
  - Audit log required
  - Legal hold capability

#### Chat Message Policy
- **Classification:** Confidential
- **Encryption at Rest:** Required (AES-256-GCM)
- **Encryption in Transit:** Required (TLS 1.3)
- **Retention:** 7 years (2555 days)
- **Special Rules:**
  - Auto-classify messages
  - PII detection required

#### Audit Log Policy
- **Classification:** Internal
- **Encryption at Rest:** Required (AES-256-GCM)
- **Encryption in Transit:** Required (TLS 1.3)
- **Retention:** 10 years (3650 days)
- **Special Rules:**
  - Immutable records
  - Tamper-proof (hash chain)
  - PII anonymization for logging

#### Export Data Policy (GDPR)
- **Classification:** Confidential
- **Encryption at Rest:** Required (AES-256-GCM)
- **Encryption in Transit:** Required (TLS 1.3)
- **Retention:** 7 days
- **Special Rules:**
  - Short retention period
  - Auto-delete after expiration
  - Secure download only

---

## Implementation Guide

### Classifying Data on Upload

When uploading a recording:

```typescript
// 1. Determine classification
const encryptionDecision = await EncryptionPolicyService.determineEncryptionPolicy({
  dataType: "recording",
  organizationId: user.organizationId,
  metadata: {
    fileName: file.name,
    fileSize: file.size,
    fileMimeType: file.type,
    projectId,
    consentGiven,
  },
});

// 2. Apply encryption if required
if (encryptionDecision.value.policy.shouldEncrypt) {
  fileToUpload = encryptFile(fileBuffer);
}

// 3. Store with classification metadata
await RecordingService.createRecording({
  // ... other fields
  dataClassificationLevel: classification.level,
  classificationMetadata: classification.metadata,
  classifiedAt: new Date(),
  isEncrypted: shouldEncrypt,
  encryptionMetadata,
});

// 4. Store classification audit record
await DataClassificationService.storeClassification(
  recordingId,
  "recording",
  classification,
  organizationId,
  userId
);
```

### Classifying Transcriptions

When transcription text is available:

```typescript
const encryptionDecision = await EncryptionPolicyService.determineEncryptionPolicy({
  dataType: "transcription",
  content: transcriptionText, // Analyze content for PII/PHI
  organizationId,
  metadata: {
    recordingId,
    language,
  },
});

// Store classification
await DataClassificationService.storeClassification(
  transcriptionId,
  "transcription",
  encryptionDecision.value.classification,
  organizationId,
  userId
);
```

### API Response Classification

API responses are classified based on their content:

```typescript
// Example: Recording detail endpoint
const recording = await getRecording(id);

// Response includes classification metadata
return {
  ...recording,
  _classification: {
    level: recording.dataClassificationLevel,
    requiresEncryption: recording.isEncrypted,
    classifiedAt: recording.classifiedAt,
  },
};
```

---

## Compliance Mapping

### AVG/GDPR Compliance

| Classification | GDPR Article | Requirement |
|----------------|--------------|-------------|
| Public | N/A | No special requirements |
| Internal | Art. 32 | Technical and organizational measures |
| Confidential | Art. 32, 34 | Encryption, pseudonymization, breach notification |
| Restricted | Art. 9, 32 | Special category data, highest protection |

### NEN 7510 Compliance

| Classification | NEN 7510 Measure | Implementation |
|----------------|------------------|----------------|
| Public | Basic access control | Standard authentication |
| Internal | Access logging | Audit log with anonymization |
| Confidential | Encryption + access control | AES-256-GCM + RBAC |
| Restricted | Maximum security | AES-256-GCM + audit + consent tracking |

### Healthcare-Specific Requirements

**Recording Retention:**
- Healthcare records: 7 years minimum (meets Dutch Wkkgz requirements)
- Consent records: 10 years (legal documentation)
- Audit logs: 10 years (compliance verification)

**PHI Protection:**
- Automatic detection and classification
- Mandatory encryption at rest
- Consent tracking for all PHI
- Right to be forgotten implementation
- Secure deletion with 30-day recovery window

---

## Security Controls by Classification

### Public
- ✅ Authentication required for API access
- ✅ TLS 1.3 in transit
- ❌ No encryption at rest
- ❌ No special retention policy

### Internal
- ✅ Authentication required
- ✅ Organization isolation
- ✅ TLS 1.3 in transit
- ✅ AES-256-GCM at rest
- ✅ 10-year retention
- ✅ Audit logging

### Confidential
- ✅ Authentication required
- ✅ Organization isolation
- ✅ Role-based access control
- ✅ TLS 1.3 in transit
- ✅ AES-256-GCM at rest
- ✅ 7-year retention
- ✅ PII detection and redaction capability
- ✅ Audit logging
- ✅ GDPR export/deletion support

### Restricted
- ✅ Authentication required
- ✅ Organization isolation
- ✅ Role-based access control
- ✅ TLS 1.3 in transit
- ✅ AES-256-GCM at rest
- ✅ 7-10 year retention
- ✅ PHI detection and protection
- ✅ Mandatory consent tracking
- ✅ Audit logging with tamper-proofing
- ✅ GDPR export/deletion support
- ✅ Secure deletion procedures

---

## Database Schema

### recordings table

New fields added for classification:

```sql
-- Data classification fields
data_classification_level TEXT NOT NULL DEFAULT 'confidential',
classification_metadata JSONB,
classified_at TIMESTAMP WITH TIME ZONE
```

### data_classifications table

Comprehensive classification audit trail:

```sql
CREATE TABLE data_classifications (
  id UUID PRIMARY KEY,
  data_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  classification_level TEXT NOT NULL,
  requires_encryption BOOLEAN NOT NULL DEFAULT true,
  encryption_algorithm TEXT,
  retention_period_days INTEGER,
  classification_reason TEXT,
  classification_metadata JSONB,
  has_pii BOOLEAN NOT NULL DEFAULT false,
  has_phi BOOLEAN NOT NULL DEFAULT false,
  has_financial_data BOOLEAN NOT NULL DEFAULT false,
  detected_pii_types JSONB,
  classified_by_id TEXT,
  classified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### classification_policies table

Policy configuration for each data type:

```sql
CREATE TABLE classification_policies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  data_type TEXT NOT NULL,
  default_classification_level TEXT NOT NULL,
  requires_encryption_at_rest BOOLEAN NOT NULL DEFAULT true,
  requires_encryption_in_transit BOOLEAN NOT NULL DEFAULT true,
  encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  retention_period_days INTEGER,
  policy_rules JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  organization_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

---

## API Response Classification

All API responses include classification metadata when returning sensitive data:

### Recording Response

```json
{
  "id": "uuid",
  "title": "Consultation Recording",
  "dataClassificationLevel": "confidential",
  "isEncrypted": true,
  "classificationMetadata": {
    "hasPII": true,
    "hasPHI": false,
    "hasFinancialData": false,
    "confidenceScore": 0.95
  },
  "classifiedAt": "2026-02-24T12:00:00Z"
}
```

### Transcription Response

```json
{
  "id": "uuid",
  "recordingId": "uuid",
  "text": "[REDACTED]",
  "redactedText": "Patient discussed [REDACTED] with Dr. [REDACTED]",
  "dataClassificationLevel": "restricted",
  "classificationMetadata": {
    "hasPII": true,
    "hasPHI": true,
    "detectedPIITypes": [
      {"type": "email", "confidence": 0.95},
      {"type": "medical_record", "confidence": 0.85}
    ]
  }
}
```

---

## Encryption Configuration

### Environment Variables

Required environment variables for encryption:

```bash
# Enable encryption at rest
ENABLE_ENCRYPTION_AT_REST=true

# Master encryption key (64+ characters, random)
ENCRYPTION_MASTER_KEY=your-secure-random-key-here

# OAuth token encryption (64 hex characters)
OAUTH_ENCRYPTION_KEY=your-oauth-encryption-key-here

# Session encryption
BETTER_AUTH_SECRET=your-better-auth-secret-here

# Optional: PII anonymization for logging
PII_ANONYMIZATION_SECRET=your-pii-anonymization-secret-here
```

### Key Management

**Master Key Requirements:**
- Minimum 256 bits (32 bytes) of entropy
- Stored in secure environment variables
- Never committed to version control
- Rotated according to security policy
- Backed up in secure key management system

**Key Rotation:**
- Keys should be rotated annually or after suspected compromise
- Historical keys must be retained for decryption of existing data
- Implement key versioning in encryption metadata

---

## Monitoring and Compliance

### Encryption Compliance Audit

Run regular compliance audits:

```typescript
const audit = await EncryptionPolicyService.auditEncryptionCompliance(organizationId);

// Returns:
// - totalRecords: number
// - encrypted: number
// - unencrypted: number
// - requiresEncryption: number
// - complianceRate: number (percentage)
// - nonCompliantRecords: Array<{id, dataType, classificationLevel, reason}>
```

### Validation

Validate encryption configuration:

```typescript
const validation = EncryptionPolicyService.validateEncryptionConfiguration();

// Returns:
// - isValid: boolean
// - warnings: string[]
// - recommendations: string[]
```

### Audit Logging

All classification and encryption operations are logged:
- Data classification decisions
- Encryption operations
- Policy changes
- Compliance violations
- Access to sensitive data

---

## Data Lifecycle

### Creation
1. Data uploaded/created
2. Automatic classification performed
3. Encryption policy determined
4. Encryption applied (if required)
5. Classification metadata stored
6. Audit log created

### Access
1. Authentication verified
2. Authorization checked (RBAC)
3. Classification level verified
4. Decryption performed (if encrypted)
5. Access logged in audit trail

### Modification
1. Re-classification triggered
2. Encryption status validated
3. Changes logged
4. Classification metadata updated

### Deletion
1. GDPR deletion request initiated
2. 30-day recovery window
3. Secure deletion (crypto-shredding for encrypted data)
4. Anonymization of related records
5. Deletion logged in audit trail

---

## Best Practices

### For Developers

1. **Always classify data explicitly** when creating new data types
2. **Never bypass classification** - use the classification service for all data
3. **Respect classification levels** in access control logic
4. **Log classification decisions** for audit purposes
5. **Validate encryption configuration** before enabling in production
6. **Test with realistic data** that contains PII/PHI patterns

### For Organizations

1. **Review classification policies** annually
2. **Customize policies** per organization needs (if required)
3. **Monitor compliance rates** through regular audits
4. **Train staff** on data classification requirements
5. **Document exceptions** when using lower classification levels
6. **Maintain encryption keys** securely with proper backup/rotation

### For Healthcare Users

1. **Ensure consent** is obtained before recording
2. **Verify encryption** is enabled for PHI
3. **Review classifications** of sensitive recordings
4. **Use redaction features** for additional privacy protection
5. **Follow retention policies** for medical records
6. **Report suspected breaches** immediately

---

## Troubleshooting

### Encryption Not Applied

**Symptom:** Data classified as Confidential/Restricted but not encrypted

**Causes:**
1. `ENABLE_ENCRYPTION_AT_REST` not set to `true`
2. `ENCRYPTION_MASTER_KEY` not configured
3. Classification performed after data storage

**Resolution:**
```bash
# Set environment variables
export ENABLE_ENCRYPTION_AT_REST=true
export ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)

# Re-classify and re-encrypt existing data
npm run scripts:reclassify-recordings
```

### Classification Mismatched

**Symptom:** Data classified incorrectly (too high or too low)

**Causes:**
1. False positive PII/PHI detection
2. Missing content for analysis
3. Outdated classification policy

**Resolution:**
1. Review classification metadata
2. Manually reclassify using admin API
3. Update classification policies if needed
4. Report false positives for pattern refinement

### Performance Impact

**Symptom:** Slow upload/download performance

**Causes:**
1. Encryption/decryption overhead
2. Large file sizes
3. Content analysis processing time

**Resolution:**
1. Enable encryption only for required classifications
2. Use streaming for large files
3. Offload classification to background jobs for non-critical paths
4. Cache classification results

---

## API Reference

### DataClassificationService

```typescript
// Classify data
const result = await DataClassificationService.classifyData({
  dataType: "recording",
  content: optionalContent,
  metadata: { /* context */ },
  organizationId: org.id,
  explicitClassification: optionalLevel,
});

// Store classification
await DataClassificationService.storeClassification(
  resourceId,
  dataType,
  classificationResult,
  organizationId,
  userId
);

// Get classification
const classification = await DataClassificationService.getClassification(
  resourceId,
  dataType
);

// Get encryption requirements
const encryption = DataClassificationService.getEncryptionRequirements(level);
```

### EncryptionPolicyService

```typescript
// Determine encryption policy
const decision = await EncryptionPolicyService.determineEncryptionPolicy({
  dataType: "recording",
  content: optionalContent,
  organizationId: org.id,
});

// Validate configuration
const validation = EncryptionPolicyService.validateEncryptionConfiguration();

// Audit compliance
const audit = await EncryptionPolicyService.auditEncryptionCompliance(orgId);

// Get algorithm details
const details = EncryptionPolicyService.getAlgorithmDetails("AES-256-GCM");
```

---

## Testing

### Unit Tests

Test classification logic:

```typescript
describe("DataClassificationService", () => {
  it("should classify recording with PII as confidential", async () => {
    const result = await DataClassificationService.classifyData({
      dataType: "recording",
      content: "Patient email: test@example.com",
      organizationId: "test-org",
    });
    
    expect(result.value.level).toBe("confidential");
    expect(result.value.metadata.hasPII).toBe(true);
  });

  it("should classify content with PHI as restricted", async () => {
    const result = await DataClassificationService.classifyData({
      dataType: "transcription",
      content: "Patient diagnosed with diabetes, BSN: 123456789",
      organizationId: "test-org",
    });
    
    expect(result.value.level).toBe("restricted");
    expect(result.value.metadata.hasPHI).toBe(true);
  });
});
```

### Integration Tests

Test end-to-end classification flow:

```typescript
describe("Recording Upload with Classification", () => {
  it("should classify and encrypt confidential recording", async () => {
    const result = await uploadRecording({
      file: testFile,
      projectId: "test-project",
      organizationId: "test-org",
    });

    expect(result.dataClassificationLevel).toBe("confidential");
    expect(result.isEncrypted).toBe(true);
  });
});
```

---

## References

- **SSD-4.2.01:** Data classification specification (Dutch healthcare security standards)
- **AVG/GDPR:** Articles 9, 32, 34 (Special categories, Security, Breach notification)
- **NEN 7510:** Dutch healthcare information security standard
- **NEN 7512:** Logging and monitoring (healthcare)
- **NEN 7513:** Access control (healthcare)
- **Wkkgz:** Dutch Healthcare Quality, Complaints and Disputes Act (retention requirements)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-24 | System | Initial data classification framework |

---

## Contact

For questions or issues regarding data classification:
- Security Team: security@inovy.app
- Compliance Officer: compliance@inovy.app
- Technical Support: support@inovy.app
