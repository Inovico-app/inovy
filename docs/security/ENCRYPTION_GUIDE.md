# Encryption Implementation Guide

## Quick Reference

This guide provides practical instructions for implementing encryption based on data classification.

## Classification-Based Encryption

### Decision Matrix

| Classification | At Rest | In Transit | Algorithm | Key Derivation |
|----------------|---------|------------|-----------|----------------|
| **Public** | ❌ No | ✅ TLS 1.3 | N/A | N/A |
| **Internal** | ✅ Yes | ✅ TLS 1.3 | AES-256-GCM | PBKDF2-SHA256 |
| **Confidential** | ✅ Yes | ✅ TLS 1.3 | AES-256-GCM | PBKDF2-SHA256 |
| **Restricted** | ✅ Yes | ✅ TLS 1.3 | AES-256-GCM | PBKDF2-SHA256 |

### Required Environment Variables

```bash
# Enable encryption at rest
ENABLE_ENCRYPTION_AT_REST=true

# Master encryption key (generate with: openssl rand -hex 32)
ENCRYPTION_MASTER_KEY=your-64-character-hex-key-here

# OAuth token encryption (generate with: openssl rand -hex 32)
OAUTH_ENCRYPTION_KEY=your-64-character-hex-key-here

# Session security
BETTER_AUTH_SECRET=your-better-auth-secret-here
```

## Implementation Examples

### Example 1: Recording Upload with Auto-Classification

```typescript
import { EncryptionPolicyService } from "@/server/services/encryption-policy.service";
import { DataClassificationService } from "@/server/services/data-classification.service";
import { encrypt } from "@/lib/encryption";

async function uploadRecording(file: File, organizationId: string, userId: string) {
  // Step 1: Determine classification and encryption policy
  const decision = await EncryptionPolicyService.determineEncryptionPolicy({
    dataType: "recording",
    organizationId,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      fileMimeType: file.type,
    },
  });

  if (decision.isErr()) {
    throw new Error("Classification failed");
  }

  const { policy, classification } = decision.value;

  // Step 2: Apply encryption if required
  let fileToUpload = file;
  let encryptionMetadata = null;

  if (policy.shouldEncrypt) {
    const fileBuffer = await file.arrayBuffer();
    const encrypted = encrypt(Buffer.from(fileBuffer));
    fileToUpload = Buffer.from(encrypted, "base64");
    encryptionMetadata = JSON.stringify({
      algorithm: "AES-256-GCM",
      encryptedAt: new Date().toISOString(),
    });
  }

  // Step 3: Upload with classification
  const blob = await uploadToBlob(fileToUpload);

  // Step 4: Store with classification metadata
  const recording = await RecordingService.createRecording({
    // ... other fields
    dataClassificationLevel: classification.level,
    classificationMetadata: classification.metadata,
    classifiedAt: new Date(),
    isEncrypted: policy.shouldEncrypt,
    encryptionMetadata,
  });

  // Step 5: Store audit record
  await DataClassificationService.storeClassification(
    recording.id,
    "recording",
    classification,
    organizationId,
    userId
  );

  return recording;
}
```

### Example 2: Transcription Classification with Content Analysis

```typescript
async function classifyTranscription(
  recordingId: string,
  transcriptionText: string,
  organizationId: string,
  userId: string
) {
  // Analyze transcription content for PII/PHI
  const decision = await EncryptionPolicyService.determineEncryptionPolicy({
    dataType: "transcription",
    content: transcriptionText, // Content analysis enabled
    organizationId,
    metadata: {
      recordingId,
      language: "nl",
    },
  });

  if (decision.isErr()) {
    throw new Error("Classification failed");
  }

  const { classification } = decision.value;

  // Log classification results
  console.log(`Classification: ${classification.level}`);
  console.log(`Has PII: ${classification.metadata.hasPII}`);
  console.log(`Has PHI: ${classification.metadata.hasPHI}`);
  console.log(`Reason: ${classification.reason}`);

  // Store classification
  await DataClassificationService.storeClassification(
    recordingId,
    "transcription",
    classification,
    organizationId,
    userId
  );

  // Apply redaction if PII/PHI detected
  if (classification.metadata.hasPII || classification.metadata.hasPHI) {
    await applyAutoRedaction(recordingId, classification.metadata.detectedPIITypes);
  }
}
```

### Example 3: Custom Organization Policy

```typescript
import { db } from "@/server/db";
import { classificationPolicies } from "@/server/db/schema/data-classification";

async function createCustomRecordingPolicy(organizationId: string) {
  // Create organization-specific policy (overrides global default)
  await db.insert(classificationPolicies).values({
    name: "Custom Recording Policy",
    description: "Stricter classification for specialized healthcare org",
    dataType: "recording",
    defaultClassificationLevel: "restricted", // Stricter than default
    requiresEncryptionAtRest: true,
    requiresEncryptionInTransit: true,
    encryptionAlgorithm: "AES-256-GCM",
    retentionPeriodDays: 3650, // 10 years instead of 7
    policyRules: {
      alwaysRestricted: true,
      requireDoubleConsent: true,
      mandatoryReview: true,
    },
    isActive: true,
    organizationId, // Organization-specific
  });
}
```

### Example 4: Compliance Audit

