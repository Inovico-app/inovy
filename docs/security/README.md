# Security Documentation

This directory contains security and compliance documentation for the Inovy platform.

## Documents

### [Data Classification Framework](./DATA_CLASSIFICATION.md)
Comprehensive specification for data classification, including:
- Classification levels (Public, Internal, Confidential, Restricted)
- Automatic classification logic
- Encryption requirements per classification
- Compliance mapping (AVG/GDPR, NEN 7510)
- API reference and implementation guide

### [Encryption Implementation Guide](./ENCRYPTION_GUIDE.md)
Practical guide for implementing encryption:
- Quick reference decision matrix
- Code examples for common scenarios
- Encryption process details (AES-256-GCM)
- Security checklist
- Troubleshooting guide

## Quick Start

### For Developers

1. **Read** [Data Classification Framework](./DATA_CLASSIFICATION.md) to understand classification levels
2. **Review** [Encryption Guide](./ENCRYPTION_GUIDE.md) for implementation patterns
3. **Use** `DataClassificationService` for all new data types
4. **Test** with realistic PII/PHI data

### For Compliance

1. **Verify** encryption configuration is complete
2. **Run** compliance audits monthly
3. **Review** classification policies quarterly
4. **Document** any exceptions or deviations

### For Operations

1. **Monitor** encryption compliance rates
2. **Maintain** encryption key backups
3. **Rotate** keys annually
4. **Respond** to security incidents per documented procedures

## Key Services

### DataClassificationService
`apps/web/src/server/services/data-classification.service.ts`

Handles automatic data classification based on content analysis, PII/PHI detection, and organizational policies.

### EncryptionPolicyService
`apps/web/src/server/services/encryption-policy.service.ts`

Determines encryption requirements based on data classification and validates encryption configuration.

### PIIDetectionService
`apps/web/src/server/services/pii-detection.service.ts`

Detects Personally Identifiable Information (PII) and Protected Health Information (PHI) in text content.

## Database Schema

### New Tables

- `data_classifications` - Classification audit trail
- `classification_policies` - Policy definitions per data type

### Updated Tables

- `recordings` - Added `data_classification_level`, `classification_metadata`, `classified_at`

## Compliance References

- **SSD-4.2.01:** Data classification specification
- **AVG/GDPR:** Articles 9, 32, 34
- **NEN 7510:** Healthcare information security (Netherlands)
- **NEN 7512:** Logging and monitoring
- **NEN 7513:** Access control
- **Wkkgz:** Healthcare retention requirements (7 years)

## Support

For security questions or concerns:
- **Security Team:** security@inovy.app
- **Compliance:** compliance@inovy.app
- **Technical Support:** support@inovy.app

## Audit Schedule

- **Weekly:** Automated encryption compliance checks
- **Monthly:** Manual security review
- **Quarterly:** Classification policy review
- **Annually:** Full security audit, key rotation

## Incident Response

In case of a suspected security incident:
1. Immediately notify the security team
2. Document the incident details
3. Follow incident response procedures
4. Preserve audit logs
5. Coordinate with compliance officer for breach notification assessment

---

*Last Updated: 2026-02-24*
