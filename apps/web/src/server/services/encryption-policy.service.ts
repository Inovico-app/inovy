import { logger } from "@/lib/logger";
import { type Result, ok, err } from "neverthrow";
import {
  DataClassificationService,
  type ClassificationResult,
  type ClassificationContext,
} from "./data-classification.service";
import type { DataClassificationLevel } from "@/server/db/schema/data-classification";

export interface EncryptionPolicy {
  shouldEncrypt: boolean;
  algorithm: string;
  keyDerivation?: string;
  iterations?: number;
  mode: "at-rest" | "in-transit" | "both";
  reason: string;
}

export interface EncryptionDecision {
  policy: EncryptionPolicy;
  classification: ClassificationResult;
  appliedAt: Date;
}

export class EncryptionPolicyService {
  private static readonly ENCRYPTION_ALGORITHMS = {
    "AES-256-GCM": {
      algorithm: "AES-256-GCM",
      keyDerivation: "PBKDF2-SHA256",
      iterations: 100000,
      keySize: 256,
      description: "Strong symmetric encryption for data at rest",
    },
    "TLS-1.3": {
      algorithm: "TLS-1.3",
      description: "Transport layer security for data in transit",
    },
    none: {
      algorithm: "none",
      description: "No encryption required",
    },
  } as const;

  private static readonly FEATURE_FLAGS = {
    ENCRYPTION_AT_REST_ENABLED:
      process.env.ENABLE_ENCRYPTION_AT_REST === "true",
    ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY,
  };

  static async determineEncryptionPolicy(
    context: ClassificationContext
  ): Promise<Result<EncryptionDecision, Error>> {
    try {
      const classificationResult = await DataClassificationService.classifyData(
        context
      );

      if (classificationResult.isErr()) {
        return err(classificationResult.error);
      }

      const classification = classificationResult.value;
      const policy = this.buildEncryptionPolicy(classification);

      const decision: EncryptionDecision = {
        policy,
        classification,
        appliedAt: new Date(),
      };

      logger.info("Encryption policy determined", {
        dataType: context.dataType,
        classificationLevel: classification.level,
        shouldEncrypt: policy.shouldEncrypt,
      });

      return ok(decision);
    } catch (error) {
      logger.error("Error determining encryption policy", { error, context });
      return err(
        error instanceof Error ? error : new Error("Unknown policy error")
      );
    }
  }

  private static buildEncryptionPolicy(
    classification: ClassificationResult
  ): EncryptionPolicy {
    if (!classification.requiresEncryption) {
      return {
        shouldEncrypt: false,
        algorithm: "none",
        mode: "in-transit",
        reason:
          "Classification level does not require encryption (TLS still applied)",
      };
    }

    const atRestEnabled = this.FEATURE_FLAGS.ENCRYPTION_AT_REST_ENABLED;
    const hasMasterKey = !!this.FEATURE_FLAGS.ENCRYPTION_MASTER_KEY;

    if (classification.level === "restricted" || classification.level === "confidential") {
      if (!atRestEnabled) {
        logger.warn("Encryption at rest is required but not enabled", {
          level: classification.level,
          reason: classification.reason,
        });
      }

      if (!hasMasterKey) {
        logger.warn("Encryption master key is not configured");
      }

      const algorithm =
        classification.encryptionAlgorithm || "AES-256-GCM";
      const algorithmConfig =
        this.ENCRYPTION_ALGORITHMS[
          algorithm as keyof typeof this.ENCRYPTION_ALGORITHMS
        ];

      return {
        shouldEncrypt: atRestEnabled && hasMasterKey,
        algorithm,
        keyDerivation:
          "keyDerivation" in algorithmConfig
            ? algorithmConfig.keyDerivation
            : undefined,
        iterations:
          "iterations" in algorithmConfig
            ? algorithmConfig.iterations
            : undefined,
        mode: "both",
        reason: `${classification.reason} - Encryption ${atRestEnabled && hasMasterKey ? "enabled" : "required but not configured"}`,
      };
    }

    return {
      shouldEncrypt: false,
      algorithm: "TLS-1.3",
      mode: "in-transit",
      reason: `${classification.reason} - In-transit encryption only`,
    };
  }

