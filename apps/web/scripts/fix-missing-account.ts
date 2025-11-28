#!/usr/bin/env tsx

/**
 * Script to fix missing credential account for a user
 * This creates the account record and optionally triggers password reset
 * Run with: pnpm tsx scripts/fix-missing-account.ts <email> [--send-reset]
 *
 * Options:
 *   --send-reset: Also send a password reset email to the user
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import { db } from "../src/server/db";
import { accounts, users } from "../src/server/db/schema/auth";

const args = process.argv.slice(2);
const email = args.find((arg) => !arg.startsWith("--"));
const shouldSendReset = args.includes("--send-reset");

if (!email) {
  console.error(
    "Usage: pnpm tsx scripts/fix-missing-account.ts <email> [--send-reset]"
  );
  process.exit(1);
}

// TypeScript type guard: email is guaranteed to be string after the check above
const emailAddress: string = email;

async function fixMissingAccount() {
  try {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, emailAddress))
      .limit(1);

    if (!user) {
      console.log(
        `❌ User with email ${emailAddress} not found in users table`
      );
      process.exit(1);
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);

    // Check for credential account
    const [credentialAccount] = await db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential"))
      )
      .limit(1);

    if (credentialAccount) {
      console.log(`✅ Credential account already exists!`);
      console.log(`   Account ID: ${credentialAccount.id}`);
      if (credentialAccount.password) {
        console.log(`   Password: Set`);
        console.log(`\n✅ User should be able to sign in!`);
      } else {
        console.log(`   Password: Not set`);
        console.log(`\n💡 Use password reset to set a password.`);
        if (shouldSendReset) {
          await sendPasswordReset(emailAddress);
        }
      }
      return;
    }

    console.log(`\n⚠️  No credential account found. Creating one...`);

    // Create credential account record
    // Better Auth uses "credential" as provider_id for email/password
    const accountId = randomUUID();
    const accountRecord = {
      id: accountId,
      accountId: user.id, // For credential accounts, accountId equals userId
      providerId: "credential",
      userId: user.id,
      password: null, // Will be set when user resets password
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(accounts).values(accountRecord);

    console.log(`✅ Credential account created!`);
    console.log(`   Account ID: ${accountId}`);
    console.log(`\n⚠️  Note: The account has no password yet.`);
    console.log(`   The user needs to use password reset to set a password.`);

    if (shouldSendReset) {
      await sendPasswordReset(emailAddress);
    } else {
      console.log(`\n💡 To send a password reset email, run:`);
      console.log(
        `   pnpm tsx scripts/fix-missing-account.ts ${emailAddress} --send-reset`
      );
    }
  } catch (error) {
    console.error("Error fixing account:", error);
    process.exit(1);
  }
}

async function sendPasswordReset(email: string) {
  try {
    console.log(`\n📧 Sending password reset email...`);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.BETTER_AUTH_URL ||
      "http://localhost:3000";

    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${baseUrl}/reset-password`,
      },
      headers: new Headers(),
    });

    console.log(`✅ Password reset email sent to ${email}`);
    console.log(`   The user can click the link to set a new password.`);
  } catch (error) {
    console.error(`⚠️  Failed to send password reset email:`, error);
    console.log(`   You can manually trigger password reset from the UI.`);
  }
}

fixMissingAccount();

