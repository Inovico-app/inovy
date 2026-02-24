import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  dataClassifications,
  classificationPolicies,
  type DataClassificationLevel,
  type DataType,
  type NewDataClassification,
  type NewClassificationPolicy,
} from "@/server/db/schema/data-classification";
import { PIIDetectionService, type PIIDetection } from "./pii-detection.service";
import { logger } from "@/lib/logger";
import { type Result, ok, err } from "neverthrow";

export interface ClassificationResult {
  level: DataClassificationLevel;
  requiresEncryption: boolean;
  encryptionAlgorithm: string;
  retentionPeriodDays?: number;
  reason: string;
  metadata: {
    hasPII: boolean;
    hasPHI: boolean;
    hasFinancialData: boolean;
    detectedPIITypes?: PIIDetection[];
    confidenceScore: number;
  };
}

export interface ClassificationContext {
  dataType: DataType;
  content?: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  explicitClassification?: DataClassificationLevel;
}

export class DataClassificationService {
  private static readonly CLASSIFICATION_RULES = {
    public: {
      level: "public" as const,
      requiresEncryption: false,
      encryptionAlgorithm: "none",
      description: "Non-sensitive data, can be publicly shared",
    },
    internal: {
      level: "internal" as const,
      requiresEncryption: true,
      encryptionAlgorithm: "AES-256-GCM",
      description: "Internal use only, not for external sharing",
    },
    confidential: {
      level: "confidential" as const,
      requiresEncryption: true,
      encryptionAlgorithm: "AES-256-GCM",
      description: "Sensitive business data, contains PII",
      retentionPeriodDays: 2555,
    },
    restricted: {
      level: "restricted" as const,
      requiresEncryption: true,
      encryptionAlgorithm: "AES-256-GCM",
      description: "Highly sensitive, contains PHI or medical data",
      retentionPeriodDays: 2555,
    },
  };

  private static readonly DATA_TYPE_DEFAULT_CLASSIFICATION: Record<
    DataType,
    DataClassificationLevel
  > = {
    recording: "confidential",
    transcription: "confidential",
    summary: "confidential",
    user_profile: "confidential",
    api_response: "internal",
    chat_message: "confidential",
    consent_record: "restricted",
    audit_log: "internal",
    export_data: "confidential",
  };

  static async classifyData(
    context: ClassificationContext
  ): Promise<Result<ClassificationResult, Error>> {
    try {
      let classificationLevel: DataClassificationLevel;
      let hasPII = false;
      let hasPHI = false;
      let hasFinancialData = false;
      let detectedPIITypes: PIIDetection[] = [];
      let confidenceScore = 1.0;
      let reason = "";

      if (context.explicitClassification) {
        classificationLevel = context.explicitClassification;
        reason = "Explicitly classified by user or system";
      } else {
        const policy = await this.getActivePolicy(
          context.dataType,
          context.organizationId
        );

        if (policy) {
          classificationLevel = policy.defaultClassificationLevel;
        } else {
          classificationLevel =
            this.DATA_TYPE_DEFAULT_CLASSIFICATION[context.dataType];
        }

        if (context.content) {
          const contentAnalysis = await this.analyzeContent(context.content);
          hasPII = contentAnalysis.hasPII;
          hasPHI = contentAnalysis.hasPHI;
          hasFinancialData = contentAnalysis.hasFinancialData;
          detectedPIITypes = contentAnalysis.detectedPIITypes;
          confidenceScore = contentAnalysis.confidenceScore;

          if (hasPHI) {
            classificationLevel = "restricted";
            reason = "Contains Protected Health Information (PHI)";
          } else if (hasPII && classificationLevel === "internal") {
            classificationLevel = "confidential";
            reason = "Contains Personally Identifiable Information (PII)";
          } else if (hasFinancialData && classificationLevel !== "restricted") {
            classificationLevel = "confidential";
            reason = "Contains financial information";
          } else {
            reason = `Default classification for ${context.dataType}`;
          }
        } else {
          reason = `Default classification for ${context.dataType}`;
        }

        if (["recording", "transcription"].includes(context.dataType)) {
          if (classificationLevel === "internal") {
            classificationLevel = "confidential";
          }
          if (!reason.includes("PHI")) {
            reason = `Healthcare recording data - ${reason}`;
          }
        }
      }

      const rules = this.CLASSIFICATION_RULES[classificationLevel];

      return ok({
        level: classificationLevel,
        requiresEncryption: rules.requiresEncryption,
        encryptionAlgorithm: rules.encryptionAlgorithm,
        retentionPeriodDays: "retentionPeriodDays" in rules ? rules.retentionPeriodDays : undefined,
        reason,
        metadata: {
          hasPII,
          hasPHI,
          hasFinancialData,
          detectedPIITypes: detectedPIITypes.length > 0 ? detectedPIITypes : undefined,
          confidenceScore,
        },
      });
    } catch (error) {
      logger.error("Error classifying data", { error });
      return err(
        error instanceof Error ? error : new Error("Unknown classification error")
      );
    }
  }

