"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Route } from "next";
import { publicActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { betterAuthInstance } from "@/lib/better-auth";
import { signUpEmailSchema } from "../validation/auth.schema";

/**
 * Sign up with email and password
 */
export const signUpEmailAction = publicActionClient
  .inputSchema(signUpEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email, password, name } = parsedInput;

    try {
      const result = await betterAuthInstance.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
        headers: await headers(),
      });

      // If sign-up is successful, redirect to sign-in page
      // Better Auth will send verification email automatically
      redirect("/sign-in" as Route);
    } catch (error) {
      // Better Auth throws APIError for validation/authentication errors
      const message =
        error instanceof Error ? error.message : "Failed to create account";
      throw ActionErrors.validation(message, { email });
    }
  });

