import { db } from "@/server/db";
import * as schema from "@/server/db/schema/auth";
import { passkey } from "@better-auth/passkey";
import { stripe } from "@better-auth/stripe";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { magicLink, organization } from "better-auth/plugins";
import Stripe from "stripe";
import { sendEmailFromTemplate } from "./email";
import { VerificationEmail } from "./email-templates/verification-email";
import { PasswordResetEmail } from "./email-templates/password-reset-email";
import { MagicLinkEmail } from "./email-templates/magic-link-email";
import { OrganizationInvitationEmail } from "./email-templates/organization-invitation-email";

// Initialize Stripe client
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-11-17.clover",
});

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
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
      passkey: schema.passkey,
      magicLink: schema.magicLink,
      customer: schema.customer,
      subscription: schema.subscription,
    },
  }),
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
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
      async sendInvitationEmail(data: {
        id: string;
        email: string;
        organization: { name: string };
        inviter: { user: { name: string | null; email: string } };
      }) {
        const inviteLink = `${
          process.env.BETTER_AUTH_URL ??
          process.env.NEXT_PUBLIC_APP_URL ??
          "http://localhost:3000"
        }/accept-invitation/${data.id}`;
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
        process.env.BETTER_AUTH_URL?.replace(/https?:\/\//, "").split("/")[0] ||
        "localhost",
      rpName: "Inovy",
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "pro",
            priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
          },
          {
            name: "enterprise",
            priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
          },
        ],
      },
      async authorizeReference({
        referenceId,
        user,
      }: {
        referenceId: string;
        user: { id: string };
      }) {
        // For Enterprise org subscriptions, verify user is org admin
        // For Pro user subscriptions, verify referenceId matches userId
        // TODO: Implement authorization logic (Phase 4: INO-235)
        return true;
      },
    }),
    nextCookies(), // Must be last plugin
  ],
});

// Export types for use throughout the application
export type BetterAuthSession = typeof betterAuthInstance.$Infer.Session;
export type BetterAuthUser = typeof betterAuthInstance.$Infer.Session.user;