  private static async analyzeContent(content: string): Promise<{
    hasPII: boolean;
    hasPHI: boolean;
    hasFinancialData: boolean;
    detectedPIITypes: PIIDetection[];
    confidenceScore: number;
  }> {
    const detectedPII = PIIDetectionService.detectPII(content);

    const hasPII = detectedPII.length > 0;
    const hasPHI = this.detectPHI(content, detectedPII);
    const hasFinancialData = this.detectFinancialData(content);

    const confidenceScore =
      detectedPII.length > 0
        ? detectedPII.reduce((sum, pii) => sum + pii.confidence, 0) /
          detectedPII.length
        : 1.0;

    return {
      hasPII,
      hasPHI,
      hasFinancialData,
      detectedPIITypes: detectedPII,
      confidenceScore,
    };
  }

  private static detectPHI(content: string, piiDetections: PIIDetection[]): boolean {
    const medicalKeywords = [
      "diagnose",
      "diagnos",
      "behandeling",
      "medicijn",
      "medica",
      "patiënt",
      "patient",
      "ziekte",
      "symptoom",
      "symptom",
      "therapie",
      "chirurg",
      "operatie",
      "ingreep",
      "medisch",
      "medical",
      "health",
      "gezondheid",
      "arts",
      "doctor",
      "tandarts",
      "dentist",
      "huisarts",
      "specialist",
      "ziekenhuis",
      "hospital",
      "kliniek",
      "clinic",
      "apotheek",
      "pharmacy",
      "recept",
      "prescription",
      "bloeddruk",
      "blood pressure",
      "bloedsuiker",
      "glucose",
      "allergisch",
      "allergy",
    ];

    const lowerContent = content.toLowerCase();
    const hasMedicalKeywords = medicalKeywords.some((keyword) =>
      lowerContent.includes(keyword.toLowerCase())
    );

    const hasMedicalPII =
      piiDetections.some((pii) => pii.type === "medical_record") ||
      piiDetections.some((pii) => pii.type === "bsn");

    return hasMedicalKeywords || hasMedicalPII;
  }

  private static detectFinancialData(content: string): boolean {
    const financialPatterns = [
      /\b(?:IBAN|NL\d{2}[A-Z]{4}\d{10})\b/gi,
      /\b(?:rekening|rekeningnummer|account number)[:\s-]?\d+/gi,
      /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s?(?:EUR|€|euro)\b/gi,
    ];

    return financialPatterns.some((pattern) => pattern.test(content));
  }

  static async storeClassification(
    resourceId: string,
    dataType: DataType,
    classificationResult: ClassificationResult,
    organizationId: string,
    classifiedById?: string
  ): Promise<Result<DataClassification, Error>> {
    try {
      const classification: NewDataClassification = {
        resourceId,
        dataType,
        classificationLevel: classificationResult.level,
        requiresEncryption: classificationResult.requiresEncryption,
        encryptionAlgorithm: classificationResult.requiresEncryption
          ? classificationResult.encryptionAlgorithm
          : null,
        retentionPeriodDays: classificationResult.retentionPeriodDays || null,
        classificationReason: classificationResult.reason,
        classificationMetadata: classificationResult.metadata as unknown as Record<
          string,
          unknown
        >,
        hasPII: classificationResult.metadata.hasPII,
        hasPHI: classificationResult.metadata.hasPHI,
        hasFinancialData: classificationResult.metadata.hasFinancialData,
        detectedPIITypes: classificationResult.metadata.detectedPIITypes
          ? (classificationResult.metadata.detectedPIITypes as unknown as Record<
              string,
              unknown
            >)
          : null,
        classifiedById: classifiedById || null,
        organizationId,
      };

      const [result] = await db
        .insert(dataClassifications)
        .values(classification)
        .returning();

      logger.info("Data classification stored", {
        resourceId,
        dataType,
        level: classificationResult.level,
      });

      return ok(result);
    } catch (error) {
      logger.error("Error storing classification", { error, resourceId, dataType });
      return err(
        error instanceof Error ? error : new Error("Unknown storage error")
      );
    }
  }

