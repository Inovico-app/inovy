#!/usr/bin/env tsx

/**
 * Diagnostic script to check if a user has a credential account record
 * Run with: pnpm tsx scripts/check-user-account.ts <email>
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { eq } from "drizzle-orm";
import { db } from "../src/server/db";
import { accounts, users } from "../src/server/db/schema/auth";

const email = process.argv[2];

if (!email) {
  console.error("Usage: pnpm tsx scripts/check-user-account.ts <email>");
  process.exit(1);
}

async function checkUserAccount() {
  try {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log(`❌ User with email ${email} not found in users table`);
      process.exit(1);
    }

    console.log(`✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${user.emailVerified}`);

    // Check for accounts
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, user.id));

    console.log(`\n📋 Accounts found: ${userAccounts.length}`);

    if (userAccounts.length === 0) {
      console.log(`❌ No account records found for this user!`);
      console.log(
        `\nThis is the issue - Better Auth requires an account record`
      );
      console.log(
        `with provider_id = "credential" for email/password authentication.`
      );
      console.log(
        `\nSolution: Use password reset to create the account record.`
      );
      process.exit(1);
    }

    userAccounts.forEach((account, index) => {
      console.log(`\n   Account ${index + 1}:`);
      console.log(`   - ID: ${account.id}`);
      console.log(`   - Provider ID: ${account.providerId}`);
      console.log(`   - Account ID: ${account.accountId}`);
      console.log(`   - Has Password: ${account.password ? "Yes" : "No"}`);
    });

    const credentialAccount = userAccounts.find(
      (acc) => acc.providerId === "credential"
    );

    if (!credentialAccount) {
      console.log(`\n❌ No credential account found!`);
      console.log(
        `\nBetter Auth requires an account with provider_id = "credential"`
      );
      console.log(`for email/password authentication.`);
      console.log(
        `\nSolution: Use password reset to create the credential account.`
      );
      process.exit(1);
    }

    if (!credentialAccount.password) {
      console.log(`\n⚠️  Credential account exists but has no password!`);
      console.log(`\nSolution: Use password reset to set a password.`);
      process.exit(1);
    }

    console.log(`\n✅ Credential account found and has a password!`);
    console.log(`\nThe user should be able to sign in.`);
  } catch (error) {
    console.error("Error checking user account:", error);
    process.exit(1);
  }
}

checkUserAccount();

