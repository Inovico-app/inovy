import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { recordings } from "./recordings";

export const consentStatusEnum = [
  "pending",
  "granted",
  "revoked",
  "expired",
] as const;
export type ConsentStatus = (typeof consentStatusEnum)[number];

export const consentMethodEnum = [
  "explicit",
  "implicit",
  "bot-notification",
] as const;
export type ConsentMethod = (typeof consentMethodEnum)[number];

/**
 * Consent participants table
 * Tracks individual participant consent for recordings
 */
export const consentParticipants = pgTable(
  "consent_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),
    participantEmail: text("participant_email").notNull(),
    participantName: text("participant_name"),
    consentStatus: text("consent_status", { enum: consentStatusEnum })
      .notNull()
      .default("pending"),
    consentMethod: text("consent_method", { enum: consentMethodEnum })
      .notNull()
      .default("explicit"),
    consentGivenAt: timestamp("consent_given_at", { withTimezone: true }),
    consentRevokedAt: timestamp("consent_revoked_at", { withTimezone: true }),
    ipAddress: text("ip_address"), // For audit purposes
    userAgent: text("user_agent"), // For audit purposes
    userId: text("user_id"), // Better Auth user ID if participant is a registered user
    // Encryption fields (SSD-4.2.02: HIGHLY_CONFIDENTIAL - PII data)
    emailEncrypted: boolean("email_encrypted").notNull().default(false),
    emailEncryptionMetadata: text("email_encryption_metadata"),
    nameEncrypted: boolean("name_encrypted").notNull().default(false),
    nameEncryptionMetadata: text("name_encryption_metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Ensure one consent record per participant per recording
    uniqueParticipantPerRecording: unique().on(
      table.recordingId,
      table.participantEmail
    ),
  })
);

export type ConsentParticipant = typeof consentParticipants.$inferSelect;
export type NewConsentParticipant = typeof consentParticipants.$inferInsert;

