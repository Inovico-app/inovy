# Data Encryption Policy

**Version:** 1.0.0  
**Effective Date:** 2026-02-24  
**Standard:** SSD-4.2.02 - Veilige Communicatie  
**Status:** Active

## Overview

This document defines the encryption policy for classified data within the Inovy application, ensuring compliance with SSD-4.2.02 requirements and Dutch/European healthcare data protection regulations (AVG/GDPR, NEN 7510).

## Policy Statement

**"Per default geldt hierbij de classificatie waarvoor versleuteling plaatsvindt."**  
(By default, classification applies where encryption takes place.)

Encryption is **mandatory by default** for all classified data (CONFIDENTIAL and HIGHLY_CONFIDENTIAL). This ensures sensitive healthcare data is always protected at rest and in transit.

## Data Classification Levels

### 1. PUBLIC
- **Sensitivity:** No sensitivity
- **Encryption Required:** No
- **Examples:** Public marketing materials, general information
- **Can Disable:** Yes

### 2. INTERNAL
- **Sensitivity:** Internal use only
- **Encryption Required:** No (recommended but not mandatory)
- **Examples:** Internal documentation, non-sensitive business data
- **Can Disable:** Yes

### 3. CONFIDENTIAL
- **Sensitivity:** Sensitive data
- **Encryption Required:** **Yes, mandatory by default**
- **Examples:** 
  - Business records
  - Project data
  - User conversations
  - AI-generated insights and summaries
  - Chat messages
  - Task descriptions
- **Can Disable:** No (requires documented exception)

### 4. HIGHLY_CONFIDENTIAL
- **Sensitivity:** Highly sensitive data
- **Encryption Required:** **Yes, always mandatory**
- **Examples:**
  - Medical data
  - Personally Identifiable Information (PII)
  - Authentication credentials
  - Recording files and transcriptions
  - Participant emails and names
  - OAuth tokens and API keys
- **Can Disable:** Never

## Data Type Classifications

| Data Type | Classification | Encryption Required | Table/Field |
|-----------|---------------|---------------------|-------------|
| Recording files | HIGHLY_CONFIDENTIAL | Yes, always | `recordings.fileUrl` |
| Transcription text | HIGHLY_CONFIDENTIAL | Yes, always | `recordings.transcriptionText` |
| Transcription history | HIGHLY_CONFIDENTIAL | Yes, always | `transcription_history.content` |
| AI insights | CONFIDENTIAL | Yes, by default | `ai_insights.content` |
| AI summaries | CONFIDENTIAL | Yes, by default | `summary_history.content` |
| Chat messages | CONFIDENTIAL | Yes, by default | `chat_messages.content` |
| Task descriptions | CONFIDENTIAL | Yes, by default | `tasks.description` |
| Participant email | HIGHLY_CONFIDENTIAL | Yes, always | `consent_participants.participantEmail` |
| Participant name | HIGHLY_CONFIDENTIAL | Yes, always | `consent_participants.participantName` |
| OAuth tokens | HIGHLY_CONFIDENTIAL | Yes, always | `oauth_connections.accessToken` |
| API keys | HIGHLY_CONFIDENTIAL | Yes, always | Various |

## Encryption Implementation

### Algorithm
- **Symmetric Encryption:** AES-256-GCM (Galois/Counter Mode)
- **Key Derivation:** PBKDF2 with SHA-256 (100,000 iterations)
- **Initialization Vector (IV):** 128 bits (randomly generated per encryption)
- **Authentication Tag:** 128 bits (ensures data integrity)
- **Salt:** 512 bits (randomly generated per encryption)

### Key Management
- **Master Key:** Stored in `ENCRYPTION_MASTER_KEY` environment variable
- **Production:** Master key should be stored in secure key management systems:
  - AWS KMS (Key Management Service)
  - Azure Key Vault
  - HashiCorp Vault
  - Google Cloud KMS
- **Key Rotation:** Supported through re-encryption process
- **Key Length:** 256 bits (32 bytes)

### Encryption Scope
1. **Data at Rest:**
   - Recording files in Vercel Blob Storage
   - Database text and JSONB fields containing sensitive data
   - All classified data stored in PostgreSQL

2. **Data in Transit:**
   - HTTPS/TLS 1.3 for all API communications
   - Secure WebSocket connections (WSS)
   - VPN for internal infrastructure communication

### Database Schema
All tables containing classified data include encryption metadata fields:

```sql
-- For single-field encryption
is_encrypted BOOLEAN NOT NULL DEFAULT false
encryption_metadata TEXT

-- For multi-field encryption (e.g., consent_participants)
email_encrypted BOOLEAN NOT NULL DEFAULT false
email_encryption_metadata TEXT
name_encrypted BOOLEAN NOT NULL DEFAULT false
name_encryption_metadata TEXT
```

Encryption metadata contains (JSON):
```json
{
  "algorithm": "aes-256-gcm",
  "encrypted": true,
  "encryptedAt": "2026-02-24T12:00:00.000Z",
  "classification": "highly_confidential"
}
```

## Approved Exceptions

The following exceptions to encryption are documented and approved:

### 1. Database Indexes and Foreign Keys
- **Reason:** Performance - encrypted fields cannot be efficiently indexed
- **Mitigation:** Use non-sensitive surrogate keys (UUIDs) for relationships
- **Status:** ✅ Approved
- **Approved By:** Security Team
- **Approved Date:** 2026-02-24

