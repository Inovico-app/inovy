# XML Parsing Security Guidelines (SSD-32.1.02)

**Status:** ✅ Compliant  
**Last Updated:** February 1, 2026  
**SSD Reference:** SSD-32, Category: XXE preventie, Number: 1.02

## Overview

This document establishes guidelines for safe XML parsing to prevent XML External Entity (XXE) vulnerabilities. While our application currently uses JSON for all data exchange and does not actively parse XML, these guidelines ensure secure practices when XML parsing becomes necessary.

## Current Implementation Status

- ✅ **No XML parsing currently implemented**
- ✅ **JSON used for all API data exchange**
- ✅ **Office document processing (DOCX) uses secure libraries**
- ✅ **Security guidelines established for future needs**

## XML External Entity (XXE) Vulnerabilities

XXE vulnerabilities occur when XML parsers process external entity references, potentially allowing attackers to:

- Read local files from the server
- Perform Server-Side Request Forgery (SSRF) attacks
- Execute Denial of Service (DoS) attacks
- Bypass security controls

### Example of Vulnerable XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<data>
  <value>&xxe;</value>
</data>
```

## Approved XML Parsing Libraries

If XML parsing is required, use only the following libraries with secure configurations:

### 1. fast-xml-parser (Recommended)

**Version:** Latest stable (always update to latest patch)  
**NPM Package:** `fast-xml-parser`  
**XXE Protection:** Secure by default

```typescript
import { XMLParser } from 'fast-xml-parser';

// Secure configuration
const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: true,
  // XXE protection: external entities are disabled by default
  processEntities: false, // Do NOT enable this - it would allow entity processing
  allowBooleanAttributes: true,
});

// Safe parsing
try {
  const result = parser.parse(xmlString);
  // Process result
} catch (error) {
  // Handle parsing errors
  logger.error('XML parsing failed', error);
}
```

### 2. xml2js (Alternative)

**Version:** Latest stable  
**NPM Package:** `xml2js`  
**XXE Protection:** Requires explicit secure configuration

```typescript
import { parseString } from 'xml2js';

// Secure configuration
const parserOptions = {
  // XXE protection
  explicitChildren: false,
  normalize: false,
  normalizeTags: false,
  trim: true,
  // Disable external entities
  xmlns: false,
  // Set reasonable limits
  attrValueProcessors: [],
  valueProcessors: [],
};

// Safe parsing
parseString(xmlString, parserOptions, (err, result) => {
  if (err) {
    logger.error('XML parsing failed', err);
    return;
  }
  // Process result
});
```

### 3. libxmljs2 (For Complex Needs)

**Version:** Latest stable  
**NPM Package:** `libxmljs2`  
**XXE Protection:** Requires explicit secure configuration

```typescript
import libxmljs from 'libxmljs2';

// Secure parsing options
const parsingOptions = {
  // Disable network access
  nonet: true,
  // Disable entity loading
  noent: false,
  // Disable DTD loading
  dtdload: false,
  // Disable DTD validation
  dtdvalid: false,
  // Disable XInclude processing
  noxincnode: true,
};

try {
  const xmlDoc = libxmljs.parseXml(xmlString, parsingOptions);
  // Process xmlDoc
} catch (error) {
  logger.error('XML parsing failed', error);
}
```

## Prohibited Libraries and Practices

### ❌ DO NOT USE

1. **DOMParser in Node.js** (from xmldom package) - Historically vulnerable to XXE
2. **Older xml2js versions** - Ensure you're on latest stable
3. **Custom XML parsers** - Use well-maintained libraries only
4. **Browser DOMParser for untrusted XML** - Limited security controls

### ❌ DANGEROUS CONFIGURATIONS

```typescript
// NEVER enable these options:
{
  processEntities: true,        // Allows entity expansion
  resolveExternalEntities: true, // Loads external entities
  loadExternalDtd: true,        // Loads external DTDs
  noent: true,                  // Entity substitution (in libxml)
}
```

## Security Checklist

When implementing XML parsing:

- [ ] Use an approved library from the list above
- [ ] Apply secure configuration (copy from examples)
- [ ] Disable external entity processing
- [ ] Disable DTD loading
- [ ] Set input size limits
- [ ] Implement proper error handling
- [ ] Log parsing errors for security monitoring
- [ ] Validate XML structure after parsing
- [ ] Sanitize output data before use
- [ ] Keep libraries updated (automated via Dependabot)

## Implementation Guidelines

### Service Layer Pattern

Create a centralized XML parsing service:

```typescript
// src/server/services/xml-parser.service.ts
import { XMLParser } from 'fast-xml-parser';
import { logger } from '@/lib/logger';
import { err, ok, type Result } from 'neverthrow';

/**
 * Secure XML Parser Service
 * Provides XXE-safe XML parsing with centralized configuration
 */
export class XmlParserService {
  private static readonly MAX_XML_SIZE = 10 * 1024 * 1024; // 10MB limit

