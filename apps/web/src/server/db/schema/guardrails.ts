import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const guardrailsScopeEnum = pgEnum("guardrails_scope", [
  "default",
  "organization",
  "project",
]);

export const guardrailsActionEnum = pgEnum("guardrails_action", [
  "block",
  "redact",
  "warn",
]);

export const guardrailsViolationTypeEnum = pgEnum(
  "guardrails_violation_type",
  ["pii", "jailbreak", "toxicity", "hallucination"]
);

export const guardrailsDirectionEnum = pgEnum("guardrails_direction", [
  "input",
  "output",
]);

export const guardrailsActionTakenEnum = pgEnum("guardrails_action_taken", [
  "blocked",
  "redacted",
  "warned",
  "passed",
]);

export const guardrailsSeverityEnum = pgEnum("guardrails_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

// ---------------------------------------------------------------------------
// Guardrails Policies
// ---------------------------------------------------------------------------

export const guardrailsPolicies = pgTable(
  "guardrails_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    scope: guardrailsScopeEnum("scope").notNull(),
    scopeId: text("scope_id"),

    enabled: boolean("enabled").notNull().default(true),

    // PII detection
    piiDetectionEnabled: boolean("pii_detection_enabled")
      .notNull()
      .default(true),
    piiAction: guardrailsActionEnum("pii_action").notNull().default("redact"),
    piiEntities: jsonb("pii_entities")
      .$type<string[]>()
      .notNull()
      .default([
        "EMAIL_ADDRESS",
        "PHONE_NUMBER",
        "PERSON",
        "CREDIT_CARD",
        "US_SSN",
        "IBAN_CODE",
        "IP_ADDRESS",
      ]),

    // Jailbreak detection
    jailbreakDetectionEnabled: boolean("jailbreak_detection_enabled")
      .notNull()
      .default(true),
    jailbreakAction: guardrailsActionEnum("jailbreak_action")
      .notNull()
      .default("block"),

    // Toxicity filtering
    toxicityDetectionEnabled: boolean("toxicity_detection_enabled")
      .notNull()
      .default(true),
    toxicityThreshold: real("toxicity_threshold").notNull().default(0.7),
    toxicityAction: guardrailsActionEnum("toxicity_action")
      .notNull()
      .default("block"),

    // Hallucination checking
    hallucinationCheckEnabled: boolean("hallucination_check_enabled")
      .notNull()
      .default(false),
    hallucinationAction: guardrailsActionEnum("hallucination_action")
      .notNull()
      .default("warn"),

    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueScopePolicy: unique().on(table.scope, table.scopeId),
    idxScope: index("idx_guardrails_policies_scope").on(table.scope),
    idxScopeId: index("idx_guardrails_policies_scope_id").on(
      table.scope,
      table.scopeId
    ),
  })
);

export type GuardrailsPolicy = typeof guardrailsPolicies.$inferSelect;
export type NewGuardrailsPolicy = typeof guardrailsPolicies.$inferInsert;

// ---------------------------------------------------------------------------
// Guardrails Violations
// ---------------------------------------------------------------------------

export const guardrailsViolations = pgTable(
  "guardrails_violations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: text("organization_id").notNull(),
    projectId: text("project_id"),
    userId: text("user_id").notNull(),

    violationType: guardrailsViolationTypeEnum("violation_type").notNull(),
    direction: guardrailsDirectionEnum("direction").notNull(),
    actionTaken: guardrailsActionTakenEnum("action_taken").notNull(),
    severity: guardrailsSeverityEnum("severity").notNull().default("medium"),

    guardName: text("guard_name").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idxOrgId: index("idx_guardrails_violations_org_id").on(
      table.organizationId
    ),
    idxCreatedAt: index("idx_guardrails_violations_created_at").on(
      table.createdAt
    ),
    idxViolationType: index("idx_guardrails_violations_type").on(
      table.violationType
    ),
  })
);

export type GuardrailsViolation = typeof guardrailsViolations.$inferSelect;
export type NewGuardrailsViolation = typeof guardrailsViolations.$inferInsert;
