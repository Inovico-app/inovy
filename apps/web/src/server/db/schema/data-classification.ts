import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const dataClassificationLevelEnum = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;
export type DataClassificationLevel =
  (typeof dataClassificationLevelEnum)[number];

export const dataTypeEnum = [
  "recording",
  "transcription",
  "summary",
  "user_profile",
  "api_response",
  "chat_message",
  "consent_record",
  "audit_log",
  "export_data",
] as const;
export type DataType = (typeof dataTypeEnum)[number];

export const dataClassifications = pgTable("data_classifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  dataType: text("data_type", { enum: dataTypeEnum }).notNull(),
  resourceId: uuid("resource_id").notNull(),
  classificationLevel: text("classification_level", {
    enum: dataClassificationLevelEnum,
  }).notNull(),
  requiresEncryption: boolean("requires_encryption").notNull().default(true),
  encryptionAlgorithm: text("encryption_algorithm"),
  retentionPeriodDays: integer("retention_period_days"),
  classificationReason: text("classification_reason"),
  classificationMetadata: jsonb("classification_metadata"),
  hasPII: boolean("has_pii").notNull().default(false),
  hasPHI: boolean("has_phi").notNull().default(false),
  hasFinancialData: boolean("has_financial_data").notNull().default(false),
  detectedPIITypes: jsonb("detected_pii_types"),
  classifiedById: text("classified_by_id"),
  classifiedAt: timestamp("classified_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  organizationId: text("organization_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DataClassification = typeof dataClassifications.$inferSelect;
export type NewDataClassification = typeof dataClassifications.$inferInsert;

export const classificationPolicies = pgTable("classification_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  dataType: text("data_type", { enum: dataTypeEnum }).notNull(),
  defaultClassificationLevel: text("default_classification_level", {
    enum: dataClassificationLevelEnum,
  }).notNull(),
  requiresEncryptionAtRest: boolean("requires_encryption_at_rest")
    .notNull()
    .default(true),
  requiresEncryptionInTransit: boolean("requires_encryption_in_transit")
    .notNull()
    .default(true),
  encryptionAlgorithm: text("encryption_algorithm").notNull().default("AES-256-GCM"),
  retentionPeriodDays: integer("retention_period_days"),
  policyRules: jsonb("policy_rules"),
  isActive: boolean("is_active").notNull().default(true),
  organizationId: text("organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ClassificationPolicy = typeof classificationPolicies.$inferSelect;
export type NewClassificationPolicy = typeof classificationPolicies.$inferInsert;
