export interface SubProcessor {
  name: string;
  purpose: string;
  dataLocation: string;
  verified: boolean;
}

export interface DpaContext {
  organizationName: string;
  generatedAt: Date;
  dataResidency: string;
  retentionPeriod: string;
  subProcessors: SubProcessor[];
  securityMeasures: string[];
  contactEmail: string;
}

export const SUB_PROCESSORS: SubProcessor[] = [
  {
    name: "Neon (PostgreSQL)",
    purpose: "Database",
    dataLocation: "EU (Frankfurt)",
    verified: true,
  },
  {
    name: "Qdrant",
    purpose: "Vector search",
    dataLocation: "EU (AWS Frankfurt)",
    verified: true,
  },
  {
    name: "Azure Blob Storage",
    purpose: "Opslag van opnames",
    dataLocation: "EU West",
    verified: true,
  },
  {
    name: "Recall.ai",
    purpose: "Vergaderbot",
    dataLocation: "EU Central",
    verified: true,
  },
  {
    name: "Deepgram",
    purpose: "Transcriptie",
    dataLocation: "Nader te verifiëren",
    verified: false,
  },
  {
    name: "Anthropic (Claude)",
    purpose: "AI-samenvatting",
    dataLocation: "Nader te verifiëren",
    verified: false,
  },
  {
    name: "Resend",
    purpose: "E-mail bezorging",
    dataLocation: "Nader te verifiëren",
    verified: false,
  },
];

export const SECURITY_MEASURES = [
  "Versleuteling in rust (AES-256)",
  "Versleuteling in transit (TLS 1.3)",
  "Automatische PII-detectie en -redactie",
  "Audit logging met tamper-proof hash chain",
  "Rolgebaseerde toegangscontrole (RBAC)",
  "Multi-factor authenticatie (MFA)",
  "Sessiebeveiliging met korte levensduur",
  "Gegevensretentiebeleid met automatische opschoning",
];

export const DPA_CONTACT_EMAIL = "privacy@inovico.nl";

export function buildDpaContext(
  organizationName: string,
  contactEmail: string,
): DpaContext {
  return {
    organizationName,
    generatedAt: new Date(),
    dataResidency: "Europese Unie",
    retentionPeriod: "Conform organisatie-instellingen (standaard: 1 jaar)",
    subProcessors: SUB_PROCESSORS,
    securityMeasures: SECURITY_MEASURES,
    contactEmail,
  };
}
