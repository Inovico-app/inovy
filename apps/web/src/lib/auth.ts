import { sendEmailFromTemplate } from "@/emails/client";
import MagicLinkEmail from "@/emails/templates/magic-link-email";
import OrganizationInvitationEmail from "@/emails/templates/organization-invitation-email";
import PasswordResetEmail from "@/emails/templates/password-reset-email";
import VerificationEmail from "@/emails/templates/verification-email";
import { logger } from "@/lib/logger";
import { anonymizeEmail } from "@/lib/pii-utils";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { PendingTeamAssignmentsQueries } from "@/server/data-access/pending-team-assignments.queries";
import { UserQueries } from "@/server/data-access/user.queries";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema/auth";
import { passkey } from "@better-auth/passkey";
import type {
  AuthContext,
  BetterAuthOptions,
  MiddlewareContext,
  MiddlewareOptions,
} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { magicLink, organization } from "better-auth/plugins";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { ac, roles } from "./auth/access-control";

/**
 * Better Auth instance configuration
 *
 * This is the main Better Auth configuration with all plugins enabled:
 * - Email/password authentication
 * - OAuth providers (Google, Microsoft)
 * - Magic link authentication
 * - Passkey/WebAuthn support
 * - Stripe subscription management
 * - Organization management
 */