  static async getClassification(
    resourceId: string,
    dataType: DataType
  ): Promise<Result<DataClassification | null, Error>> {
    try {
      const [classification] = await db
        .select()
        .from(dataClassifications)
        .where(
          and(
            eq(dataClassifications.resourceId, resourceId),
            eq(dataClassifications.dataType, dataType)
          )
        )
        .limit(1);

      return ok(classification || null);
    } catch (error) {
      logger.error("Error retrieving classification", { error, resourceId, dataType });
      return err(
        error instanceof Error ? error : new Error("Unknown retrieval error")
      );
    }
  }

  private static async getActivePolicy(
    dataType: DataType,
    organizationId: string
  ): Promise<ClassificationPolicy | null> {
    try {
      const [policy] = await db
        .select()
        .from(classificationPolicies)
        .where(
          and(
            eq(classificationPolicies.dataType, dataType),
            eq(classificationPolicies.isActive, true),
            eq(classificationPolicies.organizationId, organizationId)
          )
        )
        .limit(1);

      if (policy) {
        return policy;
      }

      const [globalPolicy] = await db
        .select()
        .from(classificationPolicies)
        .where(
          and(
            eq(classificationPolicies.dataType, dataType),
            eq(classificationPolicies.isActive, true),
            isNull(classificationPolicies.organizationId)
          )
        )
        .limit(1);

      return globalPolicy || null;
    } catch (error) {
      logger.error("Error retrieving policy", { error, dataType, organizationId });
      return null;
    }
  }