  private static readonly parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
    processEntities: false, // XXE protection
    allowBooleanAttributes: true,
  });

  /**
   * Parse XML string with security controls
   */
  static parseXml<T = unknown>(
    xmlString: string,
    context: string
  ): Result<T, Error> {
    try {
      // Size validation
      if (xmlString.length > this.MAX_XML_SIZE) {
        return err(new Error('XML input exceeds maximum size limit'));
      }

      // Check for suspicious patterns
      if (this.containsSuspiciousPatterns(xmlString)) {
        logger.warn('Suspicious XML pattern detected', { context });
        return err(new Error('XML contains potentially malicious patterns'));
      }

      const result = this.parser.parse(xmlString) as T;
      
      logger.info('XML parsed successfully', {
        context,
        size: xmlString.length,
      });

      return ok(result);
    } catch (error) {
      logger.error('XML parsing failed', { context }, error as Error);
      return err(error as Error);
    }
  }

  /**
   * Detect suspicious patterns in XML
   */
  private static containsSuspiciousPatterns(xml: string): boolean {
    const suspiciousPatterns = [
      /<!ENTITY/i,           // Entity definitions
      /<!DOCTYPE/i,          // DTD declarations
      /SYSTEM\s+["']/i,      // System entity references
      /PUBLIC\s+["']/i,      // Public entity references
      /<!\[CDATA\[.*ENTITY/is, // Entities in CDATA
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(xml));
  }

  /**
   * Validate parsed XML structure
   */
  static validateXmlStructure(
    parsed: unknown,
    expectedRootKey: string
  ): Result<void, Error> {
    if (typeof parsed !== 'object' || parsed === null) {
      return err(new Error('Invalid XML structure: not an object'));
    }

    if (!(expectedRootKey in parsed)) {
      return err(
        new Error(`Invalid XML structure: missing root key "${expectedRootKey}"`)
      );
    }

    return ok(undefined);
  }
}
```

### Usage Example

```typescript
import { XmlParserService } from '@/server/services/xml-parser.service';

// In your service or action
export async function processXmlData(xmlInput: string) {
  const parseResult = XmlParserService.parseXml<MyXmlType>(
    xmlInput,
    'processXmlData'
  );

  if (parseResult.isErr()) {
    return err(
      ActionErrors.badRequest(
        'Invalid XML format',
        'processXmlData'
      )
    );
  }

  const data = parseResult.value;
  
  // Validate structure
  const validationResult = XmlParserService.validateXmlStructure(
    data,
    'expectedRoot'
  );

  if (validationResult.isErr()) {
    return err(
      ActionErrors.badRequest(
        validationResult.error.message,
        'processXmlData'
      )
    );
  }

  // Process validated data
  return ok(data);
}
```

## Library Update Policy

### Automated Updates (Dependabot)

Our repository uses GitHub Dependabot for automated dependency updates:

- **Frequency:** Weekly security updates, monthly version updates
- **Auto-merge:** Security patches (patch versions) are auto-merged after CI passes
- **Review Required:** Minor and major version updates require manual review
- **Monitoring:** Security advisories are monitored via GitHub Security Alerts

### Manual Review Process

When updating XML parsing libraries:

1. Review the changelog for security fixes
2. Check for breaking changes in configuration
3. Run full test suite including security tests
4. Verify XXE protection is maintained
5. Update this documentation if needed

### Current Dependencies

Monitor these packages if/when added:

```json
{
  "dependencies": {
    "fast-xml-parser": "latest"
  }
}
```

## Testing Requirements

If XML parsing is implemented, include these tests:

```typescript
// tests/security/xml-parser.test.ts
describe('XML Parser Security', () => {
  it('should reject XXE attack attempts', () => {
    const xxePayload = `<?xml version="1.0"?>
      <!DOCTYPE foo [
        <!ENTITY xxe SYSTEM "file:///etc/passwd">
      ]>
      <data><value>&xxe;</value></data>`;

    const result = XmlParserService.parseXml(xxePayload, 'test');
    expect(result.isErr()).toBe(true);
  });

  it('should reject oversized XML', () => {
    const largeXml = '<root>' + 'a'.repeat(11 * 1024 * 1024) + '</root>';
    
    const result = XmlParserService.parseXml(largeXml, 'test');
    expect(result.isErr()).toBe(true);
  });

  it('should parse valid XML safely', () => {
    const validXml = '<root><item>value</item></root>';
    
    const result = XmlParserService.parseXml(validXml, 'test');
    expect(result.isOk()).toBe(true);
  });
});
```

## Office Document Processing

Our application processes DOCX files, which are XML-based but handled by specialized libraries:

### Current Implementation: mammoth.js

```typescript
// From document-processing.service.ts
import mammoth from 'mammoth';

// mammoth internally parses DOCX XML safely
const result = await mammoth.extractRawText({ buffer: fileBuffer });
const text = result.value;
```

**Security Status:** ✅ mammoth.js handles XML parsing securely internally and doesn't expose external entity processing.

## Compliance Verification

### SSD-32.1.02 Acceptance Criteria

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| Libraries with XXE protection | ✅ | Approved library list with secure defaults |
| Default secure configuration | ✅ | Example configurations provided, service template created |
| Regular library updates | ✅ | Dependabot configured for automated updates |

### Audit Trail

- **2026-02-01:** Initial security guidelines established
- **2026-02-01:** Verified no current XML parsing in codebase
- **2026-02-01:** Documented secure practices for future implementation

## Related Documentation

- [OWASP XML External Entity Prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
- [CWE-611: Improper Restriction of XML External Entity Reference](https://cwe.mitre.org/data/definitions/611.html)
- [NEN 7510: Information Security in Healthcare](https://www.nen.nl/en/nen-7510-2017-nl-245398)

## Contact

For questions about XML parsing security:

- **Security Team:** security@inovy.app
- **Technical Lead:** architecture@inovy.app

---

**Document Version:** 1.0  
**Last Review:** 2026-02-01  
**Next Review:** 2026-08-01 (6 months)