  static validateEncryptionConfiguration(): Result<
    {
      isValid: boolean;
      warnings: string[];
      recommendations: string[];
    },
    Error
  > {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!this.FEATURE_FLAGS.ENCRYPTION_AT_REST_ENABLED) {
      warnings.push(
        "ENABLE_ENCRYPTION_AT_REST is not enabled - sensitive data will not be encrypted at rest"
      );
      recommendations.push(
        "Enable encryption at rest by setting ENABLE_ENCRYPTION_AT_REST=true"
      );
    }

    if (!this.FEATURE_FLAGS.ENCRYPTION_MASTER_KEY) {
      warnings.push(
        "ENCRYPTION_MASTER_KEY is not configured - encryption cannot be performed"
      );
      recommendations.push(
        "Configure ENCRYPTION_MASTER_KEY with a secure random key"
      );
    }

    const isValid =
      this.FEATURE_FLAGS.ENCRYPTION_AT_REST_ENABLED &&
      !!this.FEATURE_FLAGS.ENCRYPTION_MASTER_KEY;

    if (warnings.length > 0) {
      logger.warn("Encryption configuration issues detected", {
        warnings,
        recommendations,
      });
    }

    return ok({
      isValid,
      warnings,
      recommendations,
    });
  }

  static getEncryptionDetailsForClassification(
    classificationLevel: DataClassificationLevel
  ): {
    requiresEncryption: boolean;
    algorithm: string;
    description: string;
  } {
    return DataClassificationService.getEncryptionRequirements(
      classificationLevel
    );
  }

  static getAlgorithmDetails(algorithm: string): {
    algorithm: string;
    keyDerivation?: string;
    iterations?: number;
    keySize?: number;
    description: string;
  } {
    const config =
      this.ENCRYPTION_ALGORITHMS[
        algorithm as keyof typeof this.ENCRYPTION_ALGORITHMS
      ];

    if (!config) {
      return {
        algorithm: "unknown",
        description: "Unknown encryption algorithm",
      };
    }

    return {
      algorithm: config.algorithm,
      keyDerivation:
        "keyDerivation" in config ? config.keyDerivation : undefined,
      iterations: "iterations" in config ? config.iterations : undefined,
      keySize: "keySize" in config ? config.keySize : undefined,
      description: config.description,
    };
  }

  static async auditEncryptionCompliance(
    organizationId: string
  ): Promise<
    Result<
      {
        totalRecords: number;
        encrypted: number;
        unencrypted: number;
        requiresEncryption: number;
        complianceRate: number;
        nonCompliantRecords: Array<{
          id: string;
          dataType: string;
          classificationLevel: string;
          reason: string;
        }>;
      },
      Error
    >
  > {
    try {
      const { recordings } = await import("@/server/db/schema/recordings");
      const { db } = await import("@/server/db");
      const { eq } = await import("drizzle-orm");

      const allRecordings = await db
        .select({
          id: recordings.id,
          isEncrypted: recordings.isEncrypted,
          dataClassificationLevel: recordings.dataClassificationLevel,
        })
        .from(recordings)
        .where(eq(recordings.organizationId, organizationId));

      const totalRecords = allRecordings.length;
      const encrypted = allRecordings.filter((r) => r.isEncrypted).length;
      const unencrypted = totalRecords - encrypted;

      const nonCompliantRecords = allRecordings
        .filter((r) => {
          const level = r.dataClassificationLevel as DataClassificationLevel;
          const shouldEncrypt =
            DataClassificationService.shouldEncryptData(level);
          return shouldEncrypt && !r.isEncrypted;
        })
        .map((r) => ({
          id: r.id,
          dataType: "recording",
          classificationLevel: r.dataClassificationLevel,
          reason: `Classification requires encryption but data is not encrypted`,
        }));

      const requiresEncryption = allRecordings.filter((r) => {
        const level = r.dataClassificationLevel as DataClassificationLevel;
        return DataClassificationService.shouldEncryptData(level);
      }).length;

      const compliantRecords = requiresEncryption - nonCompliantRecords.length;
      const complianceRate =
        requiresEncryption > 0 ? (compliantRecords / requiresEncryption) * 100 : 100;

      logger.info("Encryption compliance audit completed", {
        organizationId,
        totalRecords,
        encrypted,
        requiresEncryption,
        complianceRate,
      });

      return ok({
        totalRecords,
        encrypted,
        unencrypted,
        requiresEncryption,
        complianceRate,
        nonCompliantRecords,
      });
    } catch (error) {
      logger.error("Error auditing encryption compliance", { error, organizationId });
      return err(
        error instanceof Error ? error : new Error("Unknown audit error")
      );
    }
  }
}