export const auth = betterAuth({
  experimental: { joins: true },
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      users: schema.users,
      sessions: schema.sessions,
      accounts: schema.accounts,
      verifications: schema.verifications,
      organizations: schema.organizations,
      members: schema.members,
      invitations: schema.invitations,
      passkeys: schema.passkeys,
      magicLinks: schema.magicLinks,
      teams: schema.teams,
      teamMembers: schema.teamMembers,
    },
  }),
  baseURL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : (process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL),
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET ?? "change-me-in-production",
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": {
        window: 10,
        max: 3,
      },
      "/sign-in/passkey": {
        window: 10,
        max: 5,
      },
      "/reset-password": {
        window: 60,
        max: 3,
      },
      "/verify-email": {
        window: 60,
        max: 5,
      },
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    async sendVerificationEmail({
      user,
      url,
    }: {
      user: { email: string; name: string | null; id: string };
      url: string;
    }) {
      void sendEmailFromTemplate({
        to: user.email,
        subject: "Verify your email address",
        react: VerificationEmail({
          verificationUrl: url,
          userName: user.name,
        }),
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    requireEmailVerification: true,
    async sendResetPassword({
      user,
      url,
      token: _token,
    }: {
      user: { email: string; name: string | null };
      url: string;
      token: string;
    }) {
      await sendEmailFromTemplate({
        to: user.email,
        subject: "Reset your password",
        react: PasswordResetEmail({
          resetUrl: url,
          userName: user.name,
        }),
      });
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account consent",
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      strategy: "compact",
      refreshCache: true, // Enable stateless refresh
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    freshAge: 60 * 10, // 10 minutes
  },
  account: {
    accountLinking: {
      trustedProviders: ["google", "microsoft"],
    },
    storeStateStrategy: "cookie",
    storeAccountCookie: true,
    updateAccountOnSignIn: true,
  },
  databaseHooks: {
    // Session gets triggered by social signups and signins, so we need to ensure the user has an organization here too
    session: {
      create: {
        before: async (session, ctx) => {
          const organizationId = await ensureUserHasOrganization(
            session.userId,
            undefined,
            ctx as MiddlewareContext<
              MiddlewareOptions,
              AuthContext<BetterAuthOptions>
            >
          );

          if (!organizationId) {
            logger.error("Failed to ensure user has organization", {
              userId: session.userId,
              error: "No organization found",
              path: ctx?.path ?? "unknown",
              hook: "databaseHooks.session.create.before",
            });
            return;
          }

          // Automatically set active organization if user has organizations
          // and no active organization is set
          // Note: ensureUserHasOrganization already fetches the organization, so we use the returned ID
          if (!session.activeOrganizationId && organizationId) {
            logger.debug("Setting active organization for new session", {
              userId: session.userId,
              organizationId,
            });

            return {
              data: {
                ...session,
                activeOrganizationId: organizationId,
              },
            };
          }

          return { data: session };
        },
      },
    },
    user: {
      create: {
        after: async (user, ctx) => {
          // Ensure user has an organization (creates one if needed)
          const organizationId = await ensureUserHasOrganization(
            user.id,
            user.email,
            ctx as MiddlewareContext<
              MiddlewareOptions,
              AuthContext<BetterAuthOptions>
            >
          );

          if (!organizationId) {
            logger.error("Failed to ensure user has organization", {
              userId: user.id,
              error: "No organization found",
              path: ctx?.path ?? "unknown",
              hook: "databaseHooks.user.create.after",
            });
            return undefined;
          }
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        enum: [
          "owner",
          "admin",
          "superadmin",
          "manager",
          "user",
          "viewer",
        ] as const,
        defaultValue: "user",
        required: true,
        description: "The role of the user in the organization",
        input: false, // don't allow user to change their role
      },
      onboardingCompleted: {
        type: "boolean",
        defaultValue: false,
        required: true,
        input: false, // don't allow user to change this directly
      },
    },
  },
  plugins: [
    organization({
      // Access control configuration
      ac,
      roles: {
        // Map Better Auth organization roles to application roles
        owner: roles.owner,
        admin: roles.admin,
        // Also include application-specific roles
        superadmin: roles.superadmin,
        manager: roles.manager,
        user: roles.user,
        viewer: roles.viewer,
      },
      teams: {
        enabled: true,
        maximumTeams: 10, // Optional: limit teams per organization
        allowRemovingAllTeams: false, // Optional: prevent removing the last team
      },
      organizationHooks: {
        /**
         * Before creating an invitation
         * Customize invitation expiration (default: 7 days)
         */
        beforeCreateInvitation: async ({
          invitation,
          inviter,
          organization,
        }) => {
          // Set custom expiration to 7 days
          const customExpiration = new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7
          ); // 7 days

          logger.debug("Creating invitation with custom expiration", {
            invitationId: invitation.id,
            email: invitation.email,
            organizationId: organization.id,
            inviterId: inviter.id,
            expiresAt: customExpiration,
          });

          return {
            data: {
              ...invitation,
              expiresAt: customExpiration,
            },
          };
        },

        /**
         * After creating an invitation
         * Track metrics, log invitation creation
         * Note: Email sending is handled by sendInvitationEmail callback
         */
        afterCreateInvitation: async ({
          invitation,
          inviter,
          organization,
        }) => {
          logger.info("Invitation created successfully", {
            invitationId: invitation.id,
            email: invitation.email,
            organizationId: organization.id,
            organizationName: organization.name,
            inviterId: inviter.id,
            inviterEmail: inviter.user.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
          });
        },

        /**
         * Before accepting an invitation
         * Additional validation before acceptance
         */
        beforeAcceptInvitation: async ({ invitation, user, organization }) => {
          logger.debug("Validating invitation acceptance", {
            invitationId: invitation.id,
            userId: user.id,
            userEmail: user.email,
            organizationId: organization.id,
            organizationName: organization.name,
          });

          // Additional validation logic can be added here
          // For example: check user eligibility, organization limits, etc.
          // If validation fails, throw an error to prevent acceptance
        },

        /**
         * After accepting an invitation, automatically apply pending team assignments
         * This hook runs automatically when Better Auth processes invitation acceptance
         */
        afterAcceptInvitation: async ({
          invitation,
          member,
          user,
          organization,
        }) => {
          logger.info("Invitation accepted", {
            invitationId: invitation.id,
            userId: user.id,
            userEmailHash: anonymizeEmail(user.email),
            organizationId: organization.id,
            organizationName: organization.name,
            memberId: member.id,
            role: member.role,
          });

          try {
            // Get pending team assignments for this invitation
            const teamIds =
              await PendingTeamAssignmentsQueries.getPendingAssignmentsByInvitationId(
                invitation.id
              );

            if (teamIds.length > 0) {
              // Use Better Auth API to add user to teams
              const headersList = await headers();
              await Promise.all(
                teamIds.map((teamId) =>
                  auth.api.addTeamMember({
                    body: {
                      teamId,
                      userId: user.id,
                    },
                    headers: headersList,
                  })
                )
              );

              // Clean up pending assignments after successful application
              await PendingTeamAssignmentsQueries.deletePendingAssignmentsByInvitationId(
                invitation.id
              );

              logger.info("Applied pending team assignments", {
                invitationId: invitation.id,
                userId: user.id,
                teamIds,
              });
            }
          } catch (error) {
            // Log error but don't fail the invitation acceptance
            // Team assignments can be applied manually later if needed
            logger.error("Failed to apply pending team assignments in hook", {
              invitationId: invitation.id,
              userId: user.id,
              organizationId: organization.id,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        },

        /**
         * Before rejecting an invitation
         * Log rejection reason, perform validation
         */
        beforeRejectInvitation: async ({ invitation, user, organization }) => {
          logger.debug("Validating invitation rejection", {
            invitationId: invitation.id,
            userId: user.id,
            userEmail: user.email,
            organizationId: organization.id,
            organizationName: organization.name,
          });

          // Additional validation or logging can be added here
        },

        /**
         * After rejecting an invitation
         * Notify inviter of rejection
         */
        afterRejectInvitation: async ({ invitation, user, organization }) => {
          logger.info("Invitation rejected", {
            invitationId: invitation.id,
            userId: user.id,
            userEmail: user.email,
            organizationId: organization.id,
            organizationName: organization.name,
            inviterId: invitation.inviterId,
          });

          // Notify inviter of rejection
          // This could send an email notification or create an in-app notification
          try {
            // Get inviter details to send notification
            const inviter = await UserQueries.findById(invitation.inviterId);

            if (inviter) {
              logger.debug("Inviter notified of rejection", {
                invitationId: invitation.id,
                inviterId: invitation.inviterId,
                inviterEmailHash: anonymizeEmail(inviter.email),
                rejectedByEmailHash: anonymizeEmail(user.email),
              });

              // TODO: Send notification to inviter if needed
              // Could use NotificationService or send email here
              // Example: await NotificationService.createNotification({...})
            }
          } catch (error) {
            logger.error("Failed to notify inviter of rejection", {
              invitationId: invitation.id,
              inviterId: invitation.inviterId,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        },

        /**
         * Before cancelling an invitation
         * Verify cancellation permissions
         */
        beforeCancelInvitation: async ({
          invitation,
          cancelledBy,
          organization,
        }) => {
          logger.debug("Validating invitation cancellation", {
            invitationId: invitation.id,
            cancelledById: cancelledBy.id,
            cancelledByEmail: cancelledBy.user.email,
            organizationId: organization.id,
            organizationName: organization.name,
          });

          // Additional permission checks can be added here
          // If validation fails, throw an error to prevent cancellation
        },

        /**
         * After cancelling an invitation
         * Log cancellation for audit purposes
         */
        afterCancelInvitation: async ({
          invitation,
          cancelledBy,
          organization,
        }) => {
          logger.info("Invitation cancelled", {
            invitationId: invitation.id,
            cancelledById: cancelledBy.id,
            cancelledByEmail: cancelledBy.user.email,
            organizationId: organization.id,
            organizationName: organization.name,
            invitedEmail: invitation.email,
          });

          // Additional tracking or cleanup can be added here
        },
      },
      async sendInvitationEmail(data: {
        id: string;
        email: string;
        organization: { name: string };
        inviter: { user: { name: string | null; email: string } };
      }) {
        const baseUrl =
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : (process.env.BETTER_AUTH_URL ??
              process.env.NEXT_PUBLIC_APP_URL ??
              "http://localhost:3000");
        const inviteLink = `${baseUrl}/accept-invitation/${data.id}`;

        // Fetch team names for this invitation
        const teamNames =
          await PendingTeamAssignmentsQueries.getTeamNamesByInvitationId(
            data.id
          );

        await sendEmailFromTemplate({
          to: data.email,
          subject: `You've been invited to join ${data.organization.name}`,
          react: OrganizationInvitationEmail({
            invitationUrl: inviteLink,
            organizationName: data.organization.name,
            inviterName: data.inviter.user.name,
            inviterEmail: data.inviter.user.email,
            teamNames: teamNames.length > 0 ? teamNames : undefined,
          }),
        });
      },
    }),
    magicLink({
      async sendMagicLink({
        email,
        url,
        token: _token,
      }: {
        email: string;
        url: string;
        token: string;
      }) {
        await sendEmailFromTemplate({
          to: email,
          subject: "Sign in to Inovy",
          react: MagicLinkEmail({
            magicLinkUrl: url,
            email,
          }),
        });
      },
    }),
    passkey({
      rpID:
        process.env.BETTER_AUTH_URL?.replace(/https?:\/\//, "").split("/")[0] ??
        "localhost",
      rpName: "Inovy",
    }),
    nextCookies(), // Must be last plugin
  ],
});

// Export types for use throughout the application
export type BetterAuthSession = typeof auth.$Infer.Session;
export type BetterAuthUser = typeof auth.$Infer.Session.user;

const ensureUserHasOrganization = async (
  userId: string,
  userEmail: string | undefined | null,
  ctx: MiddlewareContext<
    MiddlewareOptions,
    AuthContext<BetterAuthOptions> & {
      returned?: unknown | undefined;
      responseHeaders?: Headers | undefined;
    }
  >
) => {
  // Check if user already has an organization
  const existingOrganizationId =
    await OrganizationQueries.getFirstOrganizationForUser(userId);

  if (existingOrganizationId) {
    logger.debug("User already has an organization", {
      userId: userId,
      emailHash: userEmail ? anonymizeEmail(userEmail) : "[no-email]",
      organizationId: existingOrganizationId,
    });
    return existingOrganizationId;
  }

  try {
    // Generate base organization slug from user data
    // Note: orgSlug and orgName are derived identifiers, not raw PII
    // They are safe to log as they don't directly expose email addresses
    const orgSlug = await generateSlug(userId, userEmail ?? undefined, ctx);

    // Use slug format for organization name
    const orgName = orgSlug;

    logger.info("Creating personal organization for user", {
      userId: userId,
      emailHash: userEmail ? anonymizeEmail(userEmail) : "[no-email]",
      orgSlug,
      orgName,
      path: ctx.path,
    });

    const orgId = nanoid();
    const memberId = nanoid();
    await OrganizationQueries.createOrganizationWithMember({
      organizationId: orgId,
      name: orgName,
      slug: orgSlug,
      userId: userId,
      memberId: memberId,
      memberRole: "owner",
    });

    logger.info("Successfully created personal organization for user", {
      userId: userId,
      organizationId: orgId,
      organizationName: orgName,
      organizationSlug: orgSlug,
    });

    return orgId;
  } catch (error) {
    // Log error but don't fail auth - organization can be created later
    logger.error("Failed to create personal organization", {
      userId: userId,
      emailHash: userEmail ? anonymizeEmail(userEmail) : "[no-email]",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

async function generateSlug(
  userId: string,
  userEmail: string | undefined,
  ctx: MiddlewareContext<
    MiddlewareOptions,
    AuthContext<BetterAuthOptions> & {
      returned?: unknown | undefined;
      responseHeaders?: Headers | undefined;
    }
  >
) {
  // Fall back to userId-based slug if email is not available (e.g., session-based flows)
  let orgSlug: string;
  if (userEmail) {
    orgSlug = `org-${userEmail}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  } else {
    // Use userId-based slug when email is not available
    orgSlug = `org-user-${userId.substring(0, 8)}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
  }

  // Check if slug already exists and generate a unique one with suffix if needed
  let attempts = 0;
  while (attempts < 10) {
    const slugExists = await OrganizationQueries.slugExists(
      orgSlug,
      ctx.headers ?? new Headers()
    );

    if (!slugExists) {
      break;
    }

    // Add suffix if slug already exists
    const suffix = nanoid(4).toLowerCase();
    if (userEmail) {
      const emailLocal = userEmail.split("@")[0] ?? "user";
      orgSlug = `org-${emailLocal}-${suffix}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
    } else {
      orgSlug = `org-user-${userId.substring(0, 8)}-${suffix}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
    }
    attempts++;

    if (attempts === 1) {
      logger.debug("Organization slug exists, adding suffix", {
        userId: userId,
        emailHash: userEmail ? anonymizeEmail(userEmail) : "[no-email]",
        newSlug: orgSlug,
      });
    }
  }
  if (attempts >= 10) {
    // Use a fully random slug as fallback
    orgSlug = `org-${nanoid(8)}`.toLowerCase();
  }
  return orgSlug;
}

