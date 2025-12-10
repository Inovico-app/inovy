import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth";

/**
 * Signup Type Enum
 * Tracks whether the signup was for an individual or organization
 */
export const signupTypeEnum = pgEnum("signup_type", [
  "individual",
  "organization",
]);

/**
 * Signup Method Enum
 * Tracks the authentication method used during signup
 */
export const signupMethodEnum = pgEnum("signup_method", [
  "email",
  "google",
  "microsoft",
  "magic_link",
  "passkey",
]);

/**
 * Onboardings Table
 * Tracks onboarding analytics for users and organizations
 * Supports both individual and organization signups
 */
export const onboardings = pgTable(
  "onboardings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    signupType: signupTypeEnum("signup_type").notNull(),
    orgSize: integer("org_size"), // Only for organization signups
    researchQuestion: text("research_question"), // Only for individual signups
    referralSource: text("referral_source"), // e.g., 'google', 'linkedin', 'referral', 'direct', 'other', etc.
    referralSourceOther: text("referral_source_other"), // Free text when referralSource is 'other'
    googleConnectedDuringOnboarding: boolean(
      "google_connected_during_onboarding"
    )
      .default(false)
      .notNull(), // Track if user connected Google Calendar during onboarding
    newsletterOptIn: boolean("newsletter_opt_in").default(false).notNull(), // Track if user opted into newsletter during onboarding
    signupMethod: signupMethodEnum("signup_method").notNull(),
    onboardingCompleted: boolean("onboarding_completed")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("onboardings_user_id_idx").on(table.userId),
    organizationIdIdx: index("onboardings_organization_id_idx").on(
      table.organizationId
    ),
    signupTypeIdx: index("onboardings_signup_type_idx").on(table.signupType),
    signupMethodIdx: index("onboardings_signup_method_idx").on(
      table.signupMethod
    ),
    createdAtIdx: index("onboardings_created_at_idx").on(table.createdAt),
  })
);

export const onboardingsRelations = relations(onboardings, ({ one }) => ({
  user: one(users, {
    fields: [onboardings.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [onboardings.organizationId],
    references: [organizations.id],
  }),
}));

export type Onboarding = typeof onboardings.$inferSelect;
export type NewOnboarding = typeof onboardings.$inferInsert;