```typescript
async function runComplianceAudit(organizationId: string) {
  // Validate configuration
  const validation = EncryptionPolicyService.validateEncryptionConfiguration();
  
  if (!validation.value.isValid) {
    console.error("Encryption configuration issues:");
    validation.value.warnings.forEach(w => console.error(`- ${w}`));
    console.log("\nRecommendations:");
    validation.value.recommendations.forEach(r => console.log(`- ${r}`));
    return;
  }

  // Run compliance audit
  const audit = await EncryptionPolicyService.auditEncryptionCompliance(organizationId);
  
  if (audit.isErr()) {
    console.error("Audit failed:", audit.error);
    return;
  }

  const results = audit.value;
  
  console.log(`\nEncryption Compliance Report`);
  console.log(`Total Records: ${results.totalRecords}`);
  console.log(`Encrypted: ${results.encrypted}`);
  console.log(`Unencrypted: ${results.unencrypted}`);
  console.log(`Require Encryption: ${results.requiresEncryption}`);
  console.log(`Compliance Rate: ${results.complianceRate.toFixed(2)}%`);
  
  if (results.nonCompliantRecords.length > 0) {
    console.log(`\nNon-Compliant Records: ${results.nonCompliantRecords.length}`);
    results.nonCompliantRecords.forEach(record => {
      console.log(`- ${record.id}: ${record.reason}`);
    });
  }
}
```

## Encryption Process Details

### AES-256-GCM Encryption

**Step-by-step process:**

1. **Generate Salt** (32 bytes random)
   ```typescript
   const salt = crypto.randomBytes(32);
   ```

2. **Derive Key** (PBKDF2-SHA256, 100k iterations)
   ```typescript
   const key = crypto.pbkdf2Sync(
     masterKey,
     salt,
     100000,
     32,
     "sha256"
   );
   ```

3. **Generate IV** (16 bytes random)
   ```typescript
   const iv = crypto.randomBytes(16);
   ```

4. **Encrypt Data** (AES-256-GCM)
   ```typescript
   const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
   const encrypted = Buffer.concat([
     cipher.update(plaintext),
     cipher.final(),
   ]);
   const authTag = cipher.getAuthTag();
   ```

5. **Combine and Encode**
   ```typescript
   const combined = Buffer.concat([salt, iv, encrypted, authTag]);
   const base64 = combined.toString("base64");
   ```

### Decryption Process

```typescript
// Decode base64
const decoded = Buffer.from(base64, "base64");

// Extract components
const salt = decoded.slice(0, 32);
const iv = decoded.slice(32, 48);
const authTag = decoded.slice(-16);
const encrypted = decoded.slice(48, -16);

// Derive key
const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, "sha256");

// Decrypt
const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(authTag);
const decrypted = Buffer.concat([
  decipher.update(encrypted),
  decipher.final(),
]);
```

## Security Checklist

### Before Production

- [ ] `ENABLE_ENCRYPTION_AT_REST=true` configured
- [ ] `ENCRYPTION_MASTER_KEY` set with 64+ character random key
- [ ] Master key stored in secure key management system
- [ ] Key backup procedure documented
- [ ] Key rotation schedule established
- [ ] All confidential/restricted data types encrypted
- [ ] Compliance audit shows 100% encryption rate
- [ ] Access controls verified (RBAC)
- [ ] Audit logging enabled
- [ ] Incident response plan documented

### Regular Maintenance

- [ ] Monthly compliance audits
- [ ] Quarterly classification policy reviews
- [ ] Annual encryption key rotation
- [ ] Continuous monitoring of encryption failures
- [ ] Regular testing of decryption procedures
- [ ] Backup verification
- [ ] Staff training on data classification

## Common Issues

### Issue: "Encryption enabled but master key not configured"

**Fix:**
```bash
export ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)
```

### Issue: "Classification failed - no organization found"

**Fix:** Ensure user is authenticated and associated with an organization before upload.

### Issue: High false-positive PHI detection

**Fix:** Adjust medical keyword detection thresholds or implement organization-specific exclusion lists in classification policies.

---

## Performance Optimization

### For Large Files

1. **Stream encryption** instead of loading entire file into memory
2. **Defer classification** of content until transcription is available
3. **Cache classification results** for repeated access
4. **Use background jobs** for re-classification tasks

### For High Volume

1. **Batch classification** operations
2. **Index** on `data_classification_level` and `is_encrypted`
3. **Cache** classification policies
4. **Monitor** classification service performance

---

## Migration Guide

### Existing Data Without Classification

Run migration script to classify existing recordings:

```typescript
// scripts/classify-existing-recordings.ts
import { db } from "@/server/db";
import { recordings } from "@/server/db/schema/recordings";
import { DataClassificationService } from "@/server/services/data-classification.service";

async function classifyExistingRecordings() {
  const unclassified = await db
    .select()
    .from(recordings)
    .where(eq(recordings.classifiedAt, null));

  for (const recording of unclassified) {
    const decision = await EncryptionPolicyService.determineEncryptionPolicy({
      dataType: "recording",
      content: recording.transcriptionText || undefined,
      organizationId: recording.organizationId,
    });

    if (decision.isOk()) {
      await db.update(recordings)
        .set({
          dataClassificationLevel: decision.value.classification.level,
          classificationMetadata: decision.value.classification.metadata,
          classifiedAt: new Date(),
        })
        .where(eq(recordings.id, recording.id));

      await DataClassificationService.storeClassification(
        recording.id,
        "recording",
        decision.value.classification,
        recording.organizationId,
        recording.createdById
      );
    }
  }
}
```

---

## Additional Resources

- [Data Classification Framework](./DATA_CLASSIFICATION.md) - Complete specification
- [PII Detection Service](../../apps/web/src/server/services/pii-detection.service.ts) - PII/PHI detection implementation
- [Encryption Library](../../apps/web/src/lib/encryption.ts) - Core encryption utilities
- [NEN 7510 Compliance](./..) - Healthcare security compliance
