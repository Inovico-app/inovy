import { db } from "@/server/db";
import * as schema from "@/server/db/schema/auth";
import { passkey } from "@better-auth/passkey";
import { stripe } from "@better-auth/stripe";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { magicLink, organization } from "better-auth/plugins";
import Stripe from "stripe";

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
      // TODO: Implement email sending via Resend (Phase 6: INO-237)
      console.log("Verification email:", { email: user.email, url, token });
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
      // TODO: Implement email sending via Resend (Phase 6: INO-237)
      console.log("Reset password email:", { email: user.email, url, token });
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
        // TODO: Implement email sending via Resend (Phase 6: INO-237)
        const inviteLink = `${
          process.env.BETTER_AUTH_URL ??
          process.env.NEXT_PUBLIC_APP_URL ??
          "http://localhost:3000"
        }/accept-invitation/${data.id}`;
        console.log("Organization invitation email:", {
          email: data.email,
          inviteLink,
          organization: data.organization.name,
          inviter: data.inviter.user.name,
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
        // TODO: Implement email sending via Resend (Phase 6: INO-237)
        console.log("Magic link email:", { email, url, token });
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