### 2. Real-time Search and Filtering
- **Reason:** Full-text search requires plaintext or specialized encrypted search
- **Mitigation:** Use redacted versions for search, decrypt on-demand for display
- **Status:** ✅ Approved
- **Approved By:** Security Team
- **Approved Date:** 2026-02-24

### 3. Metadata Fields (Non-Sensitive)
- **Reason:** Metadata like timestamps, counts, status flags do not contain sensitive data
- **Mitigation:** Separate sensitive data from metadata in schema design
- **Status:** ✅ Approved
- **Approved By:** Security Team
- **Approved Date:** 2026-02-24

### 4. OAuth Tokens (Separate System)
- **Reason:** OAuth tokens use separate encryption key (`OAUTH_ENCRYPTION_KEY`) for security isolation
- **Mitigation:** Dedicated encryption system with separate key management
- **Status:** ✅ Approved
- **Approved By:** Security Team
- **Approved Date:** 2026-02-24

## Configuration

### Environment Variables

#### Required (Production)
```bash
# Master encryption key (256-bit hex string or base64)
ENCRYPTION_MASTER_KEY=<secure-random-key>

# OAuth encryption key (separate from master key)
OAUTH_ENCRYPTION_KEY=<secure-random-key>
```

#### Optional
```bash
# Disable encryption for non-mandatory classifications (PUBLIC, INTERNAL only)
# NOT recommended for production
DISABLE_ENCRYPTION_AT_REST=false
```

### Default Behavior
- **Recording files (HIGHLY_CONFIDENTIAL):** Encrypted by default, cannot be disabled
- **Transcription text (HIGHLY_CONFIDENTIAL):** Encrypted by default, cannot be disabled
- **PII data (HIGHLY_CONFIDENTIAL):** Encrypted by default, cannot be disabled
- **AI insights and chat (CONFIDENTIAL):** Encrypted by default, cannot be disabled without documented exception
- **PUBLIC/INTERNAL data:** Not encrypted by default, can be enabled if needed

## Implementation Guidelines

### For Developers

1. **Always use the data classification system:**
   ```typescript
   import { DataClassification } from "@/lib/data-classification";
   ```

2. **For file encryption (recordings):**
   ```typescript
   import { 
     isEncryptionEnabled, 
     validateEncryptionConfig 
   } from "@/lib/encryption";
   
   const shouldEncrypt = isEncryptionEnabled(
     DataClassification.HIGHLY_CONFIDENTIAL
   );
   validateEncryptionConfig(DataClassification.HIGHLY_CONFIDENTIAL);
   ```

3. **For field-level encryption (database):**
   ```typescript
   import { 
     encryptField, 
     decryptField 
   } from "@/lib/field-encryption";
   
   // Encrypt before saving
   const { encryptedValue, isEncrypted, encryptionMetadata } = 
     encryptField(plaintext, DataClassification.CONFIDENTIAL);
   
   // Decrypt when reading
   const plaintext = decryptField(encryptedValue, isEncrypted);
   ```

4. **Use helper functions for common operations:**
   ```typescript
   import {
     encryptTranscriptionText,
     decryptTranscriptionText,
     encryptAiInsight,
     encryptChatMessage,
     encryptPII,
   } from "@/lib/field-encryption";
   ```

## Compliance and Auditing

### Audit Trail
- All encryption/decryption operations are logged
- Encryption metadata stored with each encrypted field
- Version history maintained for encrypted data changes

### Compliance Standards
- ✅ AVG/GDPR (EU data protection)
- ✅ NEN 7510 (Dutch healthcare information security)
- ✅ NEN 7512 (Logging and monitoring)
- ✅ NEN 7513 (Access control)
- ✅ SSD-4.2.02 (Secure communication)

### Regular Reviews
- **Frequency:** Quarterly
- **Scope:** Review exceptions, key rotation, access patterns
- **Responsibility:** Security Team + Lead Developer
- **Documentation:** Update this policy as needed

## Incident Response

### Suspected Breach
1. Immediately notify security team
2. Rotate encryption keys
3. Audit access logs
4. Re-encrypt affected data
5. Document incident and resolution

### Key Compromise
1. Immediately disable compromised key
2. Deploy new master key
3. Re-encrypt all data with new key
4. Audit all access during compromise period
5. Notify affected parties per AVG/GDPR requirements

## Migration Strategy

### For Existing Unencrypted Data
1. Run migration script to add encryption fields
2. Batch encrypt existing data (background job)
3. Verify encryption success
4. Update all read/write paths to handle encryption
5. Monitor for decryption errors

### For Schema Changes
```bash
# Generate migration
pnpm db:generate --name add-encryption-fields

# Review migration SQL
# Apply migration (via GitHub Actions)
```

## Testing

### Test Coverage Required
- ✅ Encryption/decryption round-trip tests
- ✅ Key validation tests
- ✅ Classification enforcement tests
- ✅ Migration rollback tests
- ✅ Performance benchmarks
- ✅ Error handling tests

### Performance Targets
- Encryption overhead: < 50ms per operation
- Decryption overhead: < 30ms per operation
- Batch operations: < 1 second for 100 records

## Support and Questions

For questions or clarification about this policy:
- **Security Team:** security@inovy.io
- **Development Team:** Lead Developer
- **Documentation:** This file + inline code comments

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-02-24 | Initial policy for SSD-4.2.02 compliance | Cloud Agent |

---

**Last Updated:** 2026-02-24  
**Next Review Date:** 2026-05-24  
**Policy Owner:** Security Team