  static async seedDefaultPolicies(): Promise<Result<void, Error>> {
    try {
      const defaultPolicies: NewClassificationPolicy[] = [
        {
          name: "Recording Data Policy",
          description:
            "Default classification for healthcare recordings with automatic PHI detection",
          dataType: "recording",
          defaultClassificationLevel: "confidential",
          requiresEncryptionAtRest: true,
          requiresEncryptionInTransit: true,
          encryptionAlgorithm: "AES-256-GCM",
          retentionPeriodDays: 2555,
          policyRules: {
            autoClassify: true,
            requireConsent: true,
            automaticRedaction: true,
            escalateOnPHI: true,
          },
          isActive: true,
          organizationId: null,
        },
        {
          name: "Transcription Data Policy",
          description:
            "Default classification for transcriptions with PII/PHI detection",
          dataType: "transcription",
          defaultClassificationLevel: "confidential",
          requiresEncryptionAtRest: true,
          requiresEncryptionInTransit: true,
          encryptionAlgorithm: "AES-256-GCM",
          retentionPeriodDays: 2555,
          policyRules: {
            autoClassify: true,
            requirePIIDetection: true,
            escalateOnPHI: true,
          },
          isActive: true,
          organizationId: null,
        },
        {
          name: "User Profile Policy",
          description: "Classification for user profile data with PII protection",
          dataType: "user_profile",
          defaultClassificationLevel: "confidential",
          requiresEncryptionAtRest: true,
          requiresEncryptionInTransit: true,
          encryptionAlgorithm: "AES-256-GCM",
          retentionPeriodDays: 2555,
          policyRules: {
            requireConsent: true,
            gdprCompliant: true,
          },
          isActive: true,
          organizationId: null,
        },
        {
          name: "Consent Record Policy",
          description: "Highest protection for consent records and legal documentation",
          dataType: "consent_record",
          defaultClassificationLevel: "restricted",
          requiresEncryptionAtRest: true,
          requiresEncryptionInTransit: true,
          encryptionAlgorithm: "AES-256-GCM",
          retentionPeriodDays: 3650,
          policyRules: {
            immutable: true,
            requireAuditLog: true,
            legalHold: true,
          },
          isActive: true,
          organizationId: null,
        },
        {
          name: "API Response Policy",
          description: "Classification for API responses with context-aware protection",
          dataType: "api_response",
          defaultClassificationLevel: "internal",
          requiresEncryptionAtRest: false,
          requiresEncryptionInTransit: true,
          encryptionAlgorithm: "TLS-1.3",
          policyRules: {
            autoClassify: true,
            contextAware: true,
          },
          isActive: true,
          organizationId: null,
        },
        {
          name: "Summary Policy",
          description: "Classification for AI-generated summaries",
          dataType: "summary",
          defaultClassificationLevel: "confidential",
          requiresEncryptionAtRest: true,
          requiresEncryptionInTransit: true,
          encryptionAlgorithm: "AES-256-GCM",
          retentionPeriodDays: 2555,
          policyRules: {
            deriveFromSource: true,
          },
          isActive: true,
          organizationId: null,
        },
        {
          name: "Chat Message Policy",
          description: "Classification for chat conversations",
          dataType: "chat_message",
          defaultClassificationLevel: "confidential",
          requiresEncryptionAtRest: true,
          requiresEncryptionInTransit: true,
          encryptionAlgorithm: "AES-256-GCM",
          retentionPeriodDays: 2555,
          policyRules: {
            autoClassify: true,
            requirePIIDetection: true,
          },
          isActive: true,
          organizationId: null,
        },
        {
          name: "Audit Log Policy",
          description: "Classification for security and compliance audit logs",
          dataType: "audit_log",
          defaultClassificationLevel: "internal",
          requiresEncryptionAtRest: true,
          requiresEncryptionInTransit: true,
          encryptionAlgorithm: "AES-256-GCM",
          retentionPeriodDays: 3650,
          policyRules: {
            immutable: true,
            tamperProof: true,
          },
          isActive: true,
          organizationId: null,
        },
        {
          name: "Export Data Policy",
          description: "Classification for GDPR data exports",
          dataType: "export_data",
          defaultClassificationLevel: "confidential",
          requiresEncryptionAtRest: true,
          requiresEncryptionInTransit: true,
          encryptionAlgorithm: "AES-256-GCM",
          retentionPeriodDays: 7,
          policyRules: {
            shortRetention: true,
            autoDelete: true,
          },
          isActive: true,
          organizationId: null,
        },
      ];

      await db.insert(classificationPolicies).values(defaultPolicies);

      logger.info("Default classification policies seeded successfully");
      return ok(undefined);
    } catch (error) {
      logger.error("Error seeding default policies", { error });
      return err(
        error instanceof Error ? error : new Error("Unknown seeding error")
      );
    }
  }

  static getEncryptionRequirements(
    classificationLevel: DataClassificationLevel
  ): {
    requiresEncryption: boolean;
    algorithm: string;
    description: string;
  } {
    const rules = this.CLASSIFICATION_RULES[classificationLevel];
    return {
      requiresEncryption: rules.requiresEncryption,
      algorithm: rules.encryptionAlgorithm,
      description: rules.description,
    };
  }

  static shouldEncryptData(classificationLevel: DataClassificationLevel): boolean {
    return this.CLASSIFICATION_RULES[classificationLevel].requiresEncryption;
  }

  static getRetentionPeriod(
    classificationLevel: DataClassificationLevel
  ): number | undefined {
    const rules = this.CLASSIFICATION_RULES[classificationLevel];
    return "retentionPeriodDays" in rules ? rules.retentionPeriodDays : undefined;
  }

  static async updateClassification(
    classificationId: string,
    updates: Partial<NewDataClassification>
  ): Promise<Result<DataClassification, Error>> {
    try {
      const [updated] = await db
        .update(dataClassifications)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(dataClassifications.id, classificationId))
        .returning();

      if (!updated) {
        return err(new Error("Classification not found"));
      }

      logger.info("Classification updated", { classificationId, updates });
      return ok(updated);
    } catch (error) {
      logger.error("Error updating classification", { error, classificationId });
      return err(
        error instanceof Error ? error : new Error("Unknown update error")
      );
    }
  }
}

export type DataClassification = typeof dataClassifications.$inferSelect;
export type ClassificationPolicy = typeof classificationPolicies.$inferSelect;
