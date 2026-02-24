import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth";

export const organizationAuthPolicies = pgTable(
  "organization_auth_policies",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: "cascade" }),

    requireEmailVerification: boolean("require_email_verification")
      .default(true)
      .notNull(),

    requireMfa: boolean("require_mfa").default(false).notNull(),

    mfaGracePeriodDays: integer("mfa_grace_period_days").default(30),

    passwordMinLength: integer("password_min_length").default(8).notNull(),
    passwordRequireUppercase: boolean("password_require_uppercase")
      .default(false)
      .notNull(),
    passwordRequireLowercase: boolean("password_require_lowercase")
      .default(false)
      .notNull(),
    passwordRequireNumbers: boolean("password_require_numbers")
      .default(false)
      .notNull(),
    passwordRequireSpecialChars: boolean("password_require_special_chars")
      .default(false)
      .notNull(),

    passwordHistoryCount: integer("password_history_count").default(0),

    passwordExpirationDays: integer("password_expiration_days"),

    sessionTimeoutMinutes: integer("session_timeout_minutes").default(
      60 * 24 * 7
    ),

    sessionInactivityTimeoutMinutes: integer(
      "session_inactivity_timeout_minutes"
    ).default(60 * 24),

    allowedAuthMethods: jsonb("allowed_auth_methods")
      .$type<string[]>()
      .default(["email-password", "google", "microsoft", "magic-link", "passkey"])
      .notNull(),

    ipWhitelist: jsonb("ip_whitelist").$type<string[]>(),

    allowPasswordReset: boolean("allow_password_reset").default(true).notNull(),

    maxFailedLoginAttempts: integer("max_failed_login_attempts").default(5),

    lockoutDurationMinutes: integer("lockout_duration_minutes").default(30),

    additionalSettings: jsonb("additional_settings").$type<
      Record<string, unknown>
    >(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("organization_auth_policies_organizationId_idx").on(
      table.organizationId
    ),
  ]
);

export const userMfaSettings = pgTable(
  "user_mfa_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    totpEnabled: boolean("totp_enabled").default(false).notNull(),

    totpSecret: text("totp_secret"),

    backupCodes: jsonb("backup_codes").$type<string[]>(),

    mfaEnrolledAt: timestamp("mfa_enrolled_at"),

    lastMfaVerificationAt: timestamp("last_mfa_verification_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("user_mfa_settings_userId_idx").on(table.userId)]
);

export const passwordHistory = pgTable(
  "password_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    passwordHash: text("password_hash").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("password_history_userId_idx").on(table.userId),
    index("password_history_createdAt_idx").on(table.createdAt),
  ]
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    success: boolean("success").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("login_attempts_userId_idx").on(table.userId),
    index("login_attempts_email_idx").on(table.email),
    index("login_attempts_createdAt_idx").on(table.createdAt),
  ]
);

export const accountLockouts = pgTable(
  "account_lockouts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lockedAt: timestamp("locked_at").defaultNow().notNull(),
    lockedUntil: timestamp("locked_until").notNull(),
    reason: text("reason").notNull(),
    unlocked: boolean("unlocked").default(false).notNull(),
    unlockedAt: timestamp("unlocked_at"),
  },
  (table) => [
    index("account_lockouts_userId_idx").on(table.userId),
    index("account_lockouts_lockedUntil_idx").on(table.lockedUntil),
  ]
);

export const organizationAuthPolicyRelations = relations(
  organizationAuthPolicies,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationAuthPolicies.organizationId],
      references: [organizations.id],
    }),
  })
);

export const userMfaSettingsRelations = relations(
  userMfaSettings,
  ({ one }) => ({
    user: one(users, {
      fields: [userMfaSettings.userId],
      references: [users.id],
    }),
  })
);

export const passwordHistoryRelations = relations(
  passwordHistory,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordHistory.userId],
      references: [users.id],
    }),
  })
);

export const loginAttemptsRelations = relations(loginAttempts, ({ one }) => ({
  user: one(users, {
    fields: [loginAttempts.userId],
    references: [users.id],
  }),
}));

export const accountLockoutsRelations = relations(
  accountLockouts,
  ({ one }) => ({
    user: one(users, {
      fields: [accountLockouts.userId],
      references: [users.id],
    }),
  })
);
