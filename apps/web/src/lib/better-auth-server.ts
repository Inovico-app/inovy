import { sendEmailFromTemplate } from "@/emails/client";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema/auth";
import { passkey } from "@better-auth/passkey";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { customSession, magicLink, organization } from "better-auth/plugins";
import MagicLinkEmail from "@/emails/templates/magic-link-email";
import OrganizationInvitationEmail from "@/emails/templates/organization-invitation-email";
import PasswordResetEmail from "@/emails/templates/password-reset-email";
import VerificationEmail from "@/emails/templates/verification-email";
import { ac, roleMapping, roles, type RoleName } from "./auth/access-control";

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
export const betterAuthInstance = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      organization: schema.organizations,
      member: schema.members,
      invitation: schema.invitations,
      passkey: schema.passkeys,
      magicLink: schema.magicLinks,
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
      token,
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
      token,
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
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    freshAge: 60 * 10, // 10 minutes
  },

  plugins: [
    organization({
      // Access control configuration
      ac,
      roles: {
        // Map Better Auth organization roles to application roles
        owner: roleMapping.owner,
        admin: roleMapping.admin,
        member: roleMapping.member,
        // Also include application-specific roles
        superadmin: roles.superadmin,
        manager: roles.manager,
        user: roles.user,
        viewer: roles.viewer,
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
        token,
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
    customSession(async ({ user, session }, ctx) => {
      if (!user) {
        return {
          user,
          session,
        };
      }

      // Get active member to determine roles
      // Use headers from context if available, otherwise create empty headers
      const headers = ctx.headers ?? new Headers();
      const activeMember = await betterAuthInstance.api
        .getActiveMember({
          headers,
        })
        .catch(() => null);

      // Map Better Auth member role to application roles
      const roles: RoleName[] = [];
      if (
        activeMember &&
        typeof activeMember === "object" &&
        "role" in activeMember
      ) {
        const memberRole = (activeMember.role as string)?.toLowerCase();
        if (memberRole === "owner" || memberRole === "admin") {
          roles.push("admin");
        } else if (memberRole === "manager") {
          roles.push("manager");
        } else if (memberRole === "member") {
          roles.push("user");
        } else {
          // Default role for unrecognized roles
          roles.push("user");
        }
      } else {
        // No active member - assign default role for authenticated users
        roles.push("user");
      }

      return {
        roles: roles.length > 0 ? roles : ["user"],
        user: {
          ...user,
        },
        session,
      };
    }),
    nextCookies(), // Must be last plugin
  ],
});

// Export types for use throughout the application
export type BetterAuthSession = typeof betterAuthInstance.$Infer.Session;
export type BetterAuthUser = typeof betterAuthInstance.$Infer.Session.user;

// Export for Better Auth CLI compatibility
// The CLI expects either a default export or an export named "auth"
export const auth = betterAuthInstance;
export default betterAuthInstance;

