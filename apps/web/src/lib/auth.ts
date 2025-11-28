import { sendEmailFromTemplate } from "@/features/email/client";
import { logger } from "@/lib/logger";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema/auth";
import { passkey } from "@better-auth/passkey";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { magicLink, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { MagicLinkEmail } from "../features/email/templates/magic-link-email";
import { OrganizationInvitationEmail } from "../features/email/templates/organization-invitation-email";
import { PasswordResetEmail } from "../features/email/templates/password-reset-email";
import { VerificationEmail } from "../features/email/templates/verification-email";
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
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendVerificationEmail({
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
        subject: "Verify your email address",
        react: VerificationEmail({
          verificationUrl: url,
          userName: user.name,
        }),
      });
    },
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
      strategy: "jwe",
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    freshAge: 60 * 10, // 10 minutes
  },

  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Automatically set active organization if user has organizations
          // and no active organization is set
          if (!session.activeOrganizationId && session.userId) {
            const organizationId =
              await OrganizationQueries.getFirstOrganizationForUser(
                session.userId
              );

            if (organizationId) {
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
          }

          return { data: session };
        },
      },
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Create a personal organization for new users after sign-up
      // Handle email sign-up, social sign-up, and magic link sign-up
      const isSignUpPath =
        ctx.path === "/sign-up/email" ||
        ctx.path.startsWith("/sign-up/sso") ||
        ctx.path.includes("/sign-up/magic-link");

      // Handle sign-in paths (email/password, magic link, etc.)
      const isSignInPath =
        ctx.path === "/sign-in/email" ||
        ctx.path.startsWith("/sign-in/sso") ||
        ctx.path.includes("/sign-in/magic-link") ||
        ctx.path === "/sign-in/passkey";

      const user = (ctx.context.returned as { user: BetterAuthUser })?.user;

      // Set active organization for existing users on sign-in if not set
      if (isSignInPath && user && !isSignUpPath) {
        try {
          const sessionResult = await auth.api.getSession({
            headers: ctx.headers ?? new Headers(),
          });

          // Only set active organization if session doesn't have one
          if (
            sessionResult?.session &&
            !sessionResult.session.activeOrganizationId
          ) {
            const organizationId =
              await OrganizationQueries.getFirstOrganizationForUser(user.id);

            if (organizationId) {
              // Update session directly in database to set active organization
              await db
                .update(schema.sessions)
                .set({ activeOrganizationId: organizationId })
                .where(eq(schema.sessions.userId, user.id));

              logger.info("Set active organization on sign-in", {
                userId: user.id,
                organizationId,
              });
            }
          }
        } catch (error) {
          // Log error but don't fail sign-in
          logger.error("Failed to set active organization on sign-in", {
            userId: user.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (isSignUpPath && user) {
        // Check if user already has an organization
        const existingMembers = await OrganizationQueries.getMembers(user.id);

        if (existingMembers.length > 0) {
          logger.info("User already has an organization, skipping creation", {
            userId: user.id,
            email: user.email,
          });
          return;
        }

        try {
          // Generate base organization slug from user data
          const emailLocal = (user.email ?? "user").split("@")[0] ?? "user";
          let orgSlug = `org-${emailLocal}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-");

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
            orgSlug = `org-${emailLocal}-${suffix}`
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "-");
            attempts++;

            if (attempts === 1) {
              logger.info("Organization slug exists, adding suffix", {
                userId: user.id,
                email: user.email,
                newSlug: orgSlug,
              });
            }
          }

          // Use slug format for organization name
          const orgName = orgSlug;

          logger.info("Creating personal organization for new user", {
            userId: user.id,
            email: user.email,
            orgSlug,
            orgName,
            signUpPath: ctx.path,
          });

          // Create organization directly in the database
          const orgId = nanoid();
          const now = new Date();

          await db.insert(schema.organizations).values({
            id: orgId,
            name: orgName,
            slug: orgSlug,
            createdAt: now,
          });

          // Create member record with owner role
          const memberId = nanoid();
          await db.insert(schema.members).values({
            id: memberId,
            organizationId: orgId,
            userId: user.id,
            role: "owner",
            createdAt: now,
          });

          logger.info(
            "Successfully created personal organization for new user",
            {
              userId: user.id,
              organizationId: orgId,
              organizationName: orgName,
              organizationSlug: orgSlug,
            }
          );
        } catch (error) {
          // Log error but don't fail sign-up - organization can be created later
          logger.error(
            "Failed to create personal organization during sign-up",
            {
              userId: user.id,
              email: user.email,
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }
      }
    }),
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
        await sendEmailFromTemplate({
          to: data.email,
          subject: `You've been invited to join ${data.organization.name}`,
          react: OrganizationInvitationEmail({
            invitationUrl: inviteLink,
            organizationName: data.organization.name,
            inviterName: data.inviter.user.name,
            inviterEmail: data.inviter.user.email,
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

